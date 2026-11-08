// Shape library and colour identifiers
export const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];

export const COLORS_CSS = {
  red:    '#ef4444',
  blue:   '#3b82f6',
  green:  '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  pink:   '#ec4899',
  cyan:   '#06b6d4'
};

// Each shape is a 2D 0/1 matrix. Weight biases the generator.
export const SHAPES = [
  // 1x1
  { cells: [[1]], weight: 2 },
  // domino
  { cells: [[1,1]], weight: 6 },
  { cells: [[1],[1]], weight: 6 },
  // 1x3 / 3x1
  { cells: [[1,1,1]], weight: 5 },
  { cells: [[1],[1],[1]], weight: 5 },
  // 1x4 / 4x1
  { cells: [[1,1,1,1]], weight: 3 },
  { cells: [[1],[1],[1],[1]], weight: 3 },
  // 1x5 / 5x1
  { cells: [[1,1,1,1,1]], weight: 1 },
  { cells: [[1],[1],[1],[1],[1]], weight: 1 },
  // squares
  { cells: [[1,1],[1,1]], weight: 4 },
  { cells: [[1,1,1],[1,1,1]], weight: 1 },
  { cells: [[1,1],[1,1],[1,1]], weight: 1 },
  { cells: [[1,1,1],[1,1,1],[1,1,1]], weight: 1 },
  // small L (4 rotations)
  { cells: [[1,0],[1,1]], weight: 4 },
  { cells: [[0,1],[1,1]], weight: 4 },
  { cells: [[1,1],[1,0]], weight: 4 },
  { cells: [[1,1],[0,1]], weight: 4 },
  // big L 5-cells (4 rotations)
  { cells: [[1,0,0],[1,0,0],[1,1,1]], weight: 2 },
  { cells: [[0,0,1],[0,0,1],[1,1,1]], weight: 2 },
  { cells: [[1,1,1],[1,0,0],[1,0,0]], weight: 2 },
  { cells: [[1,1,1],[0,0,1],[0,0,1]], weight: 2 },
  // T (4 rotations)
  { cells: [[1,1,1],[0,1,0]], weight: 3 },
  { cells: [[0,1,0],[1,1,1]], weight: 3 },
  { cells: [[1,0],[1,1],[1,0]], weight: 3 },
  { cells: [[0,1],[1,1],[0,1]], weight: 3 },
  // S / Z (4 rotations)
  { cells: [[0,1,1],[1,1,0]], weight: 2 },
  { cells: [[1,1,0],[0,1,1]], weight: 2 },
  { cells: [[1,0],[1,1],[0,1]], weight: 2 },
  { cells: [[0,1],[1,1],[1,0]], weight: 2 }
];

// Count how many cells a shape occupies
export function shapeSize(shape) {
  let n = 0;
  for (const row of shape) for (const v of row) if (v) n++;
  return n;
}
