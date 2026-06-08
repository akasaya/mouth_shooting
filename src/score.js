// スコア関連の純粋関数（DOM/Canvas 非依存・テスト対象）。

const toScore = (n) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

// スコアが prevScore → curScore に増えたとき、interval ごとのエクステンド回数を返す。
// 1フレームで複数閾値を跨いだ場合（大型ボムの大量加点）も正しく数える。
export function lifeExtends(prevScore, curScore, interval) {
  if (!(interval > 0)) return 0;
  const prev = toScore(prevScore);
  const cur = toScore(curScore);
  if (cur <= prev) return 0;
  return Math.floor(cur / interval) - Math.floor(prev / interval);
}
