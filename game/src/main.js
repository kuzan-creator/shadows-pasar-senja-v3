// Shadows of Pasar Senja — bootstrap: loop, screen transitions, shot + self-test modes.
import { VIEW } from './config.js';
import { newGame, loadLevel, updateGame, logEvent } from './engine.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { runSelfTests } from './selftest.js';
import { ensureAudio, sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const game = newGame();
const input = createInput(canvas);

window.addEventListener('error', (e) => {
  const pre = document.getElementById('selftest');
  if (pre && pre.style.display !== 'none') pre.textContent += '\nJSERROR ' + e.message;
});

function startLevel(index) {
  loadLevel(game, index);
  game.screen = 'play';
  game.log = [];
  logEvent(game, 'Heist ' + (index + 1) + ' — stay unseen.');
}

function titleClick(x, y) {
  // The three heist cards on the title screen.
  for (let i = 0; i < 3; i++) {
    const cx = VIEW.w / 2 - 480 + i * 330;
    if (x >= cx && x <= cx + 300 && y >= 500 && y <= 630) {
      game.selectedLevel = i;
      startLevel(i);
      return true;
    }
  }
  return false;
}

input.onKey = (code) => {
  ensureAudio();
  if (code === 'Enter') {
    if (game.screen === 'title') startLevel(game.selectedLevel);
    else if (game.screen === 'levelclear') startLevel(game.levelIndex + 1);
    else if (game.screen === 'victory') { game.money = 0; game.ghost = true; game.stats = { spotted: 0, coinsThrown: 0, loot: 0, treasures: 0 }; game.screen = 'title'; }
    else if (game.screen === 'caught') game.screen = 'title';
  }
  if (code === 'KeyR' && (game.screen === 'play' || game.screen === 'caught')) {
    startLevel(game.levelIndex);
  }
  if (game.screen === 'title') {
    if (code === 'ArrowLeft' || code === 'KeyA') game.selectedLevel = (game.selectedLevel + 2) % 3;
    if (code === 'ArrowRight' || code === 'KeyD') game.selectedLevel = (game.selectedLevel + 1) % 3;
  }
};

input.onClick = (x, y) => {
  ensureAudio();
  if (game.screen === 'title') titleClick(x, y);
};

let prevMoney = 0;
let prevScreen = 'title';
let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.shot) updateGame(game, input, dt);
  if (game.screen === 'caught' && prevScreen !== 'caught') sfx.caught();
  if (game.money > prevMoney) {
    if (game.screen === 'play') sfx.treasure();
    prevMoney = game.money;
  }
  if (game.state && game.state.alertBubble && game.detection >= 100) sfx.alarm();
  prevScreen = game.screen;
  render(ctx, game);
  requestAnimationFrame(frame);
}

if (params.get('selftest') === '1') {
  // Deterministic checks, no animation loop: results land in the DOM for headless runs.
  const result = runSelfTests(ctx);
  const pre = document.getElementById('selftest');
  pre.style.display = 'block';
  pre.textContent = 'SELFTEST ' + result.passed + '/' + result.total + '\n' + result.lines.join('\n');
  document.title = 'SELFTEST ' + result.passed + '/' + result.total;
} else if (params.get('shot')) {
  stageShot(game, params.get('shot'));
  render(ctx, game);
  requestAnimationFrame(frame);
} else {
  game.screen = 'title';
  render(ctx, game);
  requestAnimationFrame(frame);
}
