// エンドレス進行のディレクター。経過時間に応じて敵と弾を連続的に増やす。
// difficultyAt は純粋関数（テスト対象）。spawner は game に作用する統合部分。
import { CONFIG } from './config.js';
import { spawnEnemy, spawnBoss } from './enemy.js';

// 経過秒 → 難易度パラメータ（純粋・時間で単調に難化）。
export function difficultyAt(elapsedSec) {
  const t = Math.max(0, elapsedSec);
  return {
    spawnIntervalMs: Math.max(180, 1000 - t * 7), // 出現間隔は時間で短縮（下限180ms＝敵が増える）
    speed: CONFIG.enemy.baseSpeed * (1 + t * 0.012), // 突進速度の上昇
    shooterChance: Math.min(0.85, 0.1 + t * 0.006),  // 射撃する敵の割合（弾が増える）
    enemyHp: 1 + Math.floor(t / 45),                 // 45秒ごとに硬く
    shots: 1 + Math.floor(t / 40),                   // 1体が撃つ弾数（時間で増える）
    spread: 0.26,
  };
}

export function createDirector() {
  return {
    elapsed: 0,    // 経過秒
    level: 1,      // 表示用レベル
    nextSpawnAt: 0,
    nextBossAt: 0,
  };
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

  // 通常敵を連続スポーン。
  if (game.time >= d.nextSpawnAt) {
    const shooter = Math.random() < diff.shooterChance;
    spawnEnemy(game, {
      speed: diff.speed,
      hp: diff.enemyHp,
      shooter,
      shots: diff.shots,
      spread: diff.spread,
    });
    d.nextSpawnAt = game.time + diff.spawnIntervalMs;
  }

  // 一定間隔でボス出現（進行をゲートせず、通常スポーンと並走する難化イベント）。
  if (game.time >= d.nextBossAt) {
    const bossHp = 60 + Math.floor(d.elapsed / CONFIG.director.bossIntervalSec) * 40;
    spawnBoss(game, { hp: bossHp, speed: 46 });
    game.banner = { text: 'WARNING — BOSS', until: game.time + 1800 };
    d.nextBossAt = game.time + CONFIG.director.bossIntervalSec * 1000;
  }
}
