// すべての手触り・難易度の数値をここに集約する（一箇所で調整できるように）。
export const CONFIG = {
  player: {
    radius: 12,
    followLerp: 0.22,        // カーソル追従の滑らかさ（0..1、1で即追従）
    chargeMoveFactor: 0.4,   // ボム溜め中の移動速度倍率
    maxLives: 3,
    invulnMs: 1400,          // 被弾後の無敵時間
  },
  shot: {
    fireIntervalMs: 110,     // 連射間隔
    bulletSpeed: 600,
    bulletRadius: 4,
    score: 5,                // ショット撃破の微小スコア（ボムより遥かに小さい）
  },
  bomb: {
    chargeRateBase: 0.85,      // コンボ0でのチャージ速度（charge/秒, charge は 0..1）
    chargePerComboStep: 0.14,  // コンボ5段ごとに増えるチャージ速度
    maxCharge: 1,
    minRadius: 70,
    maxRadius: 340,
    expandSpeed: 1100,         // 衝撃波の広がる速さ（px/秒）
    ringWidth: 30,
    killScore: 22,             // ボム撃破1体ごとの基礎スコア（×コンボ倍率）
    moveSlow: 0.4,
  },
  combo: {
    decayMs: 2200,                       // この時間撃破が無いとコンボはリセット
    musicThresholds: [0, 6, 14, 28, 48], // コンボ閾値→音楽レイヤー段階(0..4)
    scorePer: 10,                        // この数ごとにスコア倍率+1
    chargePer: 5,                        // この数ごとにチャージ速度1段アップ
  },
  enemy: {
    baseRadius: 14,
    baseSpeed: 72,           // ステージ1の突進速度（px/秒）。ステージで上昇。
    contactDamage: 1,
    bulletSpeed: 190,
    bulletRadius: 5,
  },
  stage: {
    count: 5,
  },
};
