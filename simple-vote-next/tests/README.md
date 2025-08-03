# SimpleVote テストドキュメント

## 📋 概要

このディレクトリには、SimpleVote アプリケーションの E2E テストが含まれています。Playwright を使用して、ユーザーの実際の操作をシミュレートしたテストを実行します。

## 🧪 テストファイル構成

```
tests/
├── e2e/
│   └── homepage.spec.ts          # ホームページの包括的テスト
├── helpers/
│   └── wallet-mock.ts           # ウォレット接続のモック機能
└── README.md                    # このファイル
```

## 🚀 テスト実行方法

### 前提条件

1. **開発サーバーの起動**

    ```bash
    npm run dev
    ```

2. **Playwright のセットアップ**
    ```bash
    npx playwright install
    ```

### テスト実行コマンド

#### 全テストの実行

```bash
npm run test:e2e
```

#### UI モードでのテスト実行（推奨）

```bash
npm run test:e2e:ui
```

#### ブラウザ表示でのテスト実行

```bash
npm run test:e2e:headed
```

#### デバッグモードでのテスト実行

```bash
npm run test:e2e:debug
```

#### ホームページテストのみ実行

```bash
npm run test:e2e:homepage
```

#### 改善版ホームページテスト実行

```bash
npm run test:e2e:homepage-improved
```

#### 特定のテストカテゴリのみ実行

````bash
# ウォレット接続関連のテストのみ
npm run test:e2e:wallet

# 投票一覧関連のテストのみ
npm run test:e2e:polls

# 全E2Eテスト実行
npm run test:e2e:all

#### 機能別テスト実行

```bash
# レスポンシブデザインテスト
npm run test:e2e:responsive

# ウォレット接続テスト
npm run test:e2e:wallet-connect

# 投票一覧表示テスト
npm run test:e2e:poll-list

# 投票項目選択テスト
npm run test:e2e:poll-navigation

# 新規作成ボタンテスト
npm run test:e2e:create-button

# エラーハンドリングテスト
npm run test:e2e:error-handling

# パフォーマンステスト
npm run test:e2e:performance

# アクセシビリティテスト
npm run test:e2e:accessibility
````

## 📊 テストケース一覧

### ホームページテスト (`homepage.spec.ts`)

#### 1. ページ初期表示テスト

-   **HOME-001**: ページ読み込みテスト
-   **HOME-002**: レスポンシブデザインテスト

#### 2. ウォレット接続テスト

-   **HOME-003**: ウォレット接続成功テスト
-   **HOME-004**: ウォレット接続失敗テスト
-   **HOME-005**: ウォレット切断テスト

#### 3. 投票一覧表示テスト

-   **HOME-006**: 投票一覧読み込みテスト
-   **HOME-007**: 投票一覧空状態テスト
-   **HOME-008**: 投票一覧データ表示テスト

#### 4. 投票項目選択テスト

-   **HOME-009**: 投票項目クリックテスト
-   **HOME-010**: 投票項目ホバーテスト

#### 5. 新規作成ボタンテスト

-   **HOME-011**: 新規作成ボタンクリックテスト

#### 6. エラーハンドリングテスト

-   **HOME-012**: ブロックチェーン接続エラーテスト
-   **HOME-013**: スマートコントラクトエラーテスト

#### 7. パフォーマンステスト

-   **HOME-014**: ページ読み込み速度テスト
-   **HOME-015**: 大量データ表示テスト

#### 8. アクセシビリティテスト

-   **HOME-016**: キーボードナビゲーションテスト
-   **HOME-017**: スクリーンリーダーテスト

## 🔧 テストヘルパー

### `wallet-mock.ts`

ウォレット接続のモック機能を提供するヘルパーファイルです。

#### 主要な関数

```typescript
// 成功するウォレット接続をモック
await mockSuccessfulWalletConnection(page);

// 失敗するウォレット接続をモック
await mockFailedWalletConnection(page, 'Connection failed');

// MetaMaskが存在しない状態をモック
await mockNoWallet(page);

// 投票データをモック
await mockPollData(page, pollDataArray);

