// The game controller — modes, drag-and-drop, placement, scoring, lifecycle
import { Board } from './board.js';
import { COLORS_CSS } from './blocks.js';
import {
  canPlace, fitsAnywhere, generatePlayableSet,
  setRng, resetRng, mulberry32, dailySeed
} from './block-generator.js';
import { scoring } from './scoring.js';
import { levelFor } from './levels.js';
import { sound } from './sound.js';
import { storage } from './storage.js';
import { settings } from './settings.js';
import * as anim from './animations.js';
import * as ui from './ui.js';

const BOARD_SIZE = 8;
const TRAY_GAP = 3;
const BOARD_GAP = 3;
const BOMBS_BY_MODE = { classic: 3, endless: 0, time: 1, level: 1, daily: 1 };
const TIME_LIMIT = 120;

export class Game {
  constructor({ mode = 'classic' } = {}) {
    this.mode = mode;
    this.boardEl = document.getElementById('board');
    this.trayEl = document.getElementById('tray');
    this.dragLayer = document.getElementById('drag-layer');
    this.slotEls = Array.from(this.trayEl.querySelectorAll('.tray-slot'));

    this.board = new Board(this.boardEl, BOARD_SIZE);
    this.tray = [null, null, null];
    this.trayCellPx = 20;   // computed on layout
    this.boardStride = 0;
    this.boardCellPx = 0;

    this.score = 0;
    this.best = 0;
    this.comboStreak = 0;
    this.bombsLeft = BOMBS_BY_MODE[mode] ?? 1;
    this.level = 1;
    this.levelStartScore = 0;

    this.status = 'idle'; // idle | playing | paused | over
    this.timerId = null;
    this.timeLeft = 0;

    this.drag = null;
    this.animating = false;

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onVisibility = this.onVisibility.bind(this);

    this._attach();
  }

  /* ---------- lifecycle ---------- */

  start() {
    this.status = 'playing';
    this.score = 0;
    this.comboStreak = 0;
    this.bombsLeft = BOMBS_BY_MODE[this.mode] ?? 1;
    this.level = 1;
    this.levelStartScore = 0;
    this.timeLeft = this.mode === 'time' ? TIME_LIMIT : 0;

    if (this.mode === 'daily') {
      setRng(mulberry32(dailySeed()));
    } else {
      resetRng();
    }

    const bestKey = 'best:' + this.mode;
    this.best = storage.get(bestKey, 0) || 0;

    this.board.reset();
    this.tray = [null, null, null];
    this.refillTray(true);
    this.updateHud();
    ui.setScore(0);
    ui.setBest(this.best);
    ui.setBombCount(this.bombsLeft);
    this.updateModeStat();

    if (this.mode === 'time') {
      this.startTimer();
    }

    // small delay so drag works only after layout
    requestAnimationFrame(() => {
      this.measure();
      this.renderTray();
    });
  }

  pause() {
    if (this.status !== 'playing') return;
    this.status = 'paused';
    if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
    ui.showOverlay('pause');
  }

  resume() {
    if (this.status !== 'paused') return;
    this.status = 'playing';
    ui.hideOverlay('pause');
    if (this.mode === 'time' && this.timeLeft > 0) this.startTimer();
    this.measure();
    this.renderTray();
  }

  restart() {
    this.destroyDrag();
    if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
    this.status = 'idle';
    this.start();
  }

  endGame() {
    if (this.status === 'over') return;
    this.status = 'over';
    if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
    sound.gameover();

    const bestKey = 'best:' + this.mode;
    if (this.score > this.best) {
      this.best = this.score;
      storage.set(bestKey, this.best);
    }

    // statistics
    const stats = storage.get('stats', { games: 0, totalScore: 0, clearedLines: 0, bestCombo: 0 });
    stats.games += 1;
    stats.totalScore += this.score;
    stats.clearedLines += (this.clearedLines || 0);
    stats.bestCombo = Math.max(stats.bestCombo || 0, this.maxCombo || 0);
    storage.set('stats', stats);

    const goScore = document.getElementById('go-score');
    const goBest = document.getElementById('go-best');
    if (goScore) goScore.textContent = String(this.score);
    if (goBest) goBest.textContent = String(this.best);

    ui.setBest(this.best);
    ui.showOverlay('gameover');
  }

