// Web Audio synthesised SFX — zero asset dependency
let ctx = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function tone({ freq = 440, dur = 0.12, type = 'sine', gain = 0.1, when = 0, slideTo = null }) {
  const ac = ensureCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sound = {
  enabled: true,
  setEnabled(v) { this.enabled = !!v; },
  unlock() { ensureCtx(); },
  click() {
    if (!this.enabled) return;
    tone({ freq: 680, type: 'square', dur: 0.03, gain: 0.035 });
  },
  pickup() {
    if (!this.enabled) return;
    tone({ freq: 520, type: 'sine', dur: 0.06, gain: 0.06 });
  },
  place() {
    if (!this.enabled) return;
    tone({ freq: 300, type: 'triangle', dur: 0.09, gain: 0.09, slideTo: 200 });
  },
  clear(combo = 1) {
    if (!this.enabled) return;
    const base = 420 + (Math.min(combo, 6) - 1) * 110;
    for (let i = 0; i < 3; i++) {
      tone({ freq: base * (1 + i * 0.5), dur: 0.16, type: 'sine', gain: 0.085, when: i * 0.055 });
    }
  },
  gameover() {
    if (!this.enabled) return;
    [660, 550, 440, 330].forEach((f, i) => tone({ freq: f, dur: 0.24, type: 'sine', gain: 0.09, when: i * 0.14 }));
  },
  levelup() {
    if (!this.enabled) return;
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'triangle', gain: 0.09, when: i * 0.09 }));
  }
};
