import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  comboScoreMultiplier,
  bombChargeRate,
  musicLayerLevel,
  applyComboDecay,
} from '../src/combo.js';

test('comboScoreMultiplier_zero_returns_one', () => {
  assert.equal(comboScoreMultiplier(0, 10), 1);
  assert.equal(comboScoreMultiplier(9, 10), 1);
});

test('comboScoreMultiplier_steps_up_every_scorePer', () => {
  assert.equal(comboScoreMultiplier(10, 10), 2);
  assert.equal(comboScoreMultiplier(25, 10), 3);
});

test('comboScoreMultiplier_negative_or_nan_falls_back_to_one', () => {
  assert.equal(comboScoreMultiplier(-5, 10), 1);
  assert.equal(comboScoreMultiplier(NaN, 10), 1);
});

test('bombChargeRate_increases_monotonically_with_combo', () => {
  const base = 0.85, perStep = 0.14, chargePer = 5;
  const r0 = bombChargeRate(0, base, perStep, chargePer);
  const r5 = bombChargeRate(5, base, perStep, chargePer);
  const r10 = bombChargeRate(10, base, perStep, chargePer);
  assert.equal(r0, base);
  assert.ok(r5 > r0);
  assert.ok(r10 > r5);
  assert.equal(r10, base + perStep * 2);
});

test('musicLayerLevel_picks_highest_threshold_met', () => {
  const t = [0, 6, 14, 28, 48];
  assert.equal(musicLayerLevel(0, t), 0);
  assert.equal(musicLayerLevel(5, t), 0);
  assert.equal(musicLayerLevel(6, t), 1);
  assert.equal(musicLayerLevel(30, t), 3);
  assert.equal(musicLayerLevel(100, t), 4);
});

test('applyComboDecay_within_window_keeps_combo', () => {
  assert.equal(applyComboDecay(12, 1000, 2200), 12);
  assert.equal(applyComboDecay(12, 2200, 2200), 12); // 境界ちょうどは維持
});

test('applyComboDecay_past_window_resets_to_zero', () => {
  assert.equal(applyComboDecay(12, 2201, 2200), 0);
});

test('applyComboDecay_zero_stays_zero', () => {
  assert.equal(applyComboDecay(0, 9999, 2200), 0);
});