  destroy() {
    this.destroyDrag();
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
    this._detach();
  }

  /* ---------- timer ---------- */

  startTimer() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      if (this.status !== 'playing') return;
      this.timeLeft = Math.max(0, this.timeLeft - 1);
      this.updateModeStat();
      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  /* ---------- tray ---------- */

  refillTray(initial = false) {
    const grid = this.board.grid;
    const set = this.mode === 'endless'
      ? generatePlayableSet(grid, 3)
      : generatePlayableSet(grid, 3);
    this.tray = set;
    if (!initial) {
      // small entrance animation flag
      this.newTraySet = true;
    }
  }

  useBomb() {
    if (this.status !== 'playing') return;
    if (this.mode === 'endless') {
      // free, unlimited in endless
    } else {
      if (this.bombsLeft <= 0) return;
      this.bombsLeft -= 1;
      ui.setBombCount(this.bombsLeft);
    }
    sound.click();
    this.tray = [null, null, null];
    this.refillTray();
    this.renderTray(true);
  }

  measure() {
    const rect = this.boardEl.getBoundingClientRect();
    const computed = getComputedStyle(this.boardEl);
    const padL = parseFloat(computed.paddingLeft) || 0;
    const padR = parseFloat(computed.paddingRight) || 0;
    const gap = parseFloat(computed.gap) || BOARD_GAP;
    const usable = rect.width - padL - padR - gap * (BOARD_SIZE - 1);
    this.boardCellPx = Math.max(8, usable / BOARD_SIZE);
    this.boardStride = this.boardCellPx + gap;

    // tray cell size — about 55% of board, clamped
    const trayRect = this.trayEl.getBoundingClientRect();
    const slotW = trayRect.width / 3;
    // max block footprint: up to 5 cells wide. We want slot to fit 5 cells.
    const proposed = Math.floor((slotW - 12) / 5);
    this.trayCellPx = Math.max(10, Math.min(proposed, Math.floor(this.boardCellPx * 0.62)));
  }

  renderTray(entrance = false) {
    for (let i = 0; i < 3; i++) {
      const slot = this.slotEls[i];
      if (!slot) continue;
      slot.innerHTML = '';
      const block = this.tray[i];
      if (!block) continue;
      const el = ui.buildBlockEl(block, this.trayCellPx, TRAY_GAP);
      if (entrance) {
        el.animate(
          [
            { transform: 'translateY(12px) scale(0.7)', opacity: 0 },
            { transform: 'translateY(0) scale(1)', opacity: 1 }
          ],
          { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)', delay: i * 40 }
        );
      }
      slot.appendChild(el);
    }
  }

  /* ---------- drag ---------- */

  onPointerDown(e) {
    if (this.status !== 'playing' || this.animating) return;
    const blockCell = e.target.closest('.block-cell');
    if (!blockCell) return;
    const blockEl = blockCell.closest('.block');
    if (!blockEl) return;
    const slotEl = blockEl.closest('.tray-slot');
    if (!slotEl) return;
    const slot = parseInt(slotEl.dataset.slot, 10);
    if (!Number.isFinite(slot)) return;
    const block = this.tray[slot];
    if (!block) return;

    e.preventDefault();
    sound.unlock();
    this.beginDrag(slot, block, blockEl, e);
  }

