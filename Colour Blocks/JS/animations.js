// Particle bursts, score pops, screen shake
import { COLORS_CSS } from './blocks.js';

function getLayer() {
  return document.getElementById('particles');
}

export function burst(x, y, color, count = 8, spread = 60) {
  const host = getLayer();
  if (!host) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.background = color || COLORS_CSS.cyan;
    p.style.width = (6 + Math.random() * 8) + 'px';
    p.style.height = p.style.width;
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = spread * (0.4 + Math.random());
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const anim = p.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`, opacity: 0 }
      ],
      { duration: 480 + Math.random() * 260, easing: 'cubic-bezier(.22,.61,.36,1)' }
    );
    host.appendChild(p);
    anim.onfinish = () => p.remove();
  }
}

export function popScore(x, y, text) {
  const host = getLayer();
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'score-pop';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  host.appendChild(el);
  const anim = el.animate(
    [
      { transform: 'translate(-50%,-50%) scale(0.6)', opacity: 0 },
      { transform: 'translate(-50%,-80%) scale(1.15)', opacity: 1, offset: 0.22 },
      { transform: 'translate(-50%,-140%) scale(1)', opacity: 0 }
    ],
    { duration: 900, easing: 'ease-out' }
  );
  anim.onfinish = () => el.remove();
}

export function shake(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 320);
}

export function flashCell(cellEl, color) {
  if (!cellEl) return;
  const rect = cellEl.getBoundingClientRect();
  burst(rect.left + rect.width / 2, rect.top + rect.height / 2, color, 6, 34);
}
