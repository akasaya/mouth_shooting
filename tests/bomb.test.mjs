import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextCharge, chargeToRadius } from '../src/bomb.js';

test('nextCharge_accumulates_rate_times_dt', () => {
  // 0 から 速度1.0 × 0.5秒 = 0.5
  assert.equal(nextCharge(0, 1.0, 0.5, 1), 0.5);
});

test('nextCharge_clamps_to_maxCharge', () => {
  assert.equal(nextCharge(0.9, 1.0, 1.0, 1), 1);
});

test('nextCharge_handles_zero_dt_and_bad_input', () => {
  assert.equal(nextCharge(0.3, 1.0, 0, 1), 0.3);
  assert.equal(nextCharge(NaN, 1.0, 0.5, 1), 0.5); // NaN は 0 扱い → 0.5
});

test('chargeToRadius_zero_is_minRadius_full_is_maxRadius', () => {
  assert.equal(chargeToRadius(0, 70, 340), 70);
  assert.equal(chargeToRadius(1, 70, 340), 340);
});

test('chargeToRadius_is_monotonic_and_clamped', () => {
  const r25 = chargeToRadius(0.25, 70, 340);
  const r75 = chargeToRadius(0.75, 70, 340);
  assert.ok(r75 > r25);
  assert.equal(chargeToRadius(-1, 70, 340), 70);   // 下限クランプ
  assert.equal(chargeToRadius(2, 70, 340), 340);   // 上限クランプ
});
