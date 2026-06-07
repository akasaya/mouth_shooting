// 敵: タイプ別の移動と弾パターンを持つ。被弾処理もここに置く。
// タイプは TYPES 表で定義し、updateEnemies は e.move / e.fireKind で分岐する。
import { CONFIG } from './config.js';
import { circlesOverlap } from './collision.js';
import { spawnBurst } from './particles.js';
import { neonPoly, neonCircle } from './draw.js';

let nextId = 1;

// 敵タイプ表。形（多角形の辺数）・色・移動・弾の種類を定義する。
export const TYPES = {
  drifter: { sides: 5, color: '#5cffb1', move: 'chase',         fireKind: null,        fireEvery: 0 },
  weaver:  { sides: 6, color: '#ffd166', move: 'weave',         fireKind: 'aimed',     fireEvery: 1500 },
  charger: { sides: 3, color: '#ff8c42', move: 'charge',        fireKind: null,        fireEvery: 0 },
  turret:  { sides: 4, color: '#8a5cff', move: 'approach_slow', fireKind: 'aimedFast', fireEvery: 850 },
  spinner: { sides: 7, color: '#ff6ec7', move: 'orbit',         fireKind: 'radial',    fireEvery: 1500 },
  striker: { sides: 4, color: '#42d6ff', move: 'approach_slow', fireKind: 'spiral',    fireEvery: 230 },
};

function edgeSpawn(w, h) {
  const m = 40;
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * w, y: -m };
  if (side === 1) return { x: Math.random() * w, y: h + m };
  if (side === 2) return { x: -m, y: Math.random() * h };
  return { x: w + m, y: Math.random() * h };
}

export function spawnEnemy(game, { type = 'drifter', speed, hp = 1, power = 0 }) {
  const def = TYPES[type] || TYPES.drifter;
  const pos = edgeSpawn(game.width, game.height);
  game.enemies.push({
    id: nextId++,
    type,
    x: pos.x, y: pos.y,
    r: CONFIG.enemy.baseRadius,
    hp, maxHp: hp,
    speed,
    power,                 // 弾数・パターン強度（時間で増える）
    sides: def.sides,
    color: def.color,
    move: def.move,
    fireKind: def.fireKind,
    rot: Math.random() * Math.PI,
    phase: Math.random() * Math.PI * 2,  // weave/orbit の位相
    spiralAng: Math.random() * Math.PI * 2,
    nextDashAt: game.time + 600 + Math.random() * 1200, // charger
    dashUntil: 0,
    fireEvery: def.fireEvery,
    nextFireAt: game.time + 700 + Math.random() * 900,
    isBoss: false,
    alive: true,
  });
}

export function spawnBoss(game, { hp, speed, power = 0 }) {
  game.enemies.push({
    id: nextId++,
    type: 'boss',
    x: game.width / 2,
    y: -80,
    r: 52,
    hp, maxHp: hp,
    speed,
    power,
    sides: 8,
    color: '#ff3860',
    move: 'boss',
    fireKind: 'boss',
    rot: 0,
    phase: 0,
    spiralAng: 0,
    fireEvery: 1100,
    nextFireAt: game.time + 1000,
    fireCycle: 0,
    isBoss: true,
    alive: true,
  });
}

function onScreen(e, g) {
  return e.x >= 0 && e.x <= g.width && e.y >= 0 && e.y <= g.height;
}

export function updateEnemies(game, dtSec) {
  const p = game.player;
  for (const e of game.enemies) {
    if (!e.alive || e.hp <= 0) continue;
    e.rot += dtSec * 1.2;
    moveEnemy(e, game, dtSec, p);

    // 射撃（画面内に入ってから。画面外からの不意打ちを防ぐ）。
    if (e.fireKind && game.time >= e.nextFireAt && onScreen(e, game)) {
      fire(game, e);
      e.nextFireAt = game.time + fireInterval(e);
    }

    // 自機との接触
    if (circlesOverlap(e.x, e.y, e.r, p.x, p.y, CONFIG.player.radius)) {
      hitPlayer(game);
      if (!e.isBoss) {
        e.hp = 0;
        e.alive = false;
        spawnBurst(game.particles, e.x, e.y, 12, e.color);
      }
    }
  }
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    if (e.hp <= 0 || !e.alive) game.enemies.splice(i, 1);
  }
}