  beginDrag(slot, block, blockEl, e) {
    const boardRect = this.boardEl.getBoundingClientRect();
    const cellPx = this.boardCellPx;
    const stride = this.boardStride;

    const clone = ui.buildBlockEl(block, cellPx, BOARD_GAP);
    clone.classList.add('dragging');
    clone.style.position = 'absolute';
    this.dragLayer.appendChild(clone);

    const bw = block.cells[0].length;
    const bh = block.cells.length;

    const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
    const lift = isTouch ? stride * 0.9 : 0;

    this.drag = {
      slot,
      block,
      clone,
      blockEl,
      boardRect,
      cellPx,
      stride,
      offsetX: (bw * stride - BOARD_GAP) / 2,
      offsetY: (bh * stride - BOARD_GAP) / 2 + lift,
      lift,
      clientX: e.clientX,
      clientY: e.clientY,
      cloneX: 0,
      cloneY: 0,
      target: null
    };

    blockEl.classList.add('lifting');
    sound.pickup();

    this.moveDragTo(e.clientX, e.clientY);

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  moveDragTo(clientX, clientY) {
    const d = this.drag;
    if (!d) return;
    const x = clientX - d.offsetX;
    const y = clientY - d.offsetY;
    d.cloneX = x;
    d.cloneY = y;
    d.clone.style.transform = `translate(${x}px, ${y}px)`;
    this.updatePreview();
  }

  updatePreview() {
    const d = this.drag;
    if (!d) return;
    // refresh board rect each move (layout stable but scroll safe)
    const br = this.boardEl.getBoundingClientRect();
    d.boardRect = br;

    const localX = d.cloneX - br.left;
    const localY = d.cloneY - br.top;

    const col = Math.round(localX / d.stride);
    const row = Math.round(localY / d.stride);

    const { block } = d;
    const bh = block.cells.length;
    const bw = block.cells[0].length;

    // must fully fit
    let valid = row >= 0 && col >= 0 && row + bh <= BOARD_SIZE && col + bw <= BOARD_SIZE;
    if (valid) {
      valid = canPlace(block, this.board.grid, row, col);
    }

    // clear previous preview
    this.clearPreviewClasses();

    if (row + bh <= 0 || col + bw <= 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) {
      d.target = null;
      return;
    }

    // render preview cells (only those in bounds)
    for (let r = 0; r < bh; r++) {
      for (let c = 0; c < bw; c++) {
        if (!block.cells[r][c]) continue;
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || cc < 0 || rr >= BOARD_SIZE || cc >= BOARD_SIZE) continue;
        const cell = this.board.cellEls[rr][cc];
        if (!cell) continue;
        cell.classList.add(valid ? 'preview-valid' : 'preview-invalid');
        cell.classList.add('c-' + block.color);
      }
    }

    d.target = valid ? { row, col } : null;
  }

