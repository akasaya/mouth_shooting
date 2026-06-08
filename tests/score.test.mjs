import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lifeExtends } from '../src/score.js';

test('lifeExtends_crossing_one_threshold_returns_one', () => {
  assert.equal(lifeExtends(99000, 101000, 100000), 1);
});

test('lifeExtends_no_crossing_returns_zero', () => {
  assert.equal(lifeExtends(101000, 150000, 100000), 0);
  assert.equal(lifeExtends(0, 99999, 100000), 0);
});

test('lifeExtends_exact_multiple_counts', () => {
  // 200000 ちょうどに到達したら 100000 と 200000 をまたぐ
  assert.equal(lifeExtends(0, 200000, 100000), 2);
  assert.equal(lifeExtends(199999, 200000, 100000), 1);
});

test('lifeExtends_big_jump_counts_all_thresholds', () => {
  // 1フレームで大量加点（大型ボム）→ またいだ閾値の数だけ
  assert.equal(lifeExtends(50000, 350000, 100000), 3);
});

test('lifeExtends_bad_input_returns_zero', () => {
  assert.equal(lifeExtends(NaN, 100000, 100000), 1); // prev は 0 扱い → 1
  assert.equal(lifeExtends(100000, NaN, 100000), 0); // cur は 0 扱い → 減少なので 0
  assert.equal(lifeExtends(0, 100000, 0), 0);        // interval 0 は無効
  assert.equal(lifeExtends(0, 100000, -5), 0);       // interval 負は無効
});
