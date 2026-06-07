import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextCharge, chargeToRadius, gainEnergy, drainEnergy } from '../src/bomb.js';

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

test('gainEnergy_adds_and_caps_at_max', () => {
  assert.ok(Math.abs(gainEnergy(0.4, 0.2, 1) - 0.6) < 1e-9); // 浮動小数の許容
  assert.equal(gainEnergy(0.9, 0.5, 1), 1);                  // 上限クランプ
  assert.equal(gainEnergy(0.5, -1, 1), 0.5);                 // 負の回復は無効
});

test('drainEnergy_subtracts_and_floors_at_zero', () => {
  assert.equal(drainEnergy(0.5, 0.2), 0.3);
  assert.equal(drainEnergy(0.1, 0.9), 0);     // 0 下限
  assert.equal(drainEnergy(0.5, -1), 0.5);    // 負の消費は無効
});
