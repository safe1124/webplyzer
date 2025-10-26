# Repository Guidelines

## Project Structure & Module Organization
- `app/` は Next.js 15 App Router のエントリポイント。`page.tsx` にメイン UI、`api/convert/route.ts` に WebP 変換 API を配置しています。
- `lib/` には `sanitizeFilename.ts` や翻訳定義などの共有ユーティリティを集約します。ブラウザ・サーバー双方で実行される可能性があるため副作用のない実装を徹底してください。
- `components/` は再利用可能な UI 部品用。規模拡大時に `app/page.tsx` から抽出し、`/components` へ移します。
- Tailwind グローバルスタイルは `app/globals.css` にあり、テーマカラーやスクロールバーのスタイルを定義済みです。
- ドキュメントの SoT は `docs/`。更新や追記時は `docs/index.md` のインデックスも必ずメンテナンスします。

## Build, Test, and Development Commands
- 依存解決と開発サーバー起動（Turbopack 使用）:
```bash
npm install
npm run dev   # next dev --turbo
```
- 本番ビルド/起動: `npm run build && npm run start`（ビルドは Next.js 標準パイプライン）
- Lint チェック: `npm run lint`
- Next.js 15 は canary を使用しています。Node.js 18.18+ での動作確認を推奨します。

## Coding Style & Naming Conventions
- TypeScript は strict モード。エイリアス `@/*` を通じてルート相対 import を利用してください。
- React コンポーネントは関数コンポーネント・hooks ベース。副作用には `useEffect`、非同期処理には `async/await` を用います。
- Tailwind クラスはロジックと分離し、複雑な組み合わせは `clsx` で整理します。トークンは `tailwind.config.ts` の `brand` カラーを再利用。
- API ルートは Node runtime (`export const runtime = "nodejs"`) を明示し、バイナリレスポンスには Web 標準 `Response` を使用します。

## Testing Guidelines
- 現状は手動テストを必須とします。最低限以下を確認してください:
  - 単一ファイル変換 → `.webp` がダウンロードされるか
  - 複数ファイル + 並べ替え → ZIP の順序が UI と一致するか
  - 拡張子バリデーション → 非対応形式でエラーメッセージが表示されるか
  - ロケール切替（日本語/英語/韓国語）で UI 文言が更新されるか
- 自動テスト導入時は Playwright でエンドツーエンドを、Jest + React Testing Library で UI ロジックをカバーする方針です。

## Commit & Pull Request Guidelines
- コミットメッセージは `<type>: <summary>`（例: `feat: add quality selector`）。`type` は `feat`/`fix`/`refactor`/`docs`/`chore`/`test`。
- PR 説明には以下を推奨:
  - 変更概要（箇条書き）
  - 手動テスト結果チェックリスト（上記最低限テストを引用）
  - UI 変更時はスクリーンショットまたは GIF を添付
  - 翻訳を更新した場合は査読を依頼し、確認済ロケールを明記

## Deployment Notes
- Vercel でのデプロイを想定。`package.json` の `build`/`start` スクリプトを利用し、Next.js 標準ビルドアーティファクトを Node runtime で提供します。
- `sharp` はネイティブバイナリを含むため、Vercel のビルドステップで自動的にインストールされます。ローカル CI では `npm ci` と `npm run build` の組み合わせで検証してください。
- Edge Runtime では `sharp` が動作しないため、API ルートに `export const runtime = "nodejs"` を必ず付与します。

## Documentation & Knowledge Base
- ルールや知見は `docs/` に集約し、更新時は `docs/index.md` に反映する。
- ブランチ運用・レビュー手順は `docs/dev/branch.md`、要件定義は `docs/specs/spec.md` を参照。
- ドキュメント追加時のコミットは `doc:` プレフィックスを推奨。
