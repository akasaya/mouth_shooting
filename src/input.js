// マウス入力。座標は CSS ピクセル（= ワールド座標）で保持する。
// 左ボタン押下保持(left) / 右ボタン長押し(right) を追跡する。
export function createInput(canvas) {
  const input = {
    x: canvas.clientWidth / 2,
    y: canvas.clientHeight / 2,
    left: false,
    right: false,
    anyDown: false, // 初回操作判定（AudioContext resume 用）
  };

  function setPos(e) {
    const rect = canvas.getBoundingClientRect();
    input.x = e.clientX - rect.left;
    input.y = e.clientY - rect.top;
  }

  canvas.addEventListener('mousemove', setPos);

  canvas.addEventListener('mousedown', (e) => {
    setPos(e);
    if (e.button === 0) input.left = true;
    if (e.button === 2) input.right = true;
    input.anyDown = true;
  });

  // mouseup は canvas 外で離しても拾えるよう window に張る。
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.left = false;
    if (e.button === 2) input.right = false;
  });

  // 右クリックのコンテキストメニューを抑止（ボム操作のため）。
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // カーソルが外れたら押下状態をリセット（押しっぱなし誤検知の防止）。
  canvas.addEventListener('mouseleave', () => {
    input.left = false;
    input.right = false;
  });

  return input;
}
