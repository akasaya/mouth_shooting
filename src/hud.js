// HUD: スコア・コンボ・ライフ・チャージゲージ・ステージ表示と、各種オーバーレイ。
import { CONFIG } from './config.js';
import { comboScoreMultiplier } from './combo.js';

const FONT = "700 16px 'Segoe UI', system-ui, sans-serif";

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function drawHud(ctx, game) {
  const w = game.width;
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.textBaseline = 'top';

  // スコア
  ctx.font = "700 22px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = '#aef9ff';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${Math.floor(game.score)}`, 16, 14);

  // ハイスコア
  ctx.font = FONT;
  ctx.fillStyle = '#6fb8c8';
  ctx.fillText(`HI ${Math.floor(game.highScore)}`, 16, 42);

  // 経過時間とレベル（エンドレス）
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = "700 18px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(`TIME ${formatTime(game.director.elapsed)}   Lv.${game.director.level}`, w / 2, 16);

  // コンボ（中央やや上、コンボ中は大きく光る）
  if (game.combo.count > 0) {
    const mult = comboScoreMultiplier(game.combo.count, CONFIG.combo.scorePer);
    ctx.font = "800 30px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = '#ff6ec7';
    ctx.shadowColor = '#ff6ec7';
    ctx.shadowBlur = 14;
    ctx.fillText(`${game.combo.count} COMBO  x${mult}`, w / 2, 44);
    ctx.shadowBlur = 0;
  }

  // ライフ（右上にハート風の丸）。エクステンドで増えるため、多いときは丸＋数値表示。
  const lives = Math.max(0, game.player.lives | 0);
  const maxDots = 5;
  const dots = Math.min(lives, maxDots);
  for (let i = 0; i < dots; i++) {
    ctx.fillStyle = '#ff4060';
    ctx.shadowColor = '#ff4060';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(w - 20 - i * 26, 26, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  if (lives > maxDots) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff8095';
    ctx.font = "700 15px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(`x${lives}`, w - 20 - maxDots * 26, 26);
    ctx.textBaseline = 'top';
  }

  // ボムエネルギーゲージ（画面下中央。ショットで溜まり、ボムで減る）
  drawEnergyGauge(ctx, game);

  // 取得中のバフ（画面左下）
  drawBuffs(ctx, game);

  // チャージゲージ（自機の下。溜め中のみ）
  if (game.bomb.charging && game.bomb.charge > 0) {
    drawChargeGauge(ctx, game);
  }

  // バナー（ボス出現・ステージクリア）
  if (game.banner && game.time < game.banner.until) {
    ctx.textAlign = 'center';
    ctx.font = "800 40px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#39f6ff';
    ctx.shadowBlur = 20;
    ctx.fillText(game.banner.text, w / 2, game.height / 2 - 24);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawEnergyGauge(ctx, game) {
  const e = Math.max(0, Math.min(1, game.bomb.energy)); // 次のストックまでの進捗
  const stock = Math.max(0, game.bomb.stock | 0);
  const gw = 220, gh = 12;
  const x = (game.width - gw) / 2;
  const y = game.height - 34;
  const empty = stock <= 0;
  const blink = empty && Math.floor(game.time / 140) % 2 === 0;
  const color = empty ? '#ff6b6b' : '#ffb347';
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = "700 13px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = color;
  ctx.fillText('BOMB', x - 8, y + gh / 2);
  // 枠（次のストックまでのゲージ）
  ctx.fillStyle = 'rgba(255,179,71,0.18)';
  ctx.fillRect(x, y, gw, gh);
  // ゲージ残量
  ctx.fillStyle = '#ffb347';
  ctx.shadowColor = '#ffb347';
  ctx.shadowBlur = 10;
  ctx.fillRect(x, y, gw * e, gh);
  ctx.shadowBlur = 0;

  // ストック数（ゲージ右にボム弾アイコンを並べる。0 のときは点滅で警告）
  const r = 6, gap = 18;
  ctx.textAlign = 'left';
  if (empty) {
    if (!blink) {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = "700 13px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText('EMPTY', x + gw + 12, y + gh / 2);
    }
  } else {
    for (let i = 0; i < stock; i++) {
      ctx.beginPath();
      ctx.fillStyle = '#aef9ff';
      ctx.shadowColor = '#39f6ff';
      ctx.shadowBlur = 10;
      ctx.arc(x + gw + 14 + i * gap, y + gh / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawBuffs(ctx, game) {
  const p = game.player;
  const items = [];
  if (p.wayLevel > 0) items.push({ t: `WAY x${1 + 2 * p.wayLevel}`, c: '#39f6ff' });
  if (p.options > 0) items.push({ t: `OPTION x${p.options}`, c: '#ffd166' });
  if (p.shield) items.push({ t: 'SHIELD', c: '#5cffb1' });
  if (items.length === 0) return;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font = "700 14px 'Segoe UI', system-ui, sans-serif";
  let y = game.height - 18;
  for (const it of items) {
    ctx.fillStyle = it.c;
    ctx.shadowColor = it.c;
    ctx.shadowBlur = 8;
    ctx.fillText(it.t, 16, y);
    y -= 20;
  }
  ctx.restore();
}

function drawChargeGauge(ctx, game) {
  const p = game.player;
  const c = game.bomb.charge;
  const gw = 64, gh = 7;
  const x = p.x - gw / 2;
  const y = p.y + CONFIG.player.radius + 12;
  ctx.save();
  ctx.fillStyle = 'rgba(57,246,255,0.22)';
  ctx.fillRect(x, y, gw, gh);
  ctx.fillStyle = '#39f6ff';
  ctx.shadowColor = '#39f6ff';
  ctx.shadowBlur = 10;
  ctx.fillRect(x, y, gw * c, gh);
  ctx.restore();
}

export function drawOverlay(ctx, game) {
  const w = game.width, h = game.height;
  ctx.save();
  ctx.fillStyle = 'rgba(2,6,12,0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (game.state === 'title') {
    title(ctx, w, h, game);
  } else if (game.state === 'gameover') {
    big(ctx, w, h * 0.4, 'GAME OVER', '#ff4060');
    info(ctx, w, h, game, 'クリックでリスタート');
  }
  ctx.restore();
}

function title(ctx, w, h, game) {
  big(ctx, w, h * 0.32, 'MOUTH SHOOTING', '#39f6ff');
  ctx.font = "600 17px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = '#cfe9f0';
  const lines = [
    'マウスを動かして自機を操作',
    '左クリック（長押しで連射）: ショット → ボムゲージが溜まる',
    'ゲージ満タンでボムを1ストック（最大5）',
    '右クリック（長押しで溜め→離す）: ストックを1消費してボム',
    'コンボで早く溜まり、長く生きるほど音が増える',
  ];
  lines.forEach((t, i) => ctx.fillText(t, w / 2, h * 0.48 + i * 28));
  ctx.font = "700 20px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = '#ffd166';
  ctx.fillText('クリックでスタート', w / 2, h * 0.72);
  if (game.highScore > 0) {
    ctx.font = FONT;
    ctx.fillStyle = '#6fb8c8';
    ctx.fillText(`HI SCORE ${Math.floor(game.highScore)}`, w / 2, h * 0.8);
  }
}

function big(ctx, w, y, text, color) {
  ctx.font = "800 52px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.fillText(text, w / 2, y);
  ctx.shadowBlur = 0;
}

function info(ctx, w, h, game, prompt) {
  ctx.font = "700 22px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = '#aef9ff';
  ctx.fillText(`SCORE ${Math.floor(game.score)}`, w / 2, h * 0.52);
  ctx.fillStyle = '#6fb8c8';
  ctx.font = FONT;
  ctx.fillText(`HI ${Math.floor(game.highScore)}`, w / 2, h * 0.58);
  ctx.font = "700 20px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = '#ffd166';
  ctx.fillText(prompt, w / 2, h * 0.7);
}
