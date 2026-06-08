// 自機: カーソル追従と、左クリック連射（最寄り敵へオートエイム）。
import { CONFIG } from './config.js';
import { wayAngles } from './item.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2, // 向き（描画用）
    lives: CONFIG.player.maxLives,
    invulnUntil: 0,      // この時刻まで無敵
    nextFireAt: 0,       // 次に撃てる時刻
    // --- バフ（被弾で失う。シールドは1回肩代わり）---
    wayLevel: 0,         // ショットの Way 強化段（弾数 = 1 + 2*wayLevel）
    shield: false,       // 被弾を1回無効化
    options: 0,          // 僚機の数
    optionPhase: 0,      // 僚機の周回位相
  };
}

// カーソルへ滑らかに追従。ボム溜め中は減速。
export function updatePlayer(game, dtSec) {
  const p = game.player;
  const cfg = CONFIG.player;
  const slow = game.bomb.charging ? CONFIG.bomb.moveSlow : 1;
  // フレームレート非依存の指数補間。
  const k = 1 - Math.pow(1 - cfg.followLerp * slow, dtSec * 60);
  const nx = p.x + (game.input.x - p.x) * k;
  const ny = p.y + (game.input.y - p.y) * k;
  const dx = nx - p.x;
  const dy = ny - p.y;
  if (Math.abs(dx) + Math.abs(dy) > 0.5) p.angle = Math.atan2(dy, dx);
  p.x = nx;
  p.y = ny;
  p.optionPhase += cfg.optionSpinRate * dtSec; // 僚機を周回させる
}

// 僚機（オプション）の現在位置。自機の周りを等間隔で周回する。
export function optionPositions(game) {
  const p = game.player;
  const cfg = CONFIG.player;
  const out = [];
  for (let i = 0; i < p.options; i++) {
    const a = p.optionPhase + (i / p.options) * Math.PI * 2;
    out.push({ x: p.x + Math.cos(a) * cfg.optionOrbitRadius, y: p.y + Math.sin(a) * cfg.optionOrbitRadius });
  }
  return out;
}

// 連射処理。溜め中は撃てない（ボムの準備に専念）。
export function updateShooting(game) {
  const p = game.player;
  if (!game.input.left || game.bomb.charging || game.bomb.active) return;
  if (game.time < p.nextFireAt) return;

  // 自機: Way 段数ぶんを扇状に発射。
  const baseAng = aimAngle(game, p.x, p.y);
  const wayCount = 1 + 2 * p.wayLevel;
  const spread = (CONFIG.player.waySpreadDeg * Math.PI) / 180;
  for (const off of wayAngles(wayCount, spread)) fire(game, p.x, p.y, baseAng + off);

  // 僚機: それぞれの位置から最寄り敵へ1発ずつ。
  for (const o of optionPositions(game)) fire(game, o.x, o.y, aimAngle(game, o.x, o.y));

  game.player.nextFireAt = game.time + CONFIG.shot.fireIntervalMs;
  game.audio.sfxShot();
}

// 指定座標から最寄り敵への角度（敵がいなければ上方向）。
function aimAngle(game, x, y) {
  const t = nearestEnemy(game, x, y);
  return t ? Math.atan2(t.y - y, t.x - x) : -Math.PI / 2;
}

function fire(game, x, y, ang) {
  const sp = CONFIG.shot.bulletSpeed;
  game.bullets.push({
    x, y,
    vx: Math.cos(ang) * sp,
    vy: Math.sin(ang) * sp,
    r: CONFIG.shot.bulletRadius,
    alive: true,
  });
}

export function nearestEnemy(game, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}
