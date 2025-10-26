# Turbopack サポート状況

## 概要

Next.js 15 における Turbopack のサポート状況と制限事項をまとめます。

## 現在のサポート状況（Next.js 15.0.0-canary.57）

### 開発モード: ✅ サポート済み

```bash
npm run dev  # next dev --turbo
```

- `--turbo` フラグで Turbopack を有効化
- Hot Module Replacement (HMR) が高速化
- 安定版として推奨されている

### 本番ビルド: ❌ 未サポート

```bash
npm run build  # next build (Webpack を使用)
```

- **Next.js 15.0.0-canary.57 では `next build --turbo` は未実装**
- `next build --help` を実行しても `--turbo` オプションは表示されない
- 試行すると `error: unknown option '--turbo'` エラーが発生

## 技術的背景

### なぜ開発モードのみサポート？

1. **段階的ロールアウト**: Vercel は Turbopack を段階的に展開している
2. **本番ビルドの複雑性**: 本番ビルドには最適化、Tree Shaking、Code Splitting など複雑な処理が必要
3. **canary の性質**: 実験的機能は開発モードから導入される

### Webpack との比較

| 項目 | Turbopack (dev) | Webpack (build) |
|------|----------------|-----------------|
| 初回起動速度 | 高速 | 中速 |
| HMR速度 | 非常に高速 | 中速 |
| 本番最適化 | N/A | 完全サポート |
| 安定性 | 安定 | 非常に安定 |

## 将来の展望

### Turbopack 本番ビルドの予定

- Next.js 15 の安定版リリース時に本番ビルドサポートが追加される可能性
- より新しい canary バージョンで既に実装されている可能性あり
- 最新情報: [Next.js リリースノート](https://github.com/vercel/next.js/releases)

### 移行時の考慮事項

本番ビルドで Turbopack がサポートされた場合：

1. **package.json の更新**:
   ```json
   "scripts": {
     "build": "next build --turbo"
   }
   ```

2. **検証項目**:
   - ビルド成果物のサイズ比較
   - ランタイムパフォーマンスの確認
   - Edge Case のテスト（画像変換、ZIP生成など）

3. **リスク**:
   - Webpack 特有の設定が動作しない可能性
   - プラグインの互換性問題
   - 本プロジェクトはシンプルな構成のため影響は小さいと予想

## 推奨事項

### 現在（canary.57）

- **開発**: `next dev --turbo` を使用（既に適用済み）
- **本番**: `next build` を使用（Webpack）
- 両者の挙動差異に注意

### 更新時の手順

1. Next.js を新しい canary にアップデート
2. `npx next build --help` で `--turbo` の有無を確認
3. サポートされていれば:
   - `package.json` の `build` スクリプトに `--turbo` を追加
   - 手動テストで全機能を検証
   - このドキュメントを更新

## 参考リンク

- [Next.js Turbopack ドキュメント](https://nextjs.org/docs/app/api-reference/turbopack)
- [Turbopack 公式サイト](https://turbo.build/pack)
- [Next.js 15 リリースノート](https://github.com/vercel/next.js/releases?q=15.0.0)

## 更新履歴

- 2025-10-26: 初版作成（Next.js 15.0.0-canary.57 時点）
