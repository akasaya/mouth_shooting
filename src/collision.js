// 当たり判定の純粋関数群（DOM/Canvas に非依存・テスト対象）。

// 2 つの円が重なる（接触含む）か。
export function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const rr = ar + br;
  return dx * dx + dy * dy <= rr * rr;
}

// 拡大する衝撃波の前面が、半径 pr の対象に到達したか。
// 中心 (cx,cy) から現在半径 currentRadius まで広がった波が、
// 対象の最も近い縁 (dist - pr) を越えたら true。
export function wavefrontReached(cx, cy, currentRadius, px, py, pr) {
  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.hypot(dx, dy);
  return dist - pr <= currentRadius;
}

// 点 (px,py) が矩形 [0,w]x[0,h] の外（margin 余裕付き）に出たか。画面外カリング用。
export function isOutside(px, py, w, h, margin = 40) {
  return px < -margin || py < -margin || px > w + margin || py > h + margin;
}
