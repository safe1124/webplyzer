# Webplyzer

#ビデオ変換機能も追加したが、くそバグが多すぎて非活性にしておいた。

Next.js 15 (App Router) 製のバッチ WebP 変換ツールです。複数の JPG/JPEG/PNG ファイルを任意順に並べ替えてアップロードし、WebP へ変換・連番リネーム・ZIP ダウンロードを行えます。UI は Tailwind CSS、ドラッグ&ドロップは SortableJS、開発時には Turbopack を利用しています。

## 主な機能
- **WebP 変換**: `sharp` を用いたサーバーサイド変換（品質 90・アルファ保持）
- **一括処理**: 最大 25 ファイルまでまとめて変換し、必要に応じて ZIP を生成
- **ドラッグ並べ替え**: サムネイルカードをドラッグして処理順を変更
- **多言語 UI**: 日本語 / 英語 / 韓国語を切り替え可能
- **即時ダウンロード**: 単一ファイルなら即時ダウンロード、複数は ZIP にまとめて配布

## セットアップ
```bash
git clone https://github.com/safe1124/webplyzer.git
cd webplyzer

# 依存パッケージをインストール
npm install

# 開発サーバー起動
npm run dev
```

ブラウザで `http://localhost:3000` を開くとアプリケーションが表示されます。

> **Note**: Next.js 15 は canary リリースを使用しています。最新の `next@canary` / `react@canary` / `react-dom@canary` を利用できる Node.js 18.18+ 環境で実行してください。

## スクリプト
| コマンド | 説明 |
|---------|------|
| `npm run dev` | Turbopack で開発サーバーを起動（高速 HMR 対応） |
| `npm run build` | Next.js 標準ビルド（SWC ベース）を生成 |
| `npm run start` | 本番ビルドを起動 |
| `npm run lint` | ESLint（`next lint`）を実行 |

## ディレクトリ構成
```
app/                 # App Router ルート・API
  api/convert/       # 画像変換 API (Node runtime)
  page.tsx           # メイン UI
  layout.tsx         # レイアウト
  globals.css        # Tailwind グローバルスタイル
components/          # UI コンポーネント（必要に応じて拡張）
lib/                 # ユーティリティ（サニタイズ、翻訳定義など）
public/              # 静的アセット
docs/                # プロジェクトドキュメント
```

## 技術スタック
- **フレームワーク**: Next.js 15 App Router + TypeScript
- **スタイリング**: Tailwind CSS
- **ドラッグ&ドロップ**: `sortablejs`
- **画像変換**: `sharp`
- **ZIP 生成**: `jszip`
- **バンドラー**: Turbopack (開発) / Next.js Build Pipeline (本番)

## ライセンス
MIT License
