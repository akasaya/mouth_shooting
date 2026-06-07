// エンドレス進行のディレクター。経過時間に応じて敵と弾を連続的に増やし、
// 時間でより手強い敵タイプを解禁する。
// difficultyAt / enemyTypeUnlocks は純粋関数（テスト対象）。
import { CONFIG } from './config.js';
import { spawnEnemy, spawnBoss } from './enemy.js';

// 経過秒 → 難易度パラメータ（純粋・時間で単調に難化）。
export function difficultyAt(elapsedSec) {
  const t = Math.max(0, elapsedSec);
  return {
    spawnIntervalMs: Math.max(170, 1000 - t * 7), // 出現間隔は時間で短縮（敵が増える）
    speed: CONFIG.enemy.baseSpeed * (1 + t * 0.012), // 突進速度の上昇
    enemyHp: 1 + Math.floor(t / 45),                 // 45秒ごとに硬く
    power: Math.floor(t / 25),                       // 弾数・パターン強度の段階（弾が増える）
  };
}

// 経過秒に応じて解禁される敵タイプ（純粋）。時間で種類が増える。
export function enemyTypeUnlocks(elapsedSec) {
  const t = Math.max(0, elapsedSec);
  const list = ['drifter'];
  if (t >= 8) list.push('weaver');
  if (t >= 22) list.push('charger');
  if (t >= 38) list.push('turret');
  if (t >= 56) list.push('spinner');
  if (t >= 75) list.push('striker');
  return list;
}

// 解禁済みタイプから重み付きで1つ選ぶ（drifter/weaver を多めにして弾過多を防ぐ）。
const WEIGHTS = { drifter: 3, weaver: 2.2, charger: 2, turret: 1.5, spinner: 1.3, striker: 1.2 };
export function pickEnemyType(elapsedSec, rng = Math.random) {
  const types = enemyTypeUnlocks(elapsedSec);
  const total = types.reduce((s, t) => s + (WEIGHTS[t] || 1), 0);
  let r = rng() * total;
  for (const t of types) {
    r -= WEIGHTS[t] || 1;
    if (r <= 0) return t;
  }
  return types[types.length - 1];
}

export function createDirector() {
  return { elapsed: 0, level: 1, nextSpawnAt: 0, nextBossAt: 0 };
}

export function startDirector(game) {
  const d = game.director;
  d.elapsed = 0;
  d.level = 1;
  d.nextSpawnAt = game.time + 500;
  d.nextBossAt = game.time + CONFIG.director.bossIntervalSec * 1000;
}

export function updateDirector(game, dtSec) {
  const d = game.director;
  d.elapsed += dtSec;
  d.level = Math.floor(d.elapsed / CONFIG.director.levelEverySec) + 1;

  const diff = difficultyAt(d.elapsed);

  // 通常敵を連続スポーン（タイプは時間で解禁・重み付き抽選）。
  if (game.time >= d.nextSpawnAt) {
    spawnEnemy(game, {
      type: pickEnemyType(d.elapsed),
      speed: diff.speed,
      hp: diff.enemyHp,
      power: diff.power,
    });
    d.nextSpawnAt = game.time + diff.spawnIntervalMs;
  }

  // 一定間隔でボス出現（進行ゲートではなく難化イベント。通常スポーンと並走）。
  if (game.time >= d.nextBossAt) {
    const bossHp = 60 + Math.floor(d.elapsed / CONFIG.director.bossIntervalSec) * 40;
    spawnBoss(game, { hp: bossHp, speed: 46, power: diff.power });
    game.banner = { text: 'WARNING — BOSS', until: game.time + 1800 };
    d.nextBossAt = game.time + CONFIG.director.bossIntervalSec * 1000;
  }
}
