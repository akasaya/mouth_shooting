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

  // ライフ（右上にハート風の丸）
  ctx.textAlign = 'right';
  for (let i = 0; i < game.player.lives; i++) {
    ctx.fillStyle = '#ff4060';
    ctx.shadowColor = '#ff4060';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(w - 20 - i * 26, 26, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

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
    '左クリック（長押しで連射）: ショット',
    '右クリック（長押しで溜め→離す）: ボム',
    'コンボを重ねるとボムが早く溜まり、音が増える',
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
