// コンボの派生値を計算する純粋関数群（DOM/Canvas に非依存・テスト対象）。
// すべて引数だけから結果を返し、副作用を持たない。

const clampNonNeg = (n) => (Number.isFinite(n) && n > 0 ? n : 0);

// コンボ数 → スコア倍率（scorePer ごとに +1。最低 1 倍）。
export function comboScoreMultiplier(combo, scorePer) {
  return 1 + Math.floor(clampNonNeg(combo) / scorePer);
}

// コンボ数 → ボムのチャージ速度（charge/秒）。コンボが高いほど速く溜まる。
export function bombChargeRate(combo, base, perStep, chargePer) {
  const steps = Math.floor(clampNonNeg(combo) / chargePer);
  return base + perStep * steps;
}

// コンボ数 → 音楽レイヤー段階。thresholds を超えた最大インデックスを返す。
export function musicLayerLevel(combo, thresholds) {
  const c = clampNonNeg(combo);
  let level = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (c >= thresholds[i]) level = i;
  }
  return level;
}

// 最後の撃破からの経過時間に応じてコンボを減衰させる。
// decayMs 以内なら維持、超えたらリセット（0）。
export function applyComboDecay(combo, msSinceLastKill, decayMs) {
  if (clampNonNeg(combo) <= 0) return 0;
  return msSinceLastKill > decayMs ? 0 : combo;
}
