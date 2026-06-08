import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickBuffType, wayAngles } from '../src/item.js';

test('pickBuffType_equal_weights_partitions_by_thirds', () => {
  const w = { way: 1, shield: 1, option: 1 };
  assert.equal(pickBuffType(0, w), 'way');
  assert.equal(pickBuffType(0.1, w), 'way');
  assert.equal(pickBuffType(0.5, w), 'shield');
  assert.equal(pickBuffType(0.9, w), 'option');
});

test('pickBuffType_respects_weights', () => {
  // way の重みを大きくすると way が出やすい
  const w = { way: 8, shield: 1, option: 1 };
  assert.equal(pickBuffType(0.5, w), 'way');
  assert.equal(pickBuffType(0.85, w), 'shield');
  assert.equal(pickBuffType(0.95, w), 'option');
});

test('pickBuffType_bad_input_is_safe', () => {
  assert.equal(pickBuffType(NaN, { way: 1, shield: 1, option: 1 }), 'way');
  assert.equal(pickBuffType(0.5, {}), 'shield'); // 既定の等重み
});

test('wayAngles_single_is_centered', () => {
  assert.deepEqual(wayAngles(1, 0.1), [0]);
});

test('wayAngles_symmetric_spread', () => {
  const a = wayAngles(3, 0.1);
  assert.equal(a.length, 3);
  assert.ok(Math.abs(a[0] + 0.1) < 1e-9);
  assert.ok(Math.abs(a[1]) < 1e-9);
  assert.ok(Math.abs(a[2] - 0.1) < 1e-9);
  const b = wayAngles(2, 0.2);
  assert.ok(Math.abs(b[0] + 0.1) < 1e-9);
  assert.ok(Math.abs(b[1] - 0.1) < 1e-9);
});

test('wayAngles_clamps_count_to_at_least_one', () => {
  assert.deepEqual(wayAngles(0, 0.1), [0]);
  assert.deepEqual(wayAngles(-3, 0.1), [0]);
});
