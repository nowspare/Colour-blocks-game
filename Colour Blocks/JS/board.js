// Grid model + DOM sync
import { COLORS_CSS } from './blocks.js';

export class Board {
  constructor(el, size = 8) {
    this.el = el;
    this.size = size;
    this.grid = this.emptyGrid();
    this.cellEls = [];
    this.build();
  }

  emptyGrid() {
    return Array.from({ length: this.size }, () => Array(this.size).fill(null));
  }

  build() {
    this.el.style.setProperty('--board-size', this.size);
    this.el.innerHTML = '';
    this.cellEls = [];
    const frag = document.createDocumentFragment();
    for (let r = 0; r < this.size; r++) {
      const row = [];
      for (let c = 0; c < this.size; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        frag.appendChild(cell);
        row.push(cell);
      }
      this.cellEls.push(row);
    }
    this.el.appendChild(frag);
  }

  reset() {
    this.grid = this.emptyGrid();
    this.render();
  }

  render() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const el = this.cellEls[r][c];
        const v = this.grid[r][c];
        el.className = v ? `cell filled c-${v}` : 'cell';
      }
    }
  }

  setCell(r, c, color) {
    this.grid[r][c] = color;
    const el = this.cellEls[r][c];
    el.className = color ? `cell filled c-${color}` : 'cell';
  }

  isFullRow(r) {
    for (let c = 0; c < this.size; c++) if (!this.grid[r][c]) return false;
    return true;
  }

  isFullCol(c) {
    for (let r = 0; r < this.size; r++) if (!this.grid[r][c]) return false;
    return true;
  }

  findFullLines() {
    const rows = [];
    const cols = [];
    for (let r = 0; r < this.size; r++) if (this.isFullRow(r)) rows.push(r);
    for (let c = 0; c < this.size; c++) if (this.isFullCol(c)) cols.push(c);
    return { rows, cols };
  }

  clearLines(rows, cols) {
    const cleared = [];
    const seen = new Set();
    const push = (r, c) => {
      const k = r + ',' + c;
      if (seen.has(k)) return;
      seen.add(k);
      if (this.grid[r][c]) {
        cleared.push({ r, c, color: this.grid[r][c] });
        this.grid[r][c] = null;
      }
    };
    for (const r of rows) for (let c = 0; c < this.size; c++) push(r, c);
    for (const c of cols) for (let r = 0; r < this.size; r++) push(r, c);
    return cleared;
  }

  cellRect(r, c) {
    return this.cellEls[r][c].getBoundingClientRect();
  }

  fits(block) {
    if (!block) return false;
    const bh = block.cells.length;
    const bw = block.cells[0].length;
    for (let r = 0; r <= this.size - bh; r++) {
      for (let c = 0; c <= this.size - bw; c++) {
        let ok = true;
        for (let br = 0; br < bh && ok; br++) {
          for (let bc = 0; bc < bw; bc++) {
            if (block.cells[br][bc] && this.grid[r + br][c + bc]) { ok = false; break; }
          }
        }
        if (ok) return true;
      }
    }
    return false;
  }

  hasAnyMove(blocks) {
    for (const b of blocks) if (b && this.fits(b)) return true;
    return false;
  }

  // Force-clear the bottom-most non-empty row — used by Endless mode rescue
  forceClearBottomRow() {
    for (let r = this.size - 1; r >= 0; r--) {
      let any = false;
      for (let c = 0; c < this.size; c++) if (this.grid[r][c]) { any = true; break; }
      if (any) {
        const cleared = [];
        for (let c = 0; c < this.size; c++) {
          if (this.grid[r][c]) cleared.push({ r, c, color: this.grid[r][c] });
          this.grid[r][c] = null;
        }
        return cleared;
      }
    }
    return [];
  }

  colorOf(r, c) {
    const v = this.grid[r][c];
    return v ? COLORS_CSS[v] : '#ffffff';
  }
}
