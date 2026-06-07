// ネオン描画ヘルパ。黒背景に発光（shadowBlur）で図形を描く。
function glow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

export function neonCircle(ctx, x, y, r, color, blur = 16, fill = false) {
  ctx.save();
  glow(ctx, color, blur);
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.stroke();
  ctx.restore();
}

// 正多角形（敵に使用）。rot はラジアン。
export function neonPoly(ctx, x, y, r, sides, rot, color, blur = 16) {
  ctx.save();
  glow(ctx, color, blur);
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

// 自機（進行方向を向く三角）。
export function neonTriangle(ctx, x, y, r, angle, color, blur = 18) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  glow(ctx, color, blur);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = color;
  ctx.fillStyle = 'rgba(10,20,30,0.6)';
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(-r * 0.7, r * 0.7);
  ctx.lineTo(-r * 0.7, -r * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// 衝撃波の輪。
export function neonRing(ctx, x, y, r, width, color, alpha = 1) {
  if (r <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, color, 28);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function fillDot(ctx, x, y, r, color, blur = 10) {
  ctx.save();
  glow(ctx, color, blur);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