// 大量の投票データをモック
await mockLargePollData(page, 100);
```

## 📈 テスト結果の確認

### HTML レポート

テスト実行後、`playwright-report/` ディレクトリに HTML レポートが生成されます。

```bash
npx playwright show-report
```

### JSON レポート

`test-results/results.json` に JSON 形式のテスト結果が出力されます。

### JUnit レポート

`test-results/results.xml` に JUnit 形式のテスト結果が出力されます。

## 🐛 トラブルシューティング

### よくある問題

1. **テストが失敗する場合**

    - 開発サーバーが起動しているか確認
    - ブラウザのキャッシュをクリア
    - ネットワーク接続を確認

2. **ウォレット接続のテストが失敗する場合**

    - モック設定が正しいか確認
    - テストデータが適切に設定されているか確認

3. **パフォーマンステストが失敗する場合**
    - テスト環境の性能を確認
    - タイムアウト設定を調整

### デバッグ方法

1. **デバッグモードでの実行**

    ```bash
    npm run test:e2e:debug
    ```

2. **特定のテストのみ実行**

    ```bash
    npx playwright test --grep "HOME-001"
    ```

3. **スクリーンショットの確認**
   テスト失敗時に自動的にスクリーンショットが保存されます。

## 📝 テスト追加ガイド

### 新しいテストファイルの作成

1. `tests/e2e/` ディレクトリに新しいテストファイルを作成
2. テスト ID を付与（例: `CREATE-001`）
3. テストケースを実装
4. package.json にスクリプトを追加

### テストケースの命名規則

-   テスト ID: `{機能名}-{連番}` (例: `HOME-001`)
-   テスト名: 日本語で分かりやすく記述
-   ファイル名: `{機能名}.spec.ts`

### モックの使用方法

```typescript
import { mockSuccessfulWalletConnection } from '../helpers/wallet-mock';

test('テストケース名', async ({ page }) => {
    await mockSuccessfulWalletConnection(page);
    // テストロジック
});
```

## 🔄 CI/CD 連携

### GitHub Actions での実行例

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: actions/setup-node@v3
              with:
                  node-version: '18'
            - run: npm ci
            - run: npm run build
            - run: npm run test:e2e
```

## 📞 サポート

テスト実行中に問題が発生した場合は、以下を確認してください：

1. **ログの確認**: テスト実行時のログを確認
2. **環境設定**: Node.js、Playwright のバージョンを確認
3. **依存関係**: 必要なパッケージがインストールされているか確認

## 📚 参考資料

