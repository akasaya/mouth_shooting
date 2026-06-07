import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stageParams } from '../src/stage.js';

test('stageParams_difficulty_increases_with_index', () => {
  const a = stageParams(1);
  const b = stageParams(3);
  const c = stageParams(5);
  // 出現間隔は短くなる（密になる）
  assert.ok(b.spawnIntervalMs < a.spawnIntervalMs);
  assert.ok(c.spawnIntervalMs <= b.spawnIntervalMs);
  // 倒す敵数・突進速度・ボス HP は増える
  assert.ok(b.quota > a.quota);
  assert.ok(b.speed > a.speed);
  assert.ok(b.bossHp > a.bossHp);
});

test('stageParams_spawnInterval_has_floor', () => {
  // 高ステージでも下限 280ms を割らない
  assert.ok(stageParams(99).spawnIntervalMs >= 280);
});

test('stageParams_shooterChance_capped', () => {
  assert.ok(stageParams(99).shooterChance <= 0.7);
});
