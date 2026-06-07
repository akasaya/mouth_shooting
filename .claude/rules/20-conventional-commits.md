# Conventional Commits Rule

このリポジトリのコミットメッセージは Conventional Commits に従います。

## Format

```text
<type>(<scope>): <description>
```

- scope は任意です。

```text
<type>: <description>
```
も許可します。

## Allowed types
- feat: ユーザー（プレイヤー）向け機能の追加
- fix: バグ修正
- docs: ドキュメントのみの変更
- test: テストの追加・修正
- refactor: 振る舞いを変えない内部構造の変更
- perf: パフォーマンス改善（フレームレート・描画負荷など）
- style: フォーマット、空白、命名などの変更
- build: ビルド・依存・パッケージ管理の変更
- ci: GitHub Actions など CI/CD 設定の変更
- chore: その他の雑務

## Allowed scopes
推奨 scope（ゲームの構成要素に対応）:
- engine    （ゲームループ・状態機械・全体制御）
- input     （マウス入力・カーソル追従）
- player    （自機の挙動・ショット）
- bullet    （自機弾・敵弾）
- enemy     （敵・出現・突進・ボス）
- bomb      （チャージ・衝撃波）
- combo     （コンボ計数・報酬）
- stage     （ステージ・難易度カーブ）
- audio     （効果音・動的音楽）
- render    （描画・ネオン表現・粒子・HUD）
- ci        （GitHub Actions / CI）
- docs      （README・ドキュメント）

### Example
```
feat(bomb): add charge-up shockwave with radius scaling
feat(combo): shorten bomb charge time as combo grows
feat(audio): add dynamic music layers gated by combo
test(collision): add circle-overlap boundary cases
fix(combo): reset combo when decay window elapses
perf(render): batch neon glow draws
ci: run node --test on pull requests
docs(readme): add controls and disclaimer
chore: initialize project files
```

## Breaking changes
- 破壊的変更は `!` または footer を使います。
```text
feat(stage)!: change stage definition schema
```
または
```text
feat(stage): change stage definition schema
BREAKING CHANGE: waves are now defined as an array of spawn groups.
```

## Rules for agents
- コミットメッセージを提案するときは、このファイルに従う。
- 1 コミットは 1 目的にする。複数の関心事が混ざる場合はコミットを分ける提案をする。
- description は英語の命令形または簡潔な現在形にする。
- 末尾にピリオドを付けない。
- 迷ったら chore ではなく、変更の目的に近い type を選ぶ。
