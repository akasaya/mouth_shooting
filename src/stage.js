// ステージ進行と難易度カーブ。ウェーブ→ボス→クリアの状態遷移を管理する。
import { CONFIG } from './config.js';
import { spawnEnemy, spawnBoss } from './enemy.js';

// ステージ番号 → 難易度パラメータ（純粋・進行で単調に難化）。
export function stageParams(index) {
  return {
    spawnIntervalMs: Math.max(280, 1100 - index * 130), // 出現間隔（短いほど密）
    quota: 8 + index * 5,                                // ボス前に倒す敵数
    speed: CONFIG.enemy.baseSpeed * (1 + (index - 1) * 0.18),
    shooterChance: Math.min(0.7, 0.08 + index * 0.12),   // 射撃する敵の割合
    enemyHp: 1 + Math.floor((index - 1) / 2),            // 2ステージごとに硬く
    bossHp: 40 + index * 30,
    bossSpeed: 40 + index * 6,
  };
}

export function createStageState() {
  return {
    index: 1,
    phase: 'wave',   // 'wave' | 'boss' | 'clear'
    spawned: 0,
    nextSpawnAt: 0,
    params: stageParams(1),
  };
}

export function startStage(game, index) {
  const s = game.stage;
  s.index = index;
  s.phase = 'wave';
  s.spawned = 0;
  s.params = stageParams(index);
  s.nextSpawnAt = game.time + 600;
}

export function updateStage(game) {
  const s = game.stage;
  const p = s.params;

  if (s.phase === 'wave') {
    // クォータまで一定間隔で敵を出す。
    if (s.spawned < p.quota && game.time >= s.nextSpawnAt) {
      const shooter = Math.random() < p.shooterChance;
      spawnEnemy(game, { speed: p.speed, hp: p.enemyHp, shooter, fireChance: p.shooterChance });
      s.spawned += 1;
      s.nextSpawnAt = game.time + p.spawnIntervalMs;
    }
    // 全部出し切り、画面の敵を一掃したらボスへ。
    if (s.spawned >= p.quota && game.enemies.length === 0) {
      s.phase = 'boss';
      spawnBoss(game, { hp: p.bossHp, speed: p.bossSpeed });
      game.banner = { text: `STAGE ${s.index}  BOSS`, until: game.time + 1800 };
    }
    return;
  }

  if (s.phase === 'boss') {
    // ボス撃破（敵が居なくなった）でステージクリア。
    if (game.enemies.length === 0) {
      s.phase = 'clear';
      if (s.index >= CONFIG.stage.count) {
        game.onAllClear();
      } else {
        game.banner = { text: `STAGE ${s.index} CLEAR`, until: game.time + 2200 };
        game.clearAt = game.time + 2200;
      }
    }
    return;
  }

  if (s.phase === 'clear') {
    // バナー表示後、次ステージへ。
    if (game.time >= game.clearAt) {
      startStage(game, s.index + 1);
    }
  }
}