-   [Playwright 公式ドキュメント](https://playwright.dev/)
-   [Next.js テストガイド](https://nextjs.org/docs/testing)
-   [SimpleVote テスト仕様書](../docs/homepage-test-specification.md)

# テストガイド

SimpleVoteプロジェクトのテスト実行とメンテナンスに関するガイドです。

## テスト構成

### E2Eテスト (Playwright)
- `tests/e2e/` - エンドツーエンドテスト
- `tests/helpers/` - テストヘルパー関数
- `tests/utils/` - 共通ユーティリティ

### 単体テスト (Jest)
- `__tests__/` - 単体テスト

## テスト実行

### 開発サーバー起動
```bash
npm run dev
```

### E2Eテスト実行
```bash
# 全テスト実行
npm run test:e2e

# 特定のテストファイル実行
npm run test:e2e -- tests/e2e/homepage/homepage.spec.ts

# テスト名でフィルタ
npm run test:e2e -- --grep "ウォレット接続"

# ヘッドモードで実行（ブラウザを表示）
npm run test:e2e -- --headed
```

## コンソールログ保存機能

ブラウザのコンソールログ、ページエラー、ネットワークエラーをファイルに保存する機能を提供しています。

### 基本的な使用方法

```typescript
import { setupConsoleLogging } from '../../utils/test-utils';

test('テスト名', async ({ page }) => {
    // コンソールログ保存機能のセットアップ
    const logger = setupConsoleLogging(page, 'テスト名', {
        autoSave: true,        // テスト終了時に自動保存
        saveFormat: 'both',    // 'json' | 'text' | 'both'
    });

    // テスト実行...
    await page.goto('/');
    
    // 手動でログを保存する場合
    const logPath = await logger.saveLogsToFile();
    console.log(`Logs saved to: ${logPath}`);
});
```

### 詳細な制御

```typescript
import { ConsoleLogger } from '../../utils/test-utils';

test('詳細制御テスト', async ({ page }) => {
    const logger = new ConsoleLogger(page, 'テスト名');
    
    // テスト実行...
    await page.goto('/');
    
    // エラーログのみを取得
    const errorLogs = logger.getErrorLogs();
    
    // 特定タイプのログを取得
    const consoleLogs = logger.getLogsByType(['log', 'info']);
    
    // JSON形式で保存
    await logger.saveLogsToFile('custom-path/logs.json');
    
    // テキスト形式で保存
    await logger.saveLogsAsText('custom-path/logs.txt');
    
    // ログをクリア
    logger.clear();
});
```

### 保存されるログの内容

#### JSON形式
```json
{
  "testName": "テスト名",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "url": "http://localhost:3000/",
  "logs": [
    {
      "timestamp": "2024-01-01T00:00:00.000Z",
      "type": "log",
      "message": "コンソールメッセージ",
      "url": "http://localhost:3000/",
      "location": "http://localhost:3000/:10:5"
    }
  ],
  "summary": {
    "total": 5,
    "byType": {
      "log": 3,
      "error": 1,
      "warning": 1
    }
  }
}
```

#### テキスト形式
```
Test: テスト名
URL: http://localhost:3000/
Timestamp: 2024-01-01T00:00:00.000Z
Total Logs: 5

=== Console Logs ===

[2024-01-01T00:00:00.000Z] LOG: コンソールメッセージ (http://localhost:3000/:10:5)
[2024-01-01T00:00:00.000Z] ERROR: エラーメッセージ
```

### キャプチャされるログタイプ

- **console logs**: `console.log`, `console.error`, `console.warn` など
- **page errors**: JavaScript実行エラー
- **network errors**: 失敗したHTTPリクエスト

### 保存場所

デフォルトの保存場所：
- JSON: `test-results/console-logs/{テスト名}_{タイムスタンプ}.json`
- Text: `test-results/console-logs/{テスト名}_{タイムスタンプ}.txt`

### 設定オプション

| オプション | 型 | デフォルト | 説明 |
|-----------|----|---------|----|
| `autoSave` | boolean | false | テスト終了時の自動保存 |
| `saveFormat` | 'json' \| 'text' \| 'both' | 'json' | 保存形式 |
| `filterTypes` | string[] | undefined | フィルタするログタイプ（未実装） |

### デバッグのヒント

1. **エラーログのみをチェック**:
   ```typescript
   const errorLogs = logger.getErrorLogs();
   if (errorLogs.length > 0) {
       console.log('Errors found:', errorLogs);
   }
   ```

2. **ログ統計の確認**:
   ```typescript
   const logs = logger.getLogs();
   console.log(`Total logs: ${logs.length}`);
   ```

3. **リアルタイムログ監視**:
   ```typescript
   page.on('console', msg => {
       if (msg.type() === 'error') {
           console.log('Real-time error:', msg.text());
       }
   });
   ```

## トラブルシューティング

### よくある問題

1. **ログが保存されない**
   - `test-results`ディレクトリの書き込み権限を確認
   - ファイルパスに無効な文字が含まれていないか確認

2. **大量のログでファイルサイズが大きくなる**
   - `filterTypes`オプションでログタイプを制限
   - 定期的に`logger.clear()`でログをクリア

3. **パフォーマンスへの影響**
   - 本番テストでは`autoSave: false`を推奨
   - 必要な場合のみ手動で保存

## 実行例

現在のホームページテストで実装されている例：

```bash
# コンソールログ保存デモを含むテスト実行
npm run test:e2e -- --grep "コンソールログ保存デモ"
```

保存されたログファイルは`test-results/console-logs/`ディレクトリで確認できます。
