// すべての手触り・難易度の数値をここに集約する（一箇所で調整できるように）。
export const CONFIG = {
  player: {
    radius: 12,
    followLerp: 0.22,        // カーソル追従の滑らかさ（0..1、1で即追従）
    chargeMoveFactor: 0.4,   // ボム溜め中の移動速度倍率
    maxLives: 3,
    invulnMs: 1400,          // 被弾後の無敵時間
    shieldInvulnMs: 800,     // シールドで被弾を肩代わりした直後の無敵
    // --- バフ（被弾で失う。シールドは1回肩代わり）---
    maxWayLevel: 3,          // Way 強化の上限（way数 = 1 + 2*level → 1/3/5/7）
    waySpreadDeg: 9,         // 多 Way の弾の間隔（度）
    maxOptions: 2,           // オプション（僚機）の最大数
    optionOrbitRadius: 46,   // オプションの周回半径
    optionSpinRate: 2.2,     // オプションの周回角速度（rad/秒）
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
    killScore: 14,             // ボム撃破の基礎スコア。1回のボム内で撃破が進むほど累積的に倍増する
    moveSlow: 0.4,
    bigSweep: 5,               // この撃破数以上で「BOMB xN!」を表示
    // --- ストック制（ゲージが満タンでボムを1ストック、ゲージは0に戻る）---
    energyMax: 1,              // ゲージ満タンの値（0..energyMax）
    energyStart: 0,            // ゲーム開始時のゲージ量
    energyPerKill: 0.07,       // ショット撃破1体あたりのゲージ回復量
    energyComboBonus: 0.004,   // コンボ数に比例した回復ボーナス（×combo、上限あり）
    stockStart: 1,             // ゲーム開始時に所持するボム数
    maxStock: 5,               // ボムの最大ストック数
    minChargeToFire: 0.06,     // これ未満のチャージは不発（タップ連打の抑止）
    energyPerBombKill: 0.012,  // ボム撃破1体あたりのゲージ回復（×撃破順。上限なしで累積）
  },
  scoring: {
    extendEvery: 100000,       // このスコアごとに +1 ライフ（エクステンド）
  },
  graze: {
    margin: 22,                // 当たり判定の外側この距離までを「かすり」とみなす
    score: 3,                  // かすり1回のスコア
    energy: 0.004,             // かすり1回のボムゲージ回復
  },
  item: {
    dropChanceHard: 0.28,      // 硬い敵（砲台/旋回/螺旋）の落とす確率
    dropChanceBoss: 1,         // ボスは必ず落とす
    radius: 11,
    driftSpeed: 34,            // 出現直後の漂う速さ（px/秒）
    attractRadius: 150,        // この距離まで近づくと自機へ吸い寄せられる
    attractAccel: 1200,        // 吸い寄せの加速度
    maxSpeed: 380,
    lifeMs: 11000,             // 取り逃すと消えるまでの時間
    weights: { way: 1, shield: 1, option: 1 }, // 抽選の重み
  },
  music: {
    survivalPerLayerSec: 45,   // 生存この秒数ごとに音楽レイヤー(intensity)が +1
    survivalMaxLevel: 4,       // intensity の上限
  },
  combo: {
    decayMs: 2200,                       // この時間撃破が無いとコンボはリセット
    musicThresholds: [0, 6, 14, 28, 48], // コンボ閾値→音楽レイヤー段階(0..4)
    scorePer: 10,                        // この数ごとにスコア倍率の基礎段が+1
    scoreAccel: 0.5,                     // 倍率の加速項（段数²×accel）。高コンボほど急に伸びる
    scoreMultMax: 99,                    // スコア倍率の上限
    chargePer: 5,                        // この数ごとにチャージ速度1段アップ
  },
  enemy: {
    baseRadius: 14,
    baseSpeed: 72,           // 開始時の突進速度（px/秒）。時間経過で上昇。
    contactDamage: 1,
    bulletSpeed: 190,
    bulletRadius: 5,
  },
  // エンドレス進行のディレクター。時間経過で敵と弾が連続的に増える。
  director: {
    bossIntervalSec: 40,     // この秒数ごとにボスが出現（山場・難化イベント）
    levelEverySec: 20,       // 表示用 LEVEL が上がる間隔
  },
};
