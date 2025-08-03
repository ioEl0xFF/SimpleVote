# 開発スクリプト説明

## プリコンパイル対応スクリプト

Next.js の開発環境で、ページアクセス時のコンパイル待機を解決するための複数のスクリプトを用意しています。

### 利用可能なスクリプト

#### 1. `npm run dev` (標準)

通常の Next.js 開発サーバーです。ページにアクセスするとその都度コンパイルが実行されます。

```bash
npm run dev
```

#### 2. `npm run dev:warm` (推奨) 🌟

開発サーバーを起動し、自動的にすべての主要ページをプリコンパイルします。

```bash
npm run dev:warm
```

**処理内容:**

1. Next.js 開発サーバーを起動
2. サーバーが準備完了するまで待機
3. すべての主要ページに自動アクセスしてプリコンパイル
4. ブラウザアクセス時に即座にページが表示される

#### 3. `npm run dev:precompiled`

本番環境と同じ最適化されたビルドを起動します。

```bash
npm run dev:precompiled
```

**特徴:**

-   完全な本番ビルド後にサーバー起動
-   HMR（ホットリロード）は利用不可
-   最も高速なページ表示

#### 4. `npm run dev:optimized`

Turbopack（実験的機能）を使用した高速開発サーバーです。

```bash
npm run dev:optimized
```

#### 5. `npm run warm-pages`

既に起動中の開発サーバーに対してページのウォームアップのみを実行します。

```bash
# 別ターミナルで開発サーバーを起動
npm run dev

# 別ターミナルでウォームアップを実行
npm run warm-pages
```

### プリコンパイル対象ページ

現在、以下のページが自動的にプリコンパイルされます：

-   `/` - ホームページ
-   `/create` - 投票作成ページ
-   `/simple/1` - シンプル投票ページ
-   `/weighted/1` - 重み付き投票ページ
-   `/dynamic/1` - 動的投票ページ
-   `/test` - テストページ

### ページリストのカスタマイズ

`scripts/warm-up-pages.js`の`PAGES_TO_WARM`配列を編集することで、プリコンパイル対象ページを変更できます：

```javascript
const PAGES_TO_WARM = [
    '/',
    '/create',
    '/your-custom-page',
    // 他のページを追加
];
```

### パフォーマンス最適化設定

`next.config.ts`に以下の最適化設定を追加済みです：

-   **webpackBuildWorker**: ビルドワーカーによるコンパイル高速化
-   **optimisticClientCache**: クライアントキャッシュ最適化
-   **並列コンパイル**: CPU コア数に基づく並列処理
-   **ファイルシステムキャッシュ**: 開発環境でのキャッシュ最適化
-   **HMR 最適化**: ホットリロードの応答性向上

### 推奨使用方法

#### 日常開発では

```bash
npm run dev:warm
```

#### 本番環境テストでは

```bash
npm run dev:precompiled
```

#### CI/CD やテストでは

```bash
npm run dev:optimized
```

### トラブルシューティング

#### ウォームアップが失敗する場合

1. サーバーのポート（3000）が利用可能か確認
2. Node.js のバージョンが 18 以上か確認
3. 依存関係が正しくインストールされているか確認

#### ページが見つからないエラー

`scripts/warm-up-pages.js`のページリストから存在しないページを削除してください。

#### メモリ不足エラー

`next.config.ts`の`cpus`設定を調整してください：

```typescript
cpus: Math.max(1, os.cpus().length - 2), // より控えめな設定
```

### 注意事項

-   ウォームアップは開発環境でのみ有効です
-   大量のページがある場合、ウォームアップに時間がかかる場合があります
-   本番環境では通常の`npm run build && npm start`を使用してください
