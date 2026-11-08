// Random + seeded block generation, fit-checking, daily seeding
import { SHAPES, COLORS } from './blocks.js';

let rng = Math.random;

export function setRng(fn) { rng = fn; }
export function resetRng() { rng = Math.random; }

function pickShape() {
  const total = SHAPES.reduce((s, sh) => s + sh.weight, 0);
  let r = rng() * total;
  for (const sh of SHAPES) {
    r -= sh.weight;
    if (r <= 0) return sh;
  }
  return SHAPES[SHAPES.length - 1];
}

let idCounter = 0;
function nextId() {
  idCounter = (idCounter + 1) % 1e9;
  return 'b' + idCounter + Math.floor(rng() * 1e6).toString(36);
}

export function randomBlock() {
  const shape = pickShape();
  const color = COLORS[Math.floor(rng() * COLORS.length)];
  return {
    id: nextId(),
    cells: shape.cells.map(row => row.slice()),
    color
  };
}

export function canPlace(block, grid, row, col) {
  if (!block) return false;
  const rows = grid.length;
  const cols = grid[0].length;
  const bh = block.cells.length;
  const bw = block.cells[0].length;
  if (row < 0 || col < 0 || row + bh > rows || col + bw > cols) return false;
  for (let r = 0; r < bh; r++) {
    for (let c = 0; c < bw; c++) {
      if (block.cells[r][c] && grid[row + r][col + c]) return false;
    }
  }
  return true;
}

export function fitsAnywhere(block, grid) {
  if (!block) return false;
  const rows = grid.length;
  const cols = grid[0].length;
  const bh = block.cells.length;
  const bw = block.cells[0].length;
  for (let r = 0; r <= rows - bh; r++) {
    for (let c = 0; c <= cols - bw; c++) {
      if (canPlace(block, grid, r, c)) return true;
    }
  }
  return false;
}

// Generate a set — biased to fit, but not guaranteed
export function generateSet(grid, count = 3, smartBias = 0.85) {
  const out = [];
  for (let i = 0; i < count; i++) {
    let candidate = randomBlock();
    let tries = 0;
    while (tries < 12 && !fitsAnywhere(candidate, grid) && rng() < smartBias) {
      candidate = randomBlock();
      tries++;
    }
    out.push(candidate);
  }
  return out;
}

// Guaranteed-fit set: at least one block fits, if possible
export function generatePlayableSet(grid, count = 3) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const set = generateSet(grid, count, 0.9);
    if (set.some(b => fitsAnywhere(b, grid))) return set;
  }
  return generateSet(grid, count, 0);
}

// Mulberry32 — deterministic RNG for daily seed
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dailySeed(dateObj = new Date()) {
  const s = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
  return parseInt(s, 10) ^ 0x5f3759df;
}
