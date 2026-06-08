import { test } from 'node:test';
import assert from 'node:assert/strict';
import { circlesOverlap, wavefrontReached, isOutside, withinGraze } from '../src/collision.js';

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

test('withinGraze_ring_between_collision_and_margin', () => {
  // 自機 r10、弾 r5 → 当たり=15。margin20 → かすり帯は 15<dist<=35。
  assert.equal(withinGraze(0, 0, 10, 15, 0, 5, 20), false); // 接触ちょうど=ヒット扱い（かすりでない）
  assert.equal(withinGraze(0, 0, 10, 25, 0, 5, 20), true);  // 帯の内側
  assert.equal(withinGraze(0, 0, 10, 35, 0, 5, 20), true);  // 帯の縁
  assert.equal(withinGraze(0, 0, 10, 36, 0, 5, 20), false); // 帯の外
});
