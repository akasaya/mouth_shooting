// バフアイテム: 硬い敵・ボスがドロップし、取得すると Way 増加 / シールド / オプションを得る。
// 被弾で失う（シールドは1回肩代わり）リスク報酬。pickBuffType / wayAngles は純粋関数でテスト対象。
import { CONFIG } from './config.js';
import { circlesOverlap } from './collision.js';
import { spawnBurst } from './particles.js';

// 抽選: rand(0..1) と重みからバフ種別を返す（純粋）。
export function pickBuffType(rand, weights = {}) {
  const w = { way: 1, shield: 1, option: 1, ...weights };
  const entries = [['way', w.way], ['shield', w.shield], ['option', w.option]];
  const total = entries.reduce((s, [, v]) => s + Math.max(0, v), 0) || 1;
  let r = Math.max(0, Math.min(0.999999, Number.isFinite(rand) ? rand : 0)) * total;
  for (const [k, v] of entries) {
    r -= Math.max(0, v);
    if (r < 0) return k;
  }
  return 'way';
}

// 多 Way ショットの角度オフセット配列（0 を中心に左右対称、純粋）。
export function wayAngles(count, spread) {
  const n = Math.max(1, Math.floor(count));
  const out = [];
  for (let i = 0; i < n; i++) out.push((i - (n - 1) / 2) * spread);
  return out;
}

const HARD_TYPES = new Set(['turret', 'spinner', 'striker']);
const STYLE = {
  way: { color: '#39f6ff', label: 'W' },
  shield: { color: '#5cffb1', label: 'S' },
  option: { color: '#ffd166', label: 'O' },
};

// 敵が硬い（弾幕系）かどうか。ボスは別途必ず落とす。
function isHardEnemy(e) {
  return HARD_TYPES.has(e.type);
}

// 敵撃破時に呼ぶ。条件を満たせばアイテムを1個ドロップする。
export function maybeDropItem(game, e) {
  const cfg = CONFIG.item;
  let chance = 0;
  if (e.isBoss) chance = cfg.dropChanceBoss;
  else if (isHardEnemy(e)) chance = cfg.dropChanceHard;
  if (chance <= 0 || Math.random() >= chance) return;

  const type = pickBuffType(Math.random(), cfg.weights);
  const ang = Math.random() * Math.PI * 2;
  game.items.push({
    type,
    x: e.x, y: e.y,
    vx: Math.cos(ang) * cfg.driftSpeed,
    vy: Math.sin(ang) * cfg.driftSpeed,
    r: cfg.radius,
    born: game.time,
    alive: true,
  });
}

// バフ適用（取得時）。
function applyBuff(game, type) {
  const p = game.player;
  const pc = CONFIG.player;
  if (type === 'way') p.wayLevel = Math.min(pc.maxWayLevel, p.wayLevel + 1);
  else if (type === 'shield') p.shield = true;
  else if (type === 'option') p.options = Math.min(pc.maxOptions, p.options + 1);
}

export function updateItems(game, dtSec) {
  const cfg = CONFIG.item;
  const p = game.player;
  for (const it of game.items) {
    if (!it.alive) continue;
    // 寿命切れ。
    if (game.time - it.born > cfg.lifeMs) { it.alive = false; continue; }

    const dx = p.x - it.x;
    const dy = p.y - it.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < cfg.attractRadius) {
      // 近いほど強く自機へ吸い寄せられる。
      it.vx += (dx / dist) * cfg.attractAccel * dtSec;
      it.vy += (dy / dist) * cfg.attractAccel * dtSec;
    } else {
      // 漂いは軽く減衰。
      it.vx *= 0.99;
      it.vy *= 0.99;
    }
    // 速度クランプ。
    const sp = Math.hypot(it.vx, it.vy);
    if (sp > cfg.maxSpeed) {
      it.vx = (it.vx / sp) * cfg.maxSpeed;
      it.vy = (it.vy / sp) * cfg.maxSpeed;
    }
    it.x += it.vx * dtSec;
    it.y += it.vy * dtSec;

    // 取得。
    if (circlesOverlap(it.x, it.y, it.r, p.x, p.y, CONFIG.player.radius)) {
      it.alive = false;
      applyBuff(game, it.type);
      spawnBurst(game.particles, it.x, it.y, 16, STYLE[it.type].color);
      game.audio.sfxItem();
    }
  }
  for (let i = game.items.length - 1; i >= 0; i--) {
    if (!game.items[i].alive) game.items.splice(i, 1);
  }
}

export function drawItems(ctx, game) {
  for (const it of game.items) {
    if (!it.alive) continue;
    const st = STYLE[it.type];
    // 取り逃し間際は点滅で警告。
    const left = CONFIG.item.lifeMs - (game.time - it.born);
    if (left < 2200 && Math.floor(game.time / 130) % 2 === 0) continue;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(game.time / 600);
    ctx.shadowColor = st.color;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = st.color;
    ctx.lineWidth = 2;
    ctx.beginPath(); // ひし形
    ctx.moveTo(0, -it.r); ctx.lineTo(it.r, 0); ctx.lineTo(0, it.r); ctx.lineTo(-it.r, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    // ラベル（回転させない）。
    ctx.save();
    ctx.shadowColor = st.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = st.color;
    ctx.font = "700 12px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.label, it.x, it.y);
    ctx.restore();
  }
}
