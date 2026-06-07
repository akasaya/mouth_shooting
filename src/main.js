// エントリ: ゲーム状態・ループ・状態機械・各システムの結線。
import { CONFIG } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createPlayer, updatePlayer, updateShooting } from './player.js';
import { createBomb, updateBomb, chargeToRadius } from './bomb.js';
import { updateBullets, drawBullets } from './bullet.js';
import { updateEnemies, drawEnemies } from './enemy.js';
import { createDirector, startDirector, updateDirector } from './stage.js';
import { updateParticles, drawParticles } from './particles.js';
import { applyComboDecay, musicLayerLevel } from './combo.js';
import { neonTriangle, neonRing } from './draw.js';
import { drawHud, drawOverlay } from './hud.js';

const HS_KEY = 'mouth_shooting.highscore';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  width: window.innerWidth,
  height: window.innerHeight,
  time: 0,                 // ms（performance.now ベース）
  state: 'title',          // 'title' | 'playing' | 'gameover'
  score: 0,
  highScore: loadHighScore(),
  bullets: [],
  enemyBullets: [],
  enemies: [],
  particles: [],
  combo: { count: 0, lastKillTime: 0 },
  banner: null,
  clearAt: 0,
  input: null,
  audio: null,
  player: null,
  bomb: createBomb(),
  director: createDirector(),
  onGameOver: () => endGame('gameover'),
};

game.input = createInput(canvas);
game.audio = createAudio();
game.player = createPlayer(game.width / 2, game.height / 2);

function loadHighScore() {
  const raw = Number(localStorage.getItem(HS_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function saveHighScore(v) {
  try { localStorage.setItem(HS_KEY, String(Math.floor(v))); } catch { /* 保存不可でも続行 */ }
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  game.width = window.innerWidth;
  game.height = window.innerHeight;
  canvas.width = Math.floor(game.width * dpr);
  canvas.height = Math.floor(game.height * dpr);
  canvas.style.width = game.width + 'px';
  canvas.style.height = game.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// --- 状態遷移 ---
function startGame() {
  game.score = 0;
  game.bullets.length = 0;
  game.enemyBullets.length = 0;
  game.enemies.length = 0;
  game.particles.length = 0;
  game.combo.count = 0;
  game.combo.lastKillTime = game.time;
  game.banner = null;
  game.player = createPlayer(game.input.x, game.input.y);
  game.bomb = createBomb();
  game.director = createDirector();
  startDirector(game);
  game.state = 'playing';
  game.audio.resume();
  game.audio.startMusic();
}

function endGame(state) {
  game.state = state;
  game.audio.stopMusic();
  game.audio.setMusicLevel(0);
  if (game.score > game.highScore) {
    game.highScore = game.score;
    saveHighScore(game.highScore);
  }
}

// タイトル/ゲームオーバー画面でのクリックで開始/リスタート。
canvas.addEventListener('mousedown', () => {
  game.audio.resume();
  if (game.state !== 'playing') startGame();
});

// --- 更新 ---
function update(dtSec) {
  if (game.state !== 'playing') return;

  updatePlayer(game, dtSec);
  updateShooting(game);
  updateBomb(game, dtSec);
  updateEnemies(game, dtSec);
  updateBullets(game, dtSec);
  updateDirector(game, dtSec);
  updateParticles(game.particles, dtSec);

  // コンボ減衰と音楽レイヤー。
  game.combo.count = applyComboDecay(
    game.combo.count,
    game.time - game.combo.lastKillTime,
    CONFIG.combo.decayMs,
  );
  game.audio.setMusicLevel(musicLayerLevel(game.combo.count, CONFIG.combo.musicThresholds));
}

// --- 描画 ---
function render() {
  // 半透明クリアで残光（ネオンの軌跡）を出す。
  ctx.fillStyle = 'rgba(4,6,14,0.32)';
  ctx.fillRect(0, 0, game.width, game.height);

  drawParticles(ctx, game.particles);
  drawBullets(ctx, game);
  drawEnemies(ctx, game);
  drawBomb();
  drawPlayer();

  if (game.state === 'playing') {
    drawHud(ctx, game);
  } else {
    drawHud(ctx, game);
    drawOverlay(ctx, game);
  }
}

function drawPlayer() {
  const p = game.player;
  if (game.state !== 'playing' && game.state !== 'gameover') return;
  // 無敵中は点滅。
  const blink = game.time < p.invulnUntil && Math.floor(game.time / 80) % 2 === 0;
  if (blink) return;
  neonTriangle(ctx, p.x, p.y, CONFIG.player.radius, p.angle, '#39f6ff', 18);
}

function drawBomb() {
  const b = game.bomb;
  const p = game.player;
  // チャージ中: 到達予定半径を薄く予告。
  if (b.charging && b.charge > 0) {
    const pr = chargeToRadius(b.charge, CONFIG.bomb.minRadius, CONFIG.bomb.maxRadius);
    neonRing(ctx, p.x, p.y, pr, 2, '#39f6ff', 0.2 + b.charge * 0.2);
  }
  // 発動中: 拡大する衝撃波。
  if (b.active) {
    const alpha = Math.max(0, 1 - b.radius / Math.max(1, b.targetRadius));
    neonRing(ctx, p.x, p.y, b.radius, CONFIG.bomb.ringWidth, '#aef9ff', 0.4 + alpha * 0.6);
  }
}

// --- メインループ ---
let last = performance.now();
function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05; // タブ復帰などの巨大 dt を抑制
  game.time = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// デバッグ/動作確認用にゲーム状態を露出（本番でも無害）。
window.__game = game;
