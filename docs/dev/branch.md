# Webplyzer ブランチ運用ガイド

## 基本ブランチ
- `main`: 本番相当の安定ブランチ。GitHub 上では保護対象とし、プルリクエスト経由のマージのみ許可する。
- リリース専用ブランチは未設定。必要になった場合は運用開始前に本ファイルへ追記する。

## 作業ブランチ命名規則
```
<type>/<short-description>
```
- 使用タイプ: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
- 例: `feat/reorder-support`, `fix/zip-cleanup`, `docs/update-spec`

## 作業フロー
1. 最新化: `git checkout main && git pull --ff-only origin main`
2. ブランチ作成: `git checkout -b <type>/<topic>`
3. 開発: 依存を整え、`python app.py` で動作を確認しながら実装する。
4. 手動テスト（最低限実施すること）
   - 単一ファイル変換が成功し、ダウンロードファイルが `.webp` 形式で保存される。
   - 複数ファイルを並べ替えて変換し、ZIP に正しい順序で格納される。
   - 言語切り替え（日本語/英語/韓国語）が UI 上で反映される。
5. 変更をステージング (`git add`) し、規約に沿ったコミットメッセージで記録、`git push` する。

## コミットメッセージ規約
- 形式: `<type>: <summary>`（例: `feat: add server-side cleanup for temp files`）
- `type` は `feat` / `fix` / `refactor` / `docs` / `chore` / `test` を推奨。
- サマリは 50 文字以内を目安に命令形で記述する。
- 詳細が必要な場合は本文に背景、実装概要、テスト結果を箇条書きで追記する。

## プルリクエスト運用
- タイトルはコミット同様に `<type>: <summary>`。
- 説明テンプレート例:
  ```markdown
  ## 概要
  - 変更点1
  - 変更点2

  ## テスト
  - [ ] FLASK_DEBUG=1 python app.py を起動
  - [ ] 単一画像変換を手動確認
  - [ ] 複数画像+並べ替え -> ZIP の順序確認
  - [ ] 許可外拡張子のアップロードでエラー表示を確認
  ```
- UI や翻訳を更新した場合はスクリーンショット／確認手順を添付するとレビューが円滑になる。

## マージとクリーンアップ
- 承認後は `git pull --ff-only origin main` で最新化し、`git rebase main` で履歴を整えてからマージする。
- `main` に取り込んだら、リモート・ローカル双方の作業ブランチを削除する。
- Vercel での稼働確認が必要な変更は `vercel dev` の結果を PR 説明欄に記録する。

## 運用上のヒント
- `/tmp` に生成される一時ファイルはレスポンス終了時に削除されるが、ローカルで残る場合は手動削除のうえ再実行すると解消しやすい。
- 翻訳ファイルを変更した場合は `pybabel compile -d translations` を忘れずに実行し、PR のテスト項目にも記載する。
- 長期作業ブランチは定期的に `main` を取り込み、コンフリクトの早期発見・解消を心がける。
