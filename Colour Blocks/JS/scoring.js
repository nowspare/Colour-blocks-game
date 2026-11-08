// Scoring rules

const LINE_POINTS = [0, 100, 260, 520, 900, 1400, 2000, 2700, 3500, 4500];

export const scoring = {
  pointsForPlacement(cellCount) {
    return cellCount * 5;
  },

  pointsForLines(lineCount, combo) {
    const base = LINE_POINTS[Math.min(lineCount, LINE_POINTS.length - 1)] || (lineCount * 500);
    return base * Math.max(1, combo);
  },

  comboLabel(combo) {
    if (combo <= 1) return '';
    if (combo === 2) return 'COMBO ×2';
    if (combo === 3) return 'COMBO ×3';
    if (combo === 4) return 'COMBO ×4';
    return 'COMBO ×' + combo;
  }
};
