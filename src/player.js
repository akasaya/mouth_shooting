// 自機: カーソル追従と、左クリック連射（最寄り敵へオートエイム）。
import { CONFIG } from './config.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2, // 向き（描画用）
    lives: CONFIG.player.maxLives,
    invulnUntil: 0,      // この時刻まで無敵
    nextFireAt: 0,       // 次に撃てる時刻
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
}

// 連射処理。溜め中は撃てない（ボムの準備に専念）。
export function updateShooting(game) {
  const p = game.player;
  if (!game.input.left || game.bomb.charging || game.bomb.active) return;
  if (game.time < p.nextFireAt) return;

  const target = nearestEnemy(game, p.x, p.y);
  let ang;
  if (target) {
    ang = Math.atan2(target.y - p.y, target.x - p.x);
  } else {
    ang = -Math.PI / 2; // 敵がいなければ上方向
  }
  fire(game, p.x, p.y, ang);
  game.player.nextFireAt = game.time + CONFIG.shot.fireIntervalMs;
  game.audio.sfxShot();
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
