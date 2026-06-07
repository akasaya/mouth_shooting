import { test } from 'node:test';
import assert from 'node:assert/strict';
import { difficultyAt, enemyTypeUnlocks, pickEnemyType } from '../src/stage.js';

test('difficultyAt_spawn_interval_shrinks_over_time', () => {
  assert.ok(difficultyAt(30).spawnIntervalMs < difficultyAt(0).spawnIntervalMs);
  assert.ok(difficultyAt(60).spawnIntervalMs < difficultyAt(30).spawnIntervalMs);
});

test('difficultyAt_spawn_interval_has_floor', () => {
  assert.ok(difficultyAt(9999).spawnIntervalMs >= 170);
});

test('difficultyAt_speed_and_power_increase_over_time', () => {
  assert.ok(difficultyAt(60).speed > difficultyAt(0).speed);
  assert.ok(difficultyAt(80).power > difficultyAt(0).power);
  assert.equal(difficultyAt(0).power, 0);
});

test('difficultyAt_handles_negative_like_zero', () => {
  assert.deepEqual(difficultyAt(-5), difficultyAt(0));
});

test('enemyTypeUnlocks_starts_with_only_drifter', () => {
  assert.deepEqual(enemyTypeUnlocks(0), ['drifter']);
});

test('enemyTypeUnlocks_grows_monotonically', () => {
  const times = [0, 10, 25, 40, 60, 80];
  let prev = 0;
  for (const t of times) {
    const len = enemyTypeUnlocks(t).length;
    assert.ok(len >= prev, `unlocks should not shrink at t=${t}`);
    prev = len;
  }
  assert.ok(enemyTypeUnlocks(80).includes('striker'));
});

test('pickEnemyType_returns_an_unlocked_type', () => {
  // rng=0 / rng≈1 のどちらでも解禁済みリスト内
  const t = 60;
  const unlocked = enemyTypeUnlocks(t);
  assert.ok(unlocked.includes(pickEnemyType(t, () => 0)));
  assert.ok(unlocked.includes(pickEnemyType(t, () => 0.999)));
});

test('pickEnemyType_at_zero_is_always_drifter', () => {
  assert.equal(pickEnemyType(0, () => 0.5), 'drifter');
});
