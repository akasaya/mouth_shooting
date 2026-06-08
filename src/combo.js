// コンボの派生値を計算する純粋関数群（DOM/Canvas に非依存・テスト対象）。
// すべて引数だけから結果を返し、副作用を持たない。

const clampNonNeg = (n) => (Number.isFinite(n) && n > 0 ? n : 0);

// コンボ数 → スコア倍率。scorePer ごとに段(steps)が1上がり、
// 倍率 = 1 + steps + floor(steps² × accel)。accel>0 で高コンボほど急カーブに伸びる。
// accel 既定 0・multMax 既定 ∞ なので、2引数呼び出しは従来の線形（1+steps）と同じ。
export function comboScoreMultiplier(combo, scorePer, accel = 0, multMax = Infinity) {
  const steps = Math.floor(clampNonNeg(combo) / scorePer);
  const mult = 1 + steps + Math.floor(steps * steps * Math.max(0, accel));
  return Math.min(multMax, mult);
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

// 生存秒数 → 音楽の追加レイヤー段階。perLayerSec ごとに +1、maxLevel で頭打ち。
// コンボ由来のレイヤーとは独立に、長く生きるほど音数を増やすために使う。
export function survivalLayerLevel(elapsedSec, perLayerSec, maxLevel) {
  if (!(perLayerSec > 0)) return 0;
  const t = clampNonNeg(elapsedSec);
  return Math.min(maxLevel, Math.floor(t / perLayerSec));
}

// 最後の撃破からの経過時間に応じてコンボを減衰させる。
// decayMs 以内なら維持、超えたらリセット（0）。
export function applyComboDecay(combo, msSinceLastKill, decayMs) {
  if (clampNonNeg(combo) <= 0) return 0;
  return msSinceLastKill > decayMs ? 0 : combo;
}
