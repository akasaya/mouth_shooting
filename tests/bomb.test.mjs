import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextCharge, chargeToRadius, gainEnergy, drainEnergy, addEnergyToStock, bombKillEnergy } from '../src/bomb.js';

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

test('addEnergyToStock_accumulates_without_reaching_full', () => {
  const r = addEnergyToStock(0.4, 0, 0.2, 1, 5);
  assert.ok(Math.abs(r.energy - 0.6) < 1e-9);
  assert.equal(r.stock, 0);
});

test('addEnergyToStock_full_converts_to_stock_and_resets_gauge', () => {
  // ゲージ満タンで +1 ストック、ゲージは 0 にリセット（端数は繰り越さない）
  const r = addEnergyToStock(0.9, 1, 0.25, 1, 5);
  assert.equal(r.stock, 2);
  assert.equal(r.energy, 0);
});

test('addEnergyToStock_exact_full_converts', () => {
  const r = addEnergyToStock(0.8, 0, 0.2, 1, 5);
  assert.equal(r.stock, 1);
  assert.equal(r.energy, 0);
});

test('addEnergyToStock_caps_at_maxStock_and_keeps_gauge_full', () => {
  // 上限ストック時はゲージを満タンで頭打ち（これ以上ストックしない）
  const r = addEnergyToStock(0.95, 5, 0.2, 1, 5);
  assert.equal(r.stock, 5);
  assert.equal(r.energy, 1);
});

test('addEnergyToStock_bad_input_is_safe', () => {
  const r = addEnergyToStock(NaN, NaN, NaN, 1, 5);
  assert.equal(r.stock, 0);
  assert.equal(r.energy, 0);
});

test('bombKillEnergy_scales_with_kill_index', () => {
  // 同時撃破が進むほど（killIndex が大きいほど）回復が増える
  assert.ok(Math.abs(bombKillEnergy(1, 0.012) - 0.012) < 1e-9);
  assert.ok(Math.abs(bombKillEnergy(5, 0.012) - 0.06) < 1e-9);
  assert.ok(bombKillEnergy(10, 0.012) > bombKillEnergy(3, 0.012));
});

test('bombKillEnergy_bad_input_returns_zero', () => {
  assert.equal(bombKillEnergy(0, 0.012), 0);
  assert.equal(bombKillEnergy(-2, 0.012), 0);
  assert.equal(bombKillEnergy(NaN, 0.012), 0);
});
