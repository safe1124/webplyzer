# Webplyzer ブランチ運用ガイド

## 基本ブランチ
- `main`: 本番相当の安定ブランチ。保護設定により PR 経由のマージのみ許可。
- リリース専用ブランチは未運用。必要時に本ファイルへ追記する。

## 作業ブランチ命名規則
```
<type>/<short-description>
```
- 使用タイプ: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
- 例: `feat/language-picker`, `fix/zip-order`, `refactor/upload-flow`

## 標準フロー
1. 最新化: `git checkout main && git pull --ff-only origin main`
2. ブランチ作成: `git checkout -b <type>/<topic>`
3. 開発: `npm install`（初回のみ）→ `npm run dev` で Next.js を起動しつつ実装
4. 手動テスト（最低限）
   - 単一画像の WebP 変換が成功し、ダウンロードできる
   - 複数画像をドラッグで並べ替えてから変換し、ZIP 内の順序が UI と一致する
   - 未対応拡張子（例: `.gif`）でエラー通知が表示される
   - ロケール切替（日本語/英語/韓国語）が反映される
5. 差分を `git add` → コミット → `git push`。PR 作成時はチェックリストを記載

## コミットメッセージ規約
- フォーマット: `<type>: <summary>`（例: `feat: add drag handle animations`）
- 本文が必要な場合は背景・実装・テスト結果を箇条書きで追記
- 一貫性確保のため、複数コミットが必要な大規模変更でも prefix を揃える

## プルリクエスト運用
- タイトルはコミット同様 `<type>: <summary>`
- 説明テンプレート例:
  ```markdown
  ## 概要
  - 変更点1
  - 変更点2

  ## テスト
  - [ ] npm run lint
  - [ ] npm run build
  - [ ] 単一画像変換を確認
  - [ ] 複数画像+並べ替え -> ZIP 順序を確認
  - [ ] 言語切替 (JA/EN/KO) を確認
  ```
- UI 更新時はスクリーンショット or 動画を添付。翻訳変更時は確認済みロケールを明記。

## マージとクリーンアップ
- レビュー承認後、`git pull --ff-only origin main` で最新化し `git rebase main` で履歴整理
- `main` へマージ後はリモート・ローカルの作業ブランチを削除
- Vercel での検証が必要な場合は `vercel dev` または Preview URL の結果を PR に記載

## 運用メモ
- `sharp` 利用のため API ルートは Node runtime に固定。エッジ化の提案が出た場合は技術検証が必要。
- 依存追加後は `npm run lint` と `npm run build` をローカルで実行し、CI と同条件で確認。
- canary 依存の更新は Breaking 変更が混在する可能性があるため、`pnpm patch` 等でバージョンを固定し、`docs/specs/spec.md` に影響を記録する。
- Next.js 15 は Node.js 18.18 以上が必須。ローカルで lint/build を実行する前に `nvm use` などでバージョンを揃える。
