# Deploy & CI Rule

このプロジェクトの公開（デプロイ）と CI を定義します。
静的なブラウザゲームなので、**GitHub Pages にそのまま置くだけ**で公開でき、サーバも有料サービスも不要です。
**AWS（Lambda/CDK/DynamoDB 等）・常時起動サーバ・コンテナは使いません。**

---

## アーキテクチャ全体図

```
ブラウザ（プレイヤー）
    ↓ HTTPS 取得
GitHub Pages（静的配信: index.html / style.css / src/*.js）
    ↑ push で自動反映
GitHub リポジトリ（main ブランチ）
```

ビルド工程なし。バンドラ・トランスパイルなし。`index.html` が `src/main.js` を
`<script type="module">` で読むだけ。サーバ・DB・秘密情報を持たない。

---

## コスト概算

| リソース | 月額目安 |
|---------|---------|
| GitHub Pages（public リポジトリ） | **無料** |
| GitHub Actions（CI、public） | **無料** |
| **合計** | **$0** |

> private リポジトリの GitHub Pages 公開は有料プラン（Pro/Team 等）が必要。
> 無料で公開 URL を出すなら **public リポジトリ**にする。

---

## 1. 公開（GitHub Pages）

1. リポジトリ Settings → Pages → Source を「Deploy from a branch」、ブランチ `main` / フォルダ `/ (root)` に設定。
2. 数十秒後に `https://<user>.github.io/mouth_shooting/` が発行される。
3. main に push するたび自動で再デプロイされる。

- ルート直下に `index.html` を置く（サブディレクトリにしない）。
- 相対パス（`./src/...`）で参照し、Pages のサブパス配信でも壊れないようにする。
- 公開後はブラウザで開き、**初回クリックで音が鳴る**（WebAudio の自動再生制限のため AudioContext を resume）ことを確認する。

---

## 2. CI（テスト）

`.github/workflows/ci.yml` に定義し、push / PR で実行する。

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: node --test
```

- ビルド・lint ツールを増やさない（依存ゼロ方針）。必要十分な `node --test` のみ。
- CI が緑でない状態で main に merge しない。

---

## エージェントへのルール

- AWS・常時起動サーバ・コンテナ・有料ホスティングを提案・使用しない（GitHub Pages で完結）。
- `.github/workflows/` の変更は内容を提示してから行う（全ブランチ・公開に影響）。
- ビルド工程・バンドラ・フレームワークを安易に導入しない（依存ゼロ・ビルド不要を維持）。
- 公開 URL を出すなら public リポジトリ。private にする場合は Pages の制約をユーザーへ伝える。
- 秘密情報を持たない設計を保つ（持つ必要が生じたら設計を見直す）。
