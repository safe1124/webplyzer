# Webplyzer 要件定義書

## 1. プロダクト概要
Webplyzer は Next.js 15（App Router + TypeScript）で構築された WebP 変換ツールです。ユーザーは JPG/JPEG/PNG ファイルを最大 25 件まとめてアップロードし、ドラッグ&ドロップで順序を調整したうえで WebP 形式へ変換できます。サーバーサイドで `sharp` を用いた高速変換を行い、単一ファイルは直接、複数ファイルは ZIP でダウンロードできます。

## 2. 提供価値
- **運用効率化**: 大量画像の WebP 化・連番リネーム・一括ダウンロードを 1 画面で完結。
- **品質と安定性**: Node ランタイムで `sharp` を利用し、アルファチャンネル保持・品質 90 の安定した変換を提供。
- **グローバルチーム対応**: 日本語 / 英語 / 韓国語の UI 切り替えを標準サポート。

## 3. 対象ユーザー
- Web・ブログ運用担当者
- EC サイトの画像管理者
- デザイン／制作会社のフロントエンドチーム

## 4. システム構成
- **フレームワーク**: Next.js 15 App Router（`app/` ディレクトリ構成）
- **言語**: TypeScript（strict 設定）
- **UI**: React 18 + Tailwind CSS、ドラッグ&ドロップは `sortablejs`
- **API**: `app/api/convert/route.ts` に実装した Node Runtime API。Web 標準 `Response` でバイナリを返却
- **バンドラー**: Turbopack（開発時 `next dev --turbo`）/ Next.js 標準ビルド（本番 `next build`）
- **画像変換**: `sharp` による WebP 変換（品質 90、`rotate()` で EXIF 補正）
- **ZIP 生成**: クライアント側で `jszip` を動的インポートして生成。サーバー側はフォールバックとして ZIP 返却可能
- **ユーティリティ**: `lib/sanitizeFilename.ts` にファイル名サニタイズ・制約定義。`lib/i18n.ts` にロケール別文言

## 5. 機能要件
### 5.1 アップロード & 並べ替え
- `.jpg`, `.jpeg`, `.png` のみ受け付け、最大 25 件まで保持
- ファイル追加は入力ボタンまたはドラッグ&ドロップで行い、未対応拡張子は即時警告
- `SortableJS` を用いたドラッグ操作でサムネイルカードを並べ替え。削除ボタンで個別除外

### 5.2 ベース名指定
- 初期値は `image`。入力値はクライアント・サーバー双方で `sanitizeFilename` により危険文字排除
- 生成ファイル名は `<base>_<index>.webp`（1 始まり、並び順に依存）

### 5.3 変換処理
- クライアントは各ファイルごとに `POST /api/convert` へ `FormData` を送信（`base_name`, `file_index`, `files`）
- API はバリデーション（拡張子、件数）を行い、`sharp` で WebP 変換→バッファをレスポンス
- 単一ファイル: `Content-Type: image/webp` でバイナリ返却
- 複数ファイル: クライアント側で `jszip` により ZIP 化し、`<base>_webp.zip` としてダウンロード
- エラー時は JSON `{ error: "<code>" }` を返し、フロント側でロケールに応じたメッセージを表示

### 5.4 進捗 & メッセージ
- 変換中は進捗バーと `(現在/総数)` を表示し、キャンセルは不可
- 成功時・失敗時のフィードバックをカード下部に表示。3 か国語に対応

### 5.5 多言語対応
- ロケール切替 UI を備え、選択状態を `useState` で保持
- 文言マッピングは `lib/i18n.ts` にて定義。未翻訳キーが増えた場合は全言語分追加する
- 初回ロード時は `navigator.language` から最適なロケールを推定

## 6. 制約・バリデーション
- `MAX_FILES = 25`。超過時は `too_many_files` エラー
- 危険文字（`<>:"/\|?*` など）はファイル名から除去。空文字は `image`
- フロントでは未対応拡張子を追加しない。サーバーでも拡張子を最終チェックし、全件不適合なら `no_valid_files`
- 想定最大リクエストサイズは 100MB（各環境でリバースプロキシ等の制限に留意）

## 7. 非機能要件
- **パフォーマンス**: 変換は同期処理。大量アクセス時は Vercel の Serverless Functions（Node runtime）を水平スケールで処理
- **セキュリティ**: 拡張子チェック・サニタイズ済みファイル名でディレクトリトラバーサルを抑止。アップロードファイルはメモリ上で扱い、永続保存しない
- **安定運用**: エラー発生時もステータスコード 400/500 を返却し、クライアント通知
- **アクセシビリティ**: 主要ボタンはキーボード操作対応。進捗文言はスクリーンリーダーで読めるようテキスト表示

## 8. 運用・デプロイ
- ローカル開発は `npm run dev` で `http://localhost:3000` を起動
- ビルド/デプロイは `npm run build` → `npm run start`。Vercel では `npm run build` が自動実行され、Node ランタイムで API が動作
- canary リリースを利用しているため、依存アップデート時は CI で `npm install` → `npm run lint` → `npm run build` を必ず回す
- Next.js 15 canary は Node.js 18.18 以上が必須。`.nvmrc` を利用しローカル環境のバージョン差異を防ぐ。

## 9. 動画変換機能（WebM変換）

### 9.1 概要
MP4, MOV, AVI, MKV などの動画ファイルを WebM（VP9/AV1）形式に変換する機能を提供します。ブラウザ内変換（WASM版FFmpeg）により、サーバー負荷を軽減しつつ、高効率コーデックを活用した圧縮を実現します。

