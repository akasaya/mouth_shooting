# Development Flow

このプロジェクト（ブラウザゲーム）の開発フローを定義します。
個人ゲームなので軽量に保ち、過剰な手続きは課しません。

---

## フロー全体像

```
Issue 作成（やりたいこと・完了条件を書く）
    ↓
ブランチ作成（feature/fix/refactor）
    ↓
実装（純粋ロジックは TDD: Red→Green→Refactor）
    ↓
ローカルチェック（node --test）＋ ブラウザで手触り確認
    ↓
commit → PR 作成
    ↓
CI（GitHub Actions: node --test）
    ↓
main merge → GitHub Pages に反映 → ブラウザで確認 → Issue へループ
```

---

## スキル・コマンド対応表

| フェーズ | スキル / コマンド | 用途 |
|---------|----------------|------|
| 企画・アイデア整理 | `superpowers:brainstorming` | 機能アイデアを設計に落とし込む |
| TDD サポート | `superpowers:test-driven-development` | 純粋ロジックの Red→Green→Refactor |
| 手触り確認 | `webapp-testing`(Playwright) / `run` | ブラウザ起動・スクリーンショットで目視確認 |
| ローカルレビュー | `/review`（`code-review:code-review`） | PR 作成前のセルフレビュー |
| コミット | `commit-commands:commit` | Conventional Commits に沿ったコミット生成 |
| PR 作成 | `commit-commands:commit-push-pr` | コミット〜PR 作成までを一括実行 |
| デプロイ支援 | `cloudflare-pages-deploy` | 静的サイト公開の参考（本番は GitHub Pages） |

### ルール
- フェーズ開始前に該当スキルを確認し、あれば使う。
- kiro/speckit のスペック駆動は**任意**。大きめの機能で設計を固めたいときだけ使う（必須にしない）。

---

## Phase 1: Issue 作成

作業は Issue から始めるのを基本とする（小さな修正は省略可）。
何を・なぜやるか、完了条件（遊んでどうなれば OK か）を書く。

---

## Phase 2: ブランチ作成

```
feature/{issue番号}-{slug}   # 機能追加（新しい敵・ボム挙動など）
fix/{issue番号}-{slug}       # バグ修正
refactor/{issue番号}-{slug}  # 振る舞いを変えない整理
```
例: `feature/3-charge-bomb`, `fix/8-combo-decay-timing`

- `main` に直接コミットしない。1 ブランチ = 1 目的。ブランチ名は kebab-case・英語。

---

## Phase 3: 実装（TDD は純粋ロジックに適用）

```
Red   → 計算ロジック（combo / collision / bomb 半径・倍率）のテストを先に書く
Green → 最小実装で通す
Refactor → テストが通ったまま整理する
```
- 当たり判定・コンボ計数・チャージ→半径などの**純粋関数は TDD で**書く（`30-testing.md`）。
- 描画・入力・音・ゲームループの統合部分は、ブラウザでの手触り確認を中心にする。

---

## Phase 4: ローカルチェック（PR 前）

```bash
node --test          # 純粋ロジックのテスト
python3 -m http.server 8000   # 配信してブラウザで手触り確認
```
- 連射・コンボ・ボム溜め→範囲一掃・難易度上昇・GAME OVER が意図通り動くか目視で確認する。
- テストが失敗した状態で PR を出さない。

---

## Phase 5: ローカルレビュー

PR 作成前に `/review` でセルフレビュー。指摘に対応してからコミットする。

---

## Phase 6: commit & PR 作成

- commit は `20-conventional-commits.md` に従う。1 コミット = 1 目的。
- PR タイトルに type を含め、本文に `Closes #issue番号`。差分は読みやすい粒度に保つ。

---

## Phase 7: CI と公開

- GitHub Actions（`.github/workflows/ci.yml`）が `node --test` を実行。緑でない状態で merge しない。
- main merge 後、GitHub Pages に自動反映。発行 URL をブラウザで開いて確認する（`40-deploy-ci.md`）。
- 気づいた不具合・改善は Issue にして Phase 1 へループ。

---

## コード設計原則

- **関心の分離**: 入力 / 更新 / 描画 / 音 を疎結合に保つ。
- **純粋ロジックを分離**: 当たり判定・コンボ・チャージ計算は DOM/Canvas に依存しない純粋関数にし、テスト可能にする。
- **数値は `config.js` に集約**: 手触り・難易度を一箇所で調整する。
- 可読性・保守性を重視。YAGNI（個人用ゲームに不要な汎用化・フレームワーク導入をしない）。

---

## エージェントへのルール（全フェーズ共通）

- `main` に直接コミットしない。
- 純粋ロジックはテストを先に書く。統合部分はブラウザで確認する。
- ローカルチェックが通らない状態でコミットしない。CI が赤い状態で merge しない。
- `50-agent-safety.md` の制約を全フェーズで遵守する。
