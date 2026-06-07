import { test } from 'node:test';
import assert from 'node:assert/strict';
import { difficultyAt } from '../src/stage.js';

test('difficultyAt_spawn_interval_shrinks_over_time', () => {
  assert.ok(difficultyAt(30).spawnIntervalMs < difficultyAt(0).spawnIntervalMs);
  assert.ok(difficultyAt(60).spawnIntervalMs < difficultyAt(30).spawnIntervalMs);
});

test('difficultyAt_spawn_interval_has_floor', () => {
  assert.ok(difficultyAt(9999).spawnIntervalMs >= 180);
});

test('difficultyAt_speed_increases_over_time', () => {
  assert.ok(difficultyAt(60).speed > difficultyAt(0).speed);
});

test('difficultyAt_more_bullets_over_time', () => {
  // 射撃割合・弾数ともに時間で増える
  assert.ok(difficultyAt(60).shooterChance > difficultyAt(0).shooterChance);
  assert.ok(difficultyAt(80).shots > difficultyAt(0).shots);
});

test('difficultyAt_shooterChance_capped', () => {
  assert.ok(difficultyAt(9999).shooterChance <= 0.85);
});

test('difficultyAt_handles_zero_and_negative', () => {
  const a = difficultyAt(0);
  assert.equal(a.shots, 1);
  assert.equal(a.enemyHp, 1);
  // 負値でも 0 と同じ扱い（例外を出さない）
  assert.deepEqual(difficultyAt(-5), difficultyAt(0));
});
