# SimpleVote Next.js Frontend

SimpleVoteアプリケーションのNext.jsフロントエンドです。

## 🚀 開発環境のセットアップ

### 前提条件
- Node.js 18以上
- npm または yarn

### インストール
```bash
npm install
```

### 開発サーバーの起動
```bash
npm run dev
```

アプリケーションは [http://localhost:3000](http://localhost:3000) で起動します。

## 🧪 テスト

### E2Eテスト（Playwright）

#### テストの実行
```bash
# 全テスト実行
npm run test:e2e

# UIモードでテスト実行
npm run test:e2e:ui

# ヘッド付きモードでテスト実行
npm run test:e2e:headed

# デバッグモードでテスト実行
npm run test:e2e:debug

# テストレポートの表示
npm run test:e2e:report
```

#### チェックリスト自動更新機能

SimpleVoteでは、テスト実行結果を自動でチェックリストに反映する機能を提供しています。

```bash
# テスト実行後にチェックリストを自動更新
npm run test:e2e && npm run checklist:update

# チェックリストの統計情報を表示
npm run checklist:stats

# 手動でチェックリスト項目を更新
npm run checklist:manual -- --item "wallet-connection-接続ボタンの表示" --checked true
```

#### チェックリストの使用方法

1. **テスト実装時**: チェックリストの項目に対応するテストを作成
2. **テスト実行**: `npm run test:e2e` でテストを実行
3. **自動更新**: `npm run checklist:update` でチェックリストを更新
4. **進捗確認**: `npm run checklist:stats` で統計情報を確認

#### CI/CD統合

GitHub Actionsでテスト実行後に自動的にチェックリストが更新されます：

- プルリクエスト時にテストが実行される
- テスト結果に基づいてチェックリストが自動更新される
- 進捗状況がPRにコメントされる

## 📁 プロジェクト構造

```
simple-vote-next/
├── app/                    # Next.js App Router
│   ├── page.tsx           # ホームページ
│   ├── create/            # 投票作成ページ
│   ├── simple/            # シンプル投票ページ
│   ├── weighted/          # 重み付き投票ページ
│   └── dynamic/           # 動的投票ページ
├── components/            # React コンポーネント
├── lib/                   # ユーティリティ関数
├── tests/                 # Playwright テスト
│   ├── e2e/              # E2Eテストファイル
│   └── helpers/          # テストヘルパー
├── docs/                  # ドキュメント
│   └── playwright-test-checklist.md  # テストチェックリスト
└── scripts/               # スクリプト
    └── update-checklist.js # チェックリスト更新スクリプト
```

## 🔧 技術スタック

- **フレームワーク**: Next.js 15
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **テスト**: Playwright
- **ブロックチェーン**: Ethers.js
- **ウォレット**: MetaMask対応

## 📊 テストチェックリスト

詳細なテスト項目は [docs/playwright-test-checklist.md](./docs/playwright-test-checklist.md) を参照してください。

### 主要なテスト項目

- ✅ ウォレット接続機能
- ✅ ホームページ（投票一覧）
- ✅ 投票作成ページ
- ✅ シンプル投票ページ
- ✅ 重み付き投票ページ
- ✅ 動的投票ページ
- ✅ レスポンシブデザイン
- ✅ アクセシビリティ
- ✅ ブラウザ互換性

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。
