// 自機弾・敵弾の更新と当たり判定、描画。
import { CONFIG } from './config.js';
import { circlesOverlap, isOutside, withinGraze } from './collision.js';
import { comboScoreMultiplier } from './combo.js';
import { addEnergyToStock } from './bomb.js';
import { maybeDropItem } from './item.js';
import { spawnBurst } from './particles.js';
import { fillDot as dot } from './draw.js';
import { hitPlayer } from './enemy.js';

// コンボ→スコア倍率（急カーブ設定込み）。
function scoreMult(game) {
  return comboScoreMultiplier(game.combo.count, CONFIG.combo.scorePer, CONFIG.combo.scoreAccel, CONFIG.combo.scoreMultMax);
}

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
      continue;
    }
    // かすり: 当たり判定の外側まで近づくと、その弾1回だけスコア＋ボムゲージが増える。
    if (!b.grazed && withinGraze(p.x, p.y, CONFIG.player.radius, b.x, b.y, b.r, CONFIG.graze.margin)) {
      b.grazed = true;
      game.score += CONFIG.graze.score;
      const r = addEnergyToStock(game.bomb.energy, game.bomb.stock, CONFIG.graze.energy, CONFIG.bomb.energyMax, CONFIG.bomb.maxStock);
      game.bomb.energy = r.energy;
      game.bomb.stock = r.stock;
      spawnBurst(game.particles, b.x, b.y, 2, '#aef9ff');
      game.audio.sfxGraze();
    }
  }

  cull(game.bullets);
  cull(game.enemyBullets);
}

function onShotKill(game, e) {
  const cfg = CONFIG.bomb;
  game.combo.count += 1;
  game.combo.lastKillTime = game.time;
  game.score += CONFIG.shot.score * scoreMult(game);
  // ショット撃破でボムゲージが溜まる。満タンで +1 ストック・ゲージ0（コンボが高いほど回復ボーナス）。
  const refill = cfg.energyPerKill + Math.min(cfg.energyPerKill, cfg.energyComboBonus * game.combo.count);
  const r = addEnergyToStock(game.bomb.energy, game.bomb.stock, refill, cfg.energyMax, cfg.maxStock);
  game.bomb.energy = r.energy;
  game.bomb.stock = r.stock;
  maybeDropItem(game, e); // 硬い敵・ボスならバフをドロップ
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
  for (const b of game.enemyBullets) dot(ctx, b.x, b.y, b.r, b.color || '#ff5a8a', 10);
}