### 9.2 提供価値
- **ファイルサイズ削減**: VP9コーデックにより、H.264比で30-50%のファイルサイズ削減を実現
- **ブラウザ互換性**: 最新ブラウザ（Chrome, Firefox, Edge）で広くサポートされるWebM形式を出力
- **高速変換**: サーバーサイドのネイティブFFmpegを使用し、ブラウザ内変換より高速
- **モバイル最適化**: 低帯域環境でも高速な動画読み込みを実現

### 9.3 システム構成
- **変換エンジン**: サーバーサイドでfluent-ffmpegを使用
- **対応コーデック**:
  - 映像: VP9 (libvpx-vp9)
  - 音声: Opus（128kbps）
- **UI**: 画像変換機能と同様のデザインパターン、紫/ピンクのカラーテーマ
- **ルーティング**: `/video` (UI), `/api/convert-video` (変換API)
- **依存関係**: fluent-ffmpeg (サーバーサイドのみ)
- **実行環境**: Node.js runtime (Vercel Serverless Functions)

### 9.4 機能要件

#### 9.4.1 アップロード
- 対応形式: MP4, MOV, AVI, MKV, WebM, M4V, FLV, WMV, MPEG, MPG
- 最大ファイル数: 5件
- 最大ファイルサイズ: 200MB/ファイル
- ドラッグ&ドロップまたはファイル選択ダイアログでアップロード

#### 9.4.2 変換オプション
- **コーデック**: VP9固定（FFmpeg.js v0.11の制約）
- **ビットレート設定**: 500kbps（低）/ 1Mbps（中）/ 2Mbps（高）/ 4Mbps（最高）
- **ベースファイル名**: 変換後のファイル名プレフィックス（デフォルト: `video`）

#### 9.4.3 変換処理
- クライアントからサーバーAPIに動画ファイルを送信
- サーバーサイドでfluent-ffmpegを使用してWebMに変換
- 変換は順次処理で実行（1ファイルずつ）
- 進捗バー表示（現在/総数）
- 単一ファイル: WebMファイルを直接ダウンロード
- 複数ファイル: ZIP形式で一括ダウンロード

#### 9.4.4 エラーハンドリング
- ファイルサイズ超過警告
- 未対応形式の検出とフィードバック
- 変換失敗時のエラーメッセージ表示
- サーバータイムアウト時のエラー通知

### 9.5 制約・バリデーション
- `MAX_VIDEO_FILES = 5`: 変換に時間がかかるため、画像変換より少ない制限
- `MAX_VIDEO_SIZE = 200MB`: サーバーメモリとタイムアウトを考慮
- `ALLOWED_VIDEO_EXTENSIONS`: MP4, MOV, AVI, MKV, WebM, M4V, FLV, WMV, MPEG, MPG
- サーバーサイドタイムアウト: 300秒（5分）

### 9.6 技術的詳細
- **FFmpegコマンド**:
  ```bash
  ffmpeg -i input.mp4 -f webm -c:v libvpx-vp9 -b:v 1M -c:a libopus -b:a 128k output.webm
  ```
- **API**: `/api/convert-video` (POST)
  - Request: FormData (file, bitrate, baseName, fileIndex)
  - Response: Binary WebM file
- **ライブラリ**: fluent-ffmpeg (Node.js FFmpeg wrapper)
- **ストリーム処理**: ReadableStreamでメモリ効率的に処理
- **Next.js設定**: Node.js runtime必須、maxDuration=300秒

### 9.7 パフォーマンス考慮事項
- 100MB動画のVP9変換: 約15-45秒（サーバー性能に依存）
- ネイティブFFmpegを使用するため、ブラウザ内変換より高速
- Vercel Serverless Functionsの実行時間制限（Pro: 300秒）を考慮
- 大容量動画（>200MB）は変換タイムアウトの可能性

### 9.8 多言語対応
`lib/i18n.ts` に以下のキーを追加済み:
- `video_title`, `video_subtitle`, `video_filename_label`, `video_filename_placeholder`
- `video_upload_label`, `video_convert_button`, `video_converting`
- `video_success_message`, `video_max_files`, `video_unsupported_file`, `video_file_too_large`
- `video_options_title`, `video_codec_label`, `video_bitrate_label`
- `loading_ffmpeg`, `ffmpeg_ready`, `ffmpeg_load_error`

### 9.9 Vercel デプロイ時の注意事項
- **FFmpegインストール**: Vercelビルド時にFFmpegバイナリが自動的にインストールされる
- **タイムアウト設定**: `maxDuration=300`（Free tier: 10秒、Pro tier: 300秒）
- **メモリ制限**: Serverless Functionsのメモリ制限に注意（最大1024MB）
- **代替案**: 大容量動画の場合、AWS Lambda + EFS や専用サーバーの検討が必要

### 9.10 今後の改善案
- 動画プレビュー機能（変換前後の比較）
- 解像度変更オプション（1080p → 720pなど）
- 変換キャンセル機能
- 変換進捗の詳細表示（処理中のフレーム数など）
- Queue システム導入（Redis + Bull）で大量変換対応

## 10. 今後の拡張案
- 画像品質・画質調整スライダーの追加（`sharp` オプション expose）
- フロント側でのバリデーション強化（ファイルサイズ合計、同名ファイルへの警告）
- `next-intl` 等を用いたルーティング連動の国際化
- Next.js Server Actions による一括アップロード → サーバー ZIP 生成フローへの移行
- PDF圧縮機能の追加
