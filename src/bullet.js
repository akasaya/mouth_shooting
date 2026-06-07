// 自機弾・敵弾の更新と当たり判定、描画。
import { CONFIG } from './config.js';
import { circlesOverlap, isOutside } from './collision.js';
import { comboScoreMultiplier } from './combo.js';
import { spawnBurst } from './particles.js';
import { fillDot as dot } from './draw.js';
import { hitPlayer } from './enemy.js';

export function updateBullets(game, dtSec) {
  const w = game.width;
  const h = game.height;

  // --- 自機弾 ---
  for (const b of game.bullets) {
    if (!b.alive) continue;
    b.x += b.vx * dtSec;
    b.y += b.vy * dtSec;
    if (isOutside(b.x, b.y, w, h)) {
      b.alive = false;
      continue;
    }
    for (const e of game.enemies) {
      if (!e.alive) continue;
      if (circlesOverlap(b.x, b.y, b.r, e.x, e.y, e.r)) {
        b.alive = false;
        e.hp -= 1;
        spawnBurst(game.particles, b.x, b.y, 4, e.color);
        if (e.hp <= 0) {
          e.alive = false;
          onShotKill(game, e);
        }
        break;
      }
    }
  }

  // --- 敵弾 ---
  for (const b of game.enemyBullets) {
    if (!b.alive) continue;
    b.x += b.vx * dtSec;
    b.y += b.vy * dtSec;
    if (isOutside(b.x, b.y, w, h)) {
      b.alive = false;
      continue;
    }
    const p = game.player;
    if (circlesOverlap(b.x, b.y, b.r, p.x, p.y, CONFIG.player.radius)) {
      b.alive = false;
      hitPlayer(game);
    }
  }

  cull(game.bullets);
  cull(game.enemyBullets);
}

function onShotKill(game, e) {
  const mult = comboScoreMultiplier(game.combo.count, CONFIG.combo.scorePer);
  game.score += CONFIG.shot.score * mult;
  game.combo.count += 1;
  game.combo.lastKillTime = game.time;
  spawnBurst(game.particles, e.x, e.y, 10, e.color);
  game.audio.sfxExplosion();
}

function cull(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (!arr[i].alive) arr.splice(i, 1);
  }
}

export function drawBullets(ctx, game) {
  for (const b of game.bullets) dot(ctx, b.x, b.y, b.r, '#aef9ff', 10);
  for (const b of game.enemyBullets) dot(ctx, b.x, b.y, b.r, '#ff5a8a', 10);
}
