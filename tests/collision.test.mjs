import { test } from 'node:test';
import assert from 'node:assert/strict';
import { circlesOverlap, wavefrontReached, isOutside } from '../src/collision.js';

test('circlesOverlap_clearly_overlapping_is_true', () => {
  assert.equal(circlesOverlap(0, 0, 10, 5, 0, 10), true);
});

test('circlesOverlap_touching_exactly_is_true', () => {
  // 距離 20 = 半径和 20（接触ちょうど）
  assert.equal(circlesOverlap(0, 0, 10, 20, 0, 10), true);
});

test('circlesOverlap_just_apart_is_false', () => {
  assert.equal(circlesOverlap(0, 0, 10, 21, 0, 10), false);
});

test('wavefrontReached_front_reaches_near_edge', () => {
  // 敵は中心から距離 100、半径 14 → 近い縁は 86。
  assert.equal(wavefrontReached(0, 0, 85, 100, 0, 14), false);
  assert.equal(wavefrontReached(0, 0, 86, 100, 0, 14), true);
  assert.equal(wavefrontReached(0, 0, 200, 100, 0, 14), true);
});

test('isOutside_inside_is_false_outside_is_true', () => {
  assert.equal(isOutside(50, 50, 800, 600), false);
  assert.equal(isOutside(-60, 50, 800, 600, 40), true);
  assert.equal(isOutside(50, 700, 800, 600, 40), true);
});