function moveEnemy(e, game, dt, p) {
  const ang = Math.atan2(p.y - e.y, p.x - e.x);
  switch (e.move) {
    case 'weave': {
      const perp = ang + Math.PI / 2;
      const sway = Math.sin(game.time / 300 + e.phase) * e.speed * 0.9;
      e.x += (Math.cos(ang) * e.speed + Math.cos(perp) * sway) * dt;
      e.y += (Math.sin(ang) * e.speed + Math.sin(perp) * sway) * dt;
      break;
    }
    case 'charge': {
      if (game.time >= e.nextDashAt) {
        e.dashUntil = game.time + 360;
        e.nextDashAt = game.time + 1700 + Math.random() * 1000;
      }
      const mul = game.time < e.dashUntil ? 3.2 : 0.5;
      e.x += Math.cos(ang) * e.speed * mul * dt;
      e.y += Math.sin(ang) * e.speed * mul * dt;
      break;
    }
    case 'approach_slow': {
      e.x += Math.cos(ang) * e.speed * 0.42 * dt;
      e.y += Math.sin(ang) * e.speed * 0.42 * dt;
      break;
    }
    case 'orbit': {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      const orbitR = 175;
      if (dist > orbitR + 12) {
        e.x += Math.cos(ang) * e.speed * dt;
        e.y += Math.sin(ang) * e.speed * dt;
      } else {
        const radial = Math.atan2(dy, dx);     // player→enemy 方向
        const tang = radial + Math.PI / 2;      // 接線方向
        const sp = e.speed * 1.1;
        e.x += Math.cos(tang) * sp * dt + (Math.cos(radial) * (orbitR - dist)) * dt;
        e.y += Math.sin(tang) * sp * dt + (Math.sin(radial) * (orbitR - dist)) * dt;
      }
      break;
    }
    case 'boss': {
      e.x += Math.cos(game.time / 600) * 60 * dt;
      if (e.y < 96) e.y += e.speed * 0.6 * dt;
      else e.y += Math.sin(game.time / 900) * 20 * dt;
      break;
    }
    default: { // chase
      e.x += Math.cos(ang) * e.speed * dt;
      e.y += Math.sin(ang) * e.speed * dt;
    }
  }
}

function fireInterval(e) {
  // power が高いほど少し速く撃つ（下限あり）。
  return Math.max(160, e.fireEvery - e.power * 60);
}

function fire(game, e) {
  const p = game.player;
  const angToP = Math.atan2(p.y - e.y, p.x - e.x);
  const base = CONFIG.enemy.bulletSpeed;
  switch (e.fireKind) {
    case 'aimed':
      shoot(game, e, angToP, base, 1);
      break;
    case 'aimedFast':
      shoot(game, e, angToP, base * 1.5, 1);
      break;
    case 'radial': {
      const count = 8 + e.power * 2;
      const off = e.rot * 0.5;
      for (let i = 0; i < count; i++) shoot(game, e, off + (i / count) * Math.PI * 2, base * 0.8, 1);
      break;
    }
    case 'spiral': {
      const count = 3;
      for (let i = 0; i < count; i++) shoot(game, e, e.spiralAng + (i / count) * Math.PI * 2, base * 0.85, 1);
      e.spiralAng += 0.55;
      break;
    }
    case 'boss': {
      // fan と radial を交互に出す。
      e.fireCycle = (e.fireCycle + 1) % 2;
      if (e.fireCycle === 0) {
        const shots = 3 + e.power;
        const spread = 0.32;
        for (let i = 0; i < shots; i++) shoot(game, e, angToP + (i - (shots - 1) / 2) * spread, base, 1.2);
      } else {
        const count = 12 + e.power * 2;
        for (let i = 0; i < count; i++) shoot(game, e, (i / count) * Math.PI * 2, base * 0.7, 1.2);
      }
      break;
    }
  }
  game.audio.sfxEnemyShot();
}

function shoot(game, e, ang, speed, sizeMul) {
  game.enemyBullets.push({
    x: e.x, y: e.y,
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    r: CONFIG.enemy.bulletRadius * sizeMul,
    color: e.color,
    alive: true,
  });
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