  clearPreviewClasses() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = this.board.cellEls[r][c];
        if (!cell) continue;
        cell.classList.remove('preview-valid', 'preview-invalid');
        // restore actual state class
        const v = this.board.grid[r][c];
        cell.className = v ? `cell filled c-${v}` : 'cell';
      }
    }
  }

  onPointerMove(e) {
    if (!this.drag) return;
    e.preventDefault();
    this.moveDragTo(e.clientX, e.clientY);
  }

  onPointerUp(e) {
    if (!this.drag) return;
    const d = this.drag;
    const target = d.target;

    if (target) {
      this.commitPlacement(d.slot, d.block, target.row, target.col);
    } else {
      // bounce back
      const { clone } = d;
      clone.animate(
        [
          { transform: clone.style.transform, opacity: 1 },
          { transform: clone.style.transform, opacity: 0 }
        ],
        { duration: 160, easing: 'ease-out' }
      );
    }

    this.endDrag();
  }

  endDrag() {
    if (!this.drag) return;
    const d = this.drag;
    if (d.clone && d.clone.parentNode) d.clone.parentNode.removeChild(d.clone);
    if (d.blockEl) d.blockEl.classList.remove('lifting');
    this.drag = null;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.clearPreviewClasses();
  }

  destroyDrag() {
    if (this.drag) this.endDrag();
  }

  /* ---------- placement ---------- */

  commitPlacement(slot, block, row, col) {
    if (this.status !== 'playing') return;

    const bh = block.cells.length;
    const bw = block.cells[0].length;

    // write to model
    const placedCells = [];
    for (let r = 0; r < bh; r++) {
      for (let c = 0; c < bw; c++) {
        if (!block.cells[r][c]) continue;
        this.board.grid[row + r][col + c] = block.color;
        placedCells.push({ r: row + r, c: col + c });
      }
    }

    // sync DOM
    this.board.render();
    for (const { r, c } of placedCells) {
      const el = this.board.cellEls[r][c];
      el.classList.add('just-placed');
      setTimeout(() => el.classList.remove('just-placed'), 300);
    }

    // clear this tray slot
    this.tray[slot] = null;
    const slotEl = this.slotEls[slot];
    if (slotEl) slotEl.innerHTML = '';

    // score: placement
    const placementPoints = scoring.pointsForPlacement(placedCells.length);
    this.score += placementPoints;
    ui.setScore(this.score);

    // sound
    sound.place();

    // check lines
    const { rows, cols } = this.board.findFullLines();
    const lineCount = rows.length + cols.length;

    if (lineCount > 0) {
      this.comboStreak += 1;
      const combo = this.comboStreak;
      this.maxCombo = Math.max(this.maxCombo || 0, combo);
      this.clearedLines = (this.clearedLines || 0) + lineCount;

      const cleared = this.board.clearLines(rows, cols);

      // animation + particles
      for (const { r, c, color } of cleared) {
        const el = this.board.cellEls[r][c];
        el.classList.add('clearing');
        const rect = el.getBoundingClientRect();
        anim.burst(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
          COLORS_CSS[color],
          6,
          44
        );
      }

      const bonus = scoring.pointsForLines(lineCount, combo);
      this.score += bonus;
      ui.setScore(this.score);
      ui.showComboPopup(lineCount, combo, bonus);
      sound.clear(combo);

      this.animating = true;
      const boardRect = this.boardEl.getBoundingClientRect();
      anim.popScore(
        boardRect.left + boardRect.width / 2,
        boardRect.top + boardRect.height / 2,
        '+' + (placementPoints + bonus)
      );

      setTimeout(() => {
        this.board.render();
        this.animating = false;
        this.afterPlacement();
      }, 350);
    } else {
      this.comboStreak = 0;
      this.afterPlacement();
    }

    // level-mode check
    if (this.mode === 'level') {
      const lvl = levelFor(this.level);
      if (this.score - this.levelStartScore >= lvl.target) {
        this.advanceLevel();
      }
    }

    this.updateModeStat();
    this.updateHud();
  }

  advanceLevel() {
    this.level += 1;
    this.levelStartScore = this.score;
    sound.levelup();
    const boardRect = this.boardEl.getBoundingClientRect();
    anim.popScore(
      boardRect.left + boardRect.width / 2,
      boardRect.top + boardRect.height * 0.35,
      'LEVEL ' + this.level
    );
    this.updateModeStat();
  }

  afterPlacement() {
    // refill tray if all used
    const allUsed = this.tray.every(b => !b);
    if (allUsed) {
      this.refillTray();
      this.renderTray(true);
    }

    // check for game over / endless rescue
    const anyMove = this.board.hasAnyMove(this.tray.filter(Boolean)) ||
                    this.tray.some(b => b && fitsAnywhere(b, this.board.grid));

    if (!anyMove) {
      if (this.mode === 'endless') {
        // endless rescue: clear a bottom row and continue
        const cleared = this.board.forceClearBottomRow();
        for (const { r, c, color } of cleared) {
          const el = this.board.cellEls[r][c];
          el.classList.add('clearing');
          const rect = el.getBoundingClientRect();
          anim.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, COLORS_CSS[color], 6, 44);
        }
        setTimeout(() => {
          this.board.render();
          this.refillTray();
          this.renderTray(true);
          this.afterPlacement();
        }, 350);
        return;
      }
      // other modes: game over
      this.endGame();
    }
  }

  /* ---------- HUD ---------- */

  updateHud() {
    ui.setScore(this.score);
    ui.setBest(this.best);
    ui.setBombCount(this.bombsLeft);
  }

  updateModeStat() {
    if (this.mode === 'classic') {
      ui.setModeStat('MODE', 'Classic');
    } else if (this.mode === 'endless') {
      ui.setModeStat('MODE', 'Endless');
    } else if (this.mode === 'time') {
      ui.setModeStat('TIME', String(this.timeLeft));
    } else if (this.mode === 'level') {
      const lvl = levelFor(this.level);
      const prog = Math.min(lvl.target, this.score - this.levelStartScore);
      ui.setModeStat(`LV ${this.level}`, `${prog}/${lvl.target}`);
    } else if (this.mode === 'daily') {
      const d = new Date().toISOString().slice(5, 10).replace('-', '/');
      ui.setModeStat('DAILY', d);
    }
  }

  /* ---------- event wiring ---------- */

  _attach() {
    this.trayEl.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  _detach() {
    this.trayEl.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  onResize() {
    if (this.status === 'idle') return;
    this.measure();
    this.renderTray();
    this.updateModeStat();
  }

  onVisibility() {
    if (document.hidden && this.status === 'playing') {
      this.pause();
    }
  }
}
