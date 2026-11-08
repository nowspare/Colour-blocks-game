// Level mode targets — first 10 explicit, then procedurally scaled
export const LEVELS = [
  { id: 1,  target: 500,   time: 0 },
  { id: 2,  target: 1200,  time: 0 },
  { id: 3,  target: 2000,  time: 0 },
  { id: 4,  target: 3200,  time: 0 },
  { id: 5,  target: 4500,  time: 0 },
  { id: 6,  target: 6000,  time: 0 },
  { id: 7,  target: 8000,  time: 0 },
  { id: 8,  target: 10500, time: 0 },
  { id: 9,  target: 13000, time: 0 },
  { id: 10, target: 16000, time: 0 }
];

export function levelFor(n) {
  if (n <= 0) n = 1;
  if (n <= LEVELS.length) return LEVELS[n - 1];
  const last = LEVELS[LEVELS.length - 1];
  const extra = n - LEVELS.length;
  return { id: n, target: last.target + extra * 5000, time: 0 };
}
