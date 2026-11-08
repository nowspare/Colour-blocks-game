// Screen management, score display, block element builder
import { COLORS_CSS } from './blocks.js';

const screenEls = {};

export function initUi() {
  ['splash', 'menu', 'game', 'gameover', 'pause', 'settings', 'stats'].forEach((id) => {
    screenEls[id] = document.getElementById(id);
  });
}

export function showScreen(name) {
  for (const [k, el] of Object.entries(screenEls)) {
    if (!el) continue;
    el.classList.toggle('active', k === name);
  }
}

export function showOverlay(name) {
  const el = screenEls[name];
  if (el) el.classList.add('active');
}

export function hideOverlay(name) {
  const el = screenEls[name];
  if (el) el.classList.remove('active');
}

export function isOverlayOpen(name) {
  const el = screenEls[name];
  return !!(el && el.classList.contains('active'));
}

export function setScore(n) {
  const el = document.getElementById('score');
  if (!el) return;
  el.textContent = String(n);
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

export function setBest(n) {
  const el = document.getElementById('best');
  if (el) el.textContent = String(n);
}

export function setModeStat(label, value) {
  const l = document.getElementById('mode-stat-label');
  const v = document.getElementById('mode-stat-value');
  if (l) l.textContent = label;
  if (v) v.textContent = value;
}

export function setBombCount(n) {
  const el = document.getElementById('bomb-count');
  if (el) el.textContent = String(n);
}

// Build a block element at a given per-cell pixel size (with gap stride)
export function buildBlockEl(block, cellPx, gap) {
  const el = document.createElement('div');
  el.className = 'block';
  el.dataset.blockId = block.id;
  const stride = cellPx + gap;
  const bh = block.cells.length;
  const bw = block.cells[0].length;
  el.style.width = (bw * stride - gap) + 'px';
  el.style.height = (bh * stride - gap) + 'px';
  for (let r = 0; r < bh; r++) {
    for (let c = 0; c < bw; c++) {
      if (!block.cells[r][c]) continue;
      const cell = document.createElement('div');
      cell.className = 'block-cell c-' + block.color;
      cell.dataset.color = COLORS_CSS[block.color];
      cell.style.left = (c * stride) + 'px';
      cell.style.top = (r * stride) + 'px';
      cell.style.width = cellPx + 'px';
      cell.style.height = cellPx + 'px';
      el.appendChild(cell);
    }
  }
  return el;
}

export function showComboPopup(lineCount, combo, bonus) {
  const el = document.getElementById('combo-popup');
  if (!el) return;
  const label = combo > 1 ? `COMBO ×${combo}` : (lineCount > 1 ? `${lineCount} LINES` : 'CLEAR');
  el.innerHTML = `<span class="combo-line">${label}</span><span class="combo-bonus">+${bonus}</span>`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}
