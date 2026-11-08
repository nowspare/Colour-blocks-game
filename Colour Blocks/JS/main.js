
// App bootstrap — wires screens, settings, mode buttons, game lifecycle
import { settings } from './settings.js';
import { sound } from './sound.js';
import { storage } from './storage.js';
import * as ui from './ui.js';
import { Game } from './game.js';

/* ---------- init ---------- */

ui.initUi();

// apply persisted settings on boot
sound.setEnabled(settings.get('sound'));
document.documentElement.classList.toggle('no-gridlines', !settings.get('gridlines'));

// sync UI
const setSound = document.getElementById('set-sound');
const setHaptics = document.getElementById('set-haptics');
const setGrid = document.getElementById('set-gridlines');
if (setSound) setSound.checked = !!settings.get('sound');
if (setHaptics) setHaptics.checked = !!settings.get('haptics');
if (setGrid) setGrid.checked = !!settings.get('gridlines');

/* ---------- splash → menu ---------- */

setTimeout(() => {
  ui.showScreen('menu');
}, 1600);

/* ---------- game instance ---------- */

let game = null;

function launch(mode) {
  if (game) game.destroy();
  ui.showScreen('game');
  ui.hideOverlay('gameover');
  ui.hideOverlay('pause');
  game = new Game({ mode });
  game.start();
}

function backToMenu() {
  if (game) {
    game.destroy();
    game = null;
  }
  ui.hideOverlay('gameover');
  ui.hideOverlay('pause');
  ui.showScreen('menu');
}

/* ---------- mode buttons ---------- */

document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    sound.unlock();
    sound.click();
    launch(btn.dataset.mode);
  });
});

/* ---------- game footer ---------- */

document.getElementById('btn-restart')?.addEventListener('click', () => {
  sound.click();
  if (game) game.restart();
});

document.getElementById('btn-bomb')?.addEventListener('click', () => {
  if (game) game.useBomb();
});

document.getElementById('btn-mute')?.addEventListener('click', () => {
  const next = !sound.enabled;
  sound.setEnabled(next);
  settings.set('sound', next);
  if (setSound) setSound.checked = next;
  const btn = document.getElementById('btn-mute');
  if (btn) btn.textContent = next ? '🔊' : '🔇';
  sound.click();
});

document.getElementById('btn-pause')?.addEventListener('click', () => {
  sound.click();
  if (game) game.pause();
});

document.getElementById('btn-resume')?.addEventListener('click', () => {
  sound.click();
  if (game) game.resume();
});

document.getElementById('btn-pause-menu')?.addEventListener('click', () => {
  sound.click();
  backToMenu();
});

/* ---------- game over ---------- */

document.getElementById('btn-again')?.addEventListener('click', () => {
  sound.click();
  const mode = game ? game.mode : 'classic';
  launch(mode);
});

document.getElementById('btn-menu')?.addEventListener('click', () => {
  sound.click();
  backToMenu();
});

/* ---------- settings ---------- */

document.getElementById('btn-settings')?.addEventListener('click', () => {
  sound.click();
  ui.showOverlay('settings');
});
document.getElementById('btn-close-settings')?.addEventListener('click', () => {
  sound.click();
  ui.hideOverlay('settings');
});

setSound?.addEventListener('change', (e) => {
  sound.setEnabled(e.target.checked);
  settings.set('sound', e.target.checked);
  const btn = document.getElementById('btn-mute');
  if (btn) btn.textContent = e.target.checked ? '🔊' : '🔇';
});

setHaptics?.addEventListener('change', (e) => {
  settings.set('haptics', e.target.checked);
});

setGrid?.addEventListener('change', (e) => {
  settings.set('gridlines', e.target.checked);
  document.documentElement.classList.toggle('no-gridlines', !e.target.checked);
});

/* ---------- stats ---------- */

document.getElementById('btn-stats')?.addEventListener('click', () => {
  sound.click();
  renderStats();
  ui.showOverlay('stats');
});
document.getElementById('btn-close-stats')?.addEventListener('click', () => {
  sound.click();
  ui.hideOverlay('stats');
});

function renderStats() {
  const body = document.getElementById('stats-body');
  if (!body) return;
  const s = storage.get('stats', { games: 0, totalScore: 0, clearedLines: 0, bestCombo: 0 });
  const modes = ['classic', 'endless', 'time', 'level', 'daily'];
  const bests = modes.map(m => storage.get('best:' + m, 0) || 0);
  const topBest = Math.max(...bests, 0);
  const avg = s.games > 0 ? Math.round(s.totalScore / s.games) : 0;
  body.innerHTML = `
    <div class="stat-card"><span class="stat-label">Games</span><span class="stat-value">${s.games || 0}</span></div>
    <div class="stat-card"><span class="stat-label">Top Score</span><span class="stat-value">${topBest}</span></div>
    <div class="stat-card"><span class="stat-label">Average</span><span class="stat-value">${avg}</span></div>
    <div class="stat-card"><span class="stat-label">Lines Cleared</span><span class="stat-value">${s.clearedLines || 0}</span></div>
    <div class="stat-card"><span class="stat-label">Best Combo</span><span class="stat-value">×${s.bestCombo || 0}</span></div>
    <div class="stat-card"><span class="stat-label">Classic Best</span><span class="stat-value">${storage.get('best:classic', 0) || 0}</span></div>
  `;
}

/* ---------- keyboard ---------- */

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (ui.isOverlayOpen('settings')) ui.hideOverlay('settings');
    else if (ui.isOverlayOpen('stats')) ui.hideOverlay('stats');
    else if (ui.isOverlayOpen('pause') && game) game.resume();
    else if (game && game.status === 'playing') game.pause();
  }
});

/* ---------- prevent context menu on game surfaces ---------- */

document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.board, .tray')) e.preventDefault();
});

/* ---------- ensure clean state on unload ---------- */

window.addEventListener('pagehide', () => {
  if (game) {
    try { game.pause(); } catch { /* ignore */ }
  }
});