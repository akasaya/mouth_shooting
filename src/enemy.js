// 敵: 自機へ突進、一部は射撃、ボスは大型・弾幕。被弾処理もここに置く。
import { CONFIG } from './config.js';
import { circlesOverlap } from './collision.js';
import { spawnBurst } from './particles.js';
import { neonPoly, neonCircle } from './draw.js';

let nextId = 1;

const PALETTE = ['#ff6ec7', '#ffd166', '#8a5cff', '#5cffb1', '#ff8c42'];

// 画面端の外側のランダムな位置を返す（突進の出発点）。
function edgeSpawn(w, h) {
  const m = 40;
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * w, y: -m };
  if (side === 1) return { x: Math.random() * w, y: h + m };
  if (side === 2) return { x: -m, y: Math.random() * h };
  return { x: w + m, y: Math.random() * h };
}

export function spawnEnemy(game, { speed, hp = 1, shooter = false, fireChance = 0 }) {
  const pos = edgeSpawn(game.width, game.height);
  game.enemies.push({
    id: nextId++,
    x: pos.x, y: pos.y,
    r: CONFIG.enemy.baseRadius,
    hp, maxHp: hp,
    speed,
    sides: shooter ? 6 : 5,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    rot: Math.random() * Math.PI,
    shooter,
    fireChance,
    fireCooldownMs: 700 + Math.random() * 900,
    nextFireAt: game.time + 800 + Math.random() * 1200,
    isBoss: false,
    alive: true,
  });
}

export function spawnBoss(game, { hp, speed }) {
  game.enemies.push({
    id: nextId++,
    x: game.width / 2,
    y: -80,
    r: 52,
    hp, maxHp: hp,
    speed,
    sides: 8,
    color: '#ff3860',
    rot: 0,
    shooter: true,
    fireChance: 1,
    fireCooldownMs: 1300,
    nextFireAt: game.time + 1200,
    isBoss: true,
    alive: true,
  });
}

export function updateEnemies(game, dtSec) {
  const p = game.player;
  for (const e of game.enemies) {
    if (!e.alive || e.hp <= 0) continue;
    e.rot += dtSec * 1.2;

    // 突進: 自機方向へ移動。ボスは画面上部で左右に揺れつつゆっくり寄る。
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    if (e.isBoss) {
      e.x += Math.cos(game.time / 600) * 60 * dtSec;
      e.y += Math.sin(ang) * e.speed * 0.3 * dtSec;
      if (e.y < 90) e.y += e.speed * 0.5 * dtSec;
    } else {
      e.x += Math.cos(ang) * e.speed * dtSec;
      e.y += Math.sin(ang) * e.speed * dtSec;
    }

    // 射撃
    if (e.shooter && game.time >= e.nextFireAt) {
      fireAtPlayer(game, e);
      e.nextFireAt = game.time + e.fireCooldownMs;
    }

    // 自機との接触
    if (circlesOverlap(e.x, e.y, e.r, p.x, p.y, CONFIG.player.radius)) {
      hitPlayer(game);
      if (!e.isBoss) {
        e.hp = 0; // 雑魚は自爆して消える
        e.alive = false;
        spawnBurst(game.particles, e.x, e.y, 12, e.color);
      }
    }
  }
  // 死亡（hp<=0 / alive=false）した敵を除去。
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    if (e.hp <= 0 || !e.alive) game.enemies.splice(i, 1);
  }
}

function fireAtPlayer(game, e) {
  const p = game.player;
  const baseAng = Math.atan2(p.y - e.y, p.x - e.x);
  const sp = CONFIG.enemy.bulletSpeed;
  const shots = e.isBoss ? 5 : 1;
  const spread = e.isBoss ? 0.5 : 0;
  for (let i = 0; i < shots; i++) {
    const a = baseAng + (i - (shots - 1) / 2) * spread;
    game.enemyBullets.push({
      x: e.x, y: e.y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      r: CONFIG.enemy.bulletRadius,
      alive: true,
    });
  }
  game.audio.sfxEnemyShot();
}

// 自機被弾。無敵中は無視。ライフ減・コンボ消失・GAME OVER 判定。
export function hitPlayer(game) {
  const p = game.player;
  if (game.time < p.invulnUntil) return;
  p.lives -= 1;
  p.invulnUntil = game.time + CONFIG.player.invulnMs;
  game.combo.count = 0; // 被弾でコンボ消失（リスク）
  spawnBurst(game.particles, p.x, p.y, 24, '#ff4060');
  game.audio.sfxHit();
  if (p.lives <= 0) {
    game.onGameOver();
  }
}

export function drawEnemies(ctx, game) {
  for (const e of game.enemies) {
    if (e.hp <= 0) continue;
    neonPoly(ctx, e.x, e.y, e.r, e.sides, e.rot, e.color, e.isBoss ? 30 : 16);
    if (e.isBoss) {
      // ボスの HP バー
      const w = 110, frac = Math.max(0, e.hp / e.maxHp);
      ctx.save();
      ctx.fillStyle = 'rgba(255,56,96,0.25)';
      ctx.fillRect(e.x - w / 2, e.y - e.r - 16, w, 6);
      ctx.fillStyle = '#ff3860';
      ctx.fillRect(e.x - w / 2, e.y - e.r - 16, w * frac, 6);
      ctx.restore();
    } else {
      neonCircle(ctx, e.x, e.y, 2.5, e.color, 8, true);
    }
  }
}
