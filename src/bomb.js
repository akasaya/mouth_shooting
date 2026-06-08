// ボムのチャージと衝撃波。
// 計算部分（nextCharge / chargeToRadius）は純粋関数でテスト対象。
// updateBomb はゲーム状態に作用する統合部分。
import { CONFIG } from './config.js';
import { wavefrontReached } from './collision.js';
import { bombChargeRate, comboScoreMultiplier } from './combo.js';
import { spawnBurst } from './particles.js';

const clamp01 = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

// 現在チャージ + 速度 × 経過秒 を maxCharge でクランプ（純粋）。
export function nextCharge(charge, rate, dtSec, maxCharge) {
  const c = clamp01(charge) + Math.max(0, rate) * Math.max(0, dtSec);
  return Math.min(maxCharge, c);
}

// チャージ量(0..1) → 衝撃波の最終半径（純粋・単調増加）。
export function chargeToRadius(charge, minRadius, maxRadius) {
  return minRadius + (maxRadius - minRadius) * clamp01(charge);
}

// エネルギー回復（純粋・max でクランプ）。
export function gainEnergy(energy, amount, max = 1) {
  return Math.min(max, clamp01(energy) + Math.max(0, amount));
}

// エネルギー消費（純粋・0 下限）。
export function drainEnergy(energy, amount) {
  return Math.max(0, clamp01(energy) - Math.max(0, amount));
}

// ゲージにエネルギーを加算し、満タン(max)になったら +1 ストック・ゲージを 0 にリセット（純粋）。
// 端数は繰り越さない（ユーザー指定: 満タンで 0 に戻す）。maxStock で頭打ち時はゲージを満タン維持。
export function addEnergyToStock(energy, stock, amount, max = 1, maxStock = Infinity) {
  const e0 = Math.max(0, Number.isFinite(energy) ? energy : 0);
  const add = Math.max(0, Number.isFinite(amount) ? amount : 0);
  let s = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
  let e = e0 + add;
  if (e >= max) {
    if (s < maxStock) {
      s += 1;
      e = 0;          // 満タンでストック化し、ゲージは 0 に戻す
    } else {
      e = max;        // ストック上限ならゲージは満タンで頭打ち
    }
  }
  return { energy: e, stock: Math.min(s, maxStock) };
}

export function createBomb() {
  return {
    charging: false,
    charge: 0,        // 0..1
    energy: CONFIG.bomb.energyStart, // 0..1。ショット撃破で溜まり、満タンで +1 ストック
    stock: CONFIG.bomb.stockStart,   // 所持ボム数。発射で 1 消費（ストック0では撃てない）
    active: false,    // 衝撃波が拡大中か
    radius: 0,        // 現在の波の半径
    targetRadius: 0,  // 拡大の到達点
    hit: new Set(),   // 既にヒットした敵 id（多重ヒット防止）
    kills: 0,         // この1回のボムで倒した数（撃破が進むほど1体の得点が累積する）
  };
}

// 右ボタンの押下状態からチャージ/発動を駆動し、衝撃波で敵を一掃する。
export function updateBomb(game, dtSec) {
  const b = game.bomb;
  const cfg = CONFIG.bomb;
  const cc = CONFIG.combo;
  const holding = game.input.right;

  // --- チャージ中（ストックを所持しているときだけ溜められる。チャージ量は半径のみを決める）---
  // ストック0で右長押ししても何も起きない（右連打の無敵を防止）。
  if (holding && !b.active && b.stock > 0) {
    b.charging = true;
    const rate = bombChargeRate(game.combo.count, cfg.chargeRateBase, cfg.chargePerComboStep, cc.chargePer);
    b.charge = nextCharge(b.charge, rate, dtSec, cfg.maxCharge);
  }

  // --- 離した瞬間に発動（最小チャージ未満は不発＝連打抑止。発射でストックを1消費）---
  if (!holding && b.charging && !b.active) {
    b.charging = false;
    if (b.charge >= cfg.minChargeToFire && b.stock > 0) {
      b.stock -= 1;
      b.active = true;
      b.radius = 0;
      b.targetRadius = chargeToRadius(b.charge, cfg.minRadius, cfg.maxRadius);
      b.hit.clear();
      b.kills = 0;
      game.audio.sfxBomb(b.charge);
      spawnBurst(game.particles, game.player.x, game.player.y, 28, '#39f6ff');
    } else {
      b.charge = 0; // 不発（最小チャージ未満）。ストックは消費しない
    }
  }

  // --- 衝撃波の拡大とヒット判定 ---
  if (b.active) {
    b.radius += cfg.expandSpeed * dtSec;
    const px = game.player.x;
    const py = game.player.y;
    const mult = comboScoreMultiplier(game.combo.count, cc.scorePer);
    let killedThisFrame = 0;

    // 敵を一掃。1回のボム内で撃破が進むほど、1体の得点が累積的に上がる。
    for (const e of game.enemies) {
      if (!e.alive || b.hit.has(e.id)) continue;
      if (wavefrontReached(px, py, b.radius, e.x, e.y, e.r)) {
        b.hit.add(e.id);
        e.hp -= 999; // 衝撃波は貫通
        if (e.hp <= 0) {
          e.alive = false;
          b.kills += 1;
          killedThisFrame += 1;
          // 撃破順 (b.kills) に比例して得点が増える: 1体目×1, 2体目×2, ...
          game.score += cfg.killScore * mult * b.kills;
          spawnBurst(game.particles, e.x, e.y, 14, e.color);
          game.audio.sfxExplosion();
        }
      }
    }
    if (killedThisFrame > 0) {
      registerKills(game, killedThisFrame); // ボム同時撃破でコンボ大増加
    }

    // 敵弾も衝撃波で消す（防御）。
    for (const eb of game.enemyBullets) {
      if (!eb.alive) continue;
      if (wavefrontReached(px, py, b.radius, eb.x, eb.y, eb.r)) {
        eb.alive = false;
        spawnBurst(game.particles, eb.x, eb.y, 4, '#ff5a8a');
      }
    }

    if (b.radius >= b.targetRadius) {
      b.active = false;
      b.charge = 0;
      if (b.kills >= cfg.bigSweep) {
        game.banner = { text: `BOMB x${b.kills}!`, until: game.time + 1300 };
      }
    }
  }
}

// 撃破をコンボに反映（bomb から呼ぶ。main 側の registerKills と同義の薄いラッパ）。
function registerKills(game, n) {
  game.combo.count += n;
  game.combo.lastKillTime = game.time;
}
