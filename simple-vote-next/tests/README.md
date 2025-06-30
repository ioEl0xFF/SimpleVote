# SimpleVote Next.js アプリケーション テスト

このディレクトリには、SimpleVoteアプリケーションのPlaywrightテストが含まれています。

## テストファイル構成

### 基本UI・ナビゲーションテスト
- `basic-ui-navigation.spec.ts` - 基本的なUI・ナビゲーションテスト
- `basic-ui-navigation-with-helpers.spec.ts` - ヘルパー関数を使用した実用的なテスト

### ヘルパー関数
- `helpers/wallet-helper.ts` - ウォレット接続状態のシミュレーション用ヘルパー

## テスト実行方法

### 1. 依存関係のインストール
```bash
cd simple-vote-next
npm install
```

### 2. Playwrightのインストール
```bash
npx playwright install
```

### 3. 開発サーバーの起動
```bash
npm run dev
```

### 4. テストの実行

#### 全テストの実行
```bash
npx playwright test
```

#### 特定のテストファイルの実行
```bash
npx playwright test basic-ui-navigation.spec.ts
npx playwright test basic-ui-navigation-with-helpers.spec.ts
```

#### 特定のブラウザでの実行
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

#### ヘッドレスモードでの実行
```bash
npx playwright test --headed
```

#### デバッグモードでの実行
```bash
npx playwright test --debug
```

### 5. テストレポートの確認
```bash
npx playwright show-report
```

## テスト項目

### 1. 基本UI・ナビゲーションテスト

#### 1.1 ホームページ（/）
- ページタイトル「SimpleVote」の表示確認
- ウォレット未接続時の初期状態確認
- ウォレット接続後の状態変化確認
- ウォレット切断後の状態変化確認
- 投票データの表示確認
- 投票項目クリック時の遷移確認

#### 1.2 ページヘッダー・ナビゲーション
- ページタイトルの表示確認
- 新規作成ページへの遷移確認
- ホームボタンの機能確認

#### 1.3 ローディング状態
- データ読み込み中の表示確認
- 読み込み完了後の表示確認

#### 1.4 エラーハンドリング
- 無効なPoll IDでのアクセス確認
- 無効なURLでのアクセス確認

### 2. レスポンシブデザイン
- デスクトップ表示（1920x1080）
- タブレット表示（768x1024）
- モバイル表示（375x667）

### 3. アクセシビリティ
- HTMLセマンティクスの確認
- キーボードナビゲーションの確認
- スクリーンリーダー対応の確認

### 4. パフォーマンス
- ページの初期読み込み時間
- メインコンテンツの表示時間
- ウォレット接続後のレスポンス時間

## ヘルパー関数の使用方法

### WalletHelper
ウォレット接続状態をシミュレートするためのヘルパー関数です。

```typescript
import { WalletHelper } from './helpers/wallet-helper';

const walletHelper = new WalletHelper(page);

// ウォレット接続をシミュレート
await walletHelper.simulateWalletConnection();

// ウォレット切断をシミュレート
await walletHelper.simulateWalletDisconnection();

// 接続状態を確認
const isConnected = await walletHelper.isWalletConnected();
```

### PollHelper
投票データをシミュレートするためのヘルパー関数です。

```typescript
import { PollHelper } from './helpers/wallet-helper';

const pollHelper = new PollHelper(page);

// テスト用の投票データをシミュレート
await pollHelper.simulatePollData([
    {
        id: 1,
        type: 'dynamic',
        topic: 'テスト投票1',
        choices: [
            { name: '選択肢1', votes: 5 },
            { name: '選択肢2', votes: 3 }
        ]
    }
]);

// 投票項目をクリック
await pollHelper.clickPollItem(1);
```

### LoadingHelper
ローディング状態をシミュレートするためのヘルパー関数です。

```typescript
import { LoadingHelper } from './helpers/wallet-helper';

const loadingHelper = new LoadingHelper(page);

// ローディング状態をシミュレート
await loadingHelper.simulateLoading();

// ローディング完了をシミュレート
await loadingHelper.simulateLoadingComplete();
```

## 注意事項

1. **テスト環境**: テストはローカル開発サーバー（http://localhost:3000）で実行されます
2. **ウォレット接続**: 実際のMetaMask接続ではなく、シミュレーションを使用しています
3. **データベース**: テスト用のモックデータを使用しています
4. **非同期処理**: ブロックチェーン操作の非同期性を考慮したテスト設計になっています

## トラブルシューティング

### テストが失敗する場合

1. **開発サーバーが起動しているか確認**
   ```bash
   npm run dev
   ```

2. **Playwrightがインストールされているか確認**
   ```bash
   npx playwright install
   ```

3. **ポート3000が使用可能か確認**
   ```bash
   lsof -i :3000
   ```

4. **テストログを確認**
   ```bash
   npx playwright test --reporter=list
   ```

### よくある問題

- **タイムアウトエラー**: ネットワークが遅い場合、タイムアウト値を調整してください
- **要素が見つからない**: セレクターが正しいか確認してください
- **ブラウザの互換性**: 異なるブラウザでの動作を確認してください

## 今後の拡張予定

- [ ] ウォレット接続テスト
- [ ] 投票作成テスト
- [ ] 各投票タイプのテスト
- [ ] エラーハンドリングテスト
- [ ] セキュリティテスト
- [ ] パフォーマンステスト