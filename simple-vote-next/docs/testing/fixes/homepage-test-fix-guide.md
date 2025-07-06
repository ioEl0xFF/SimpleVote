# ホームページテスト修正手順書

## 問題の概要

### 現在の問題

-   **テスト失敗**: `h1:has-text("投票一覧")` の要素が見つからない
-   **タイムアウト**: 15 秒待機しても要素が表示されない
-   **原因**: ウォレット接続後のデータ取得完了を待たずにテストが実行されている

### 根本原因

1. **非同期処理の待機不足**: ウォレット接続後、ブロックチェーンからのデータ取得が完了する前にテストが実行される
2. **ローディング状態の考慮不足**: `PollList`コンポーネントのローディング状態がテストで考慮されていない
3. **状態遷移のタイミング**: ページの状態遷移が完了する前にアサーションが実行される

## 修正手順

### ステップ 1: 現在のテストファイルを確認

```bash
# テストファイルの場所
simple-vote-next/tests/e2e/homepage.spec.ts
```

### ステップ 2: テストの修正

#### 2.1 ローディング状態の待機を追加

```typescript
// 修正前（問題のあるコード）
await expect(page.locator('h1:has-text("投票一覧")')).toBeVisible({ timeout: 15000 });

// 修正後（推奨）
// 1. ローディング状態の終了を待つ
await expect(page.locator('text=投票一覧を読み込み中...')).not.toBeVisible({ timeout: 20000 });

// 2. その後でヘッダーを確認
await expect(page.locator('h1:has-text("投票一覧")')).toBeVisible();
```

#### 2.2 より堅牢な待機条件の実装

```typescript
// 推奨する修正パターン
test('ページが正常に読み込まれ、基本UI要素が表示される', async ({ page }) => {
    // 1. ページにアクセス
    await page.goto('http://localhost:3000');

    // 2. ウォレット接続ボタンをクリック
    await page.click('button:has-text("ウォレット接続")');

    // 3. ウォレット接続の完了を待つ
    await expect(page.locator('text=ウォレット接続')).not.toBeVisible({ timeout: 10000 });

    // 4. ローディング状態の終了を待つ
    await expect(page.locator('text=投票一覧を読み込み中...')).not.toBeVisible({ timeout: 20000 });

    // 5. ページヘッダー「投票一覧」が表示されることを確認
    await expect(page.locator('h1:has-text("投票一覧")')).toBeVisible();

    // 6. 「新規作成」ボタンが表示されることを確認
    await expect(page.locator('button:has-text("新規作成")')).toBeVisible();
});
```

### ステップ 3: タイムアウト値の調整

#### 3.1 推奨タイムアウト値

```typescript
// ウォレット接続: 10秒
await expect(page.locator('text=ウォレット接続')).not.toBeVisible({ timeout: 10000 });

// データ取得完了: 20秒（ブロックチェーン通信のため長め）
await expect(page.locator('text=投票一覧を読み込み中...')).not.toBeVisible({ timeout: 20000 });

// UI要素確認: 5秒（通常の表示確認）
await expect(page.locator('h1:has-text("投票一覧")')).toBeVisible({ timeout: 5000 });
```

### ステップ 4: エラーハンドリングの改善

#### 4.1 デバッグ情報の追加

```typescript
test('ページが正常に読み込まれ、基本UI要素が表示される', async ({ page }) => {
    try {
        // テスト実行
        await page.goto('http://localhost:3000');

        // デバッグ: ページの状態をログ出力
        console.log('ページタイトル:', await page.title());

        await page.click('button:has-text("ウォレット接続")');

        // デバッグ: ウォレット接続後の状態
        await page.waitForTimeout(2000);
        console.log('ウォレット接続後のHTML:', await page.content());

        // 以下、テスト継続...
    } catch (error) {
        // エラー時のスクリーンショット取得
        await page.screenshot({ path: 'test-error.png' });
        throw error;
    }
});
```

### ステップ 5: テストの実行と確認

#### 5.1 修正後のテスト実行

```bash
# テストディレクトリに移動
cd simple-vote-next

# テスト実行
npm run test:e2e

# または特定のテストファイルのみ実行
npx playwright test tests/e2e/homepage.spec.ts
```

#### 5.2 結果の確認

```bash
# テスト結果の確認
cat test-results/results.json

# HTMLレポートの確認
npx playwright show-report
```

## 追加の改善提案

### 1. テストヘルパー関数の作成

```typescript
// tests/helpers/wallet-utils.ts
export async function connectWallet(page: Page) {
    await page.click('button:has-text("ウォレット接続")');
    await expect(page.locator('text=ウォレット接続')).not.toBeVisible({ timeout: 10000 });
}

export async function waitForPollListLoaded(page: Page) {
    await expect(page.locator('text=投票一覧を読み込み中...')).not.toBeVisible({ timeout: 20000 });
}
```

### 2. テストデータの準備

```typescript
// テスト用の投票データを事前に作成
beforeAll(async () => {
    // テスト用の投票を作成
    // これにより、常に投票一覧が表示される状態を保証
});
```

### 3. 環境変数の活用

```typescript
// playwright.config.ts
export default defineConfig({
    use: {
        // テスト環境でのタイムアウト設定
        actionTimeout: 10000,
        navigationTimeout: 30000,
    },
});
```

## トラブルシューティング

### よくある問題と解決策

#### 1. ウォレット接続が失敗する場合

```typescript
// より詳細な待機条件
await page.waitForSelector('button:has-text("ウォレット接続")', { state: 'visible' });
await page.click('button:has-text("ウォレット接続")');
```

#### 2. データ取得が遅い場合

```typescript
// タイムアウト値を増加
await expect(page.locator('text=投票一覧を読み込み中...')).not.toBeVisible({ timeout: 30000 });
```

#### 3. 要素が見つからない場合

```typescript
// デバッグ用のスクリーンショット
await page.screenshot({ path: 'debug-screenshot.png' });
console.log('現在のHTML:', await page.content());
```

## 検証チェックリスト

-   [ ] ウォレット接続が正常に完了する
-   [ ] ローディング状態が適切に終了する
-   [ ] ページヘッダー「投票一覧」が表示される
-   [ ] 「新規作成」ボタンが表示される
-   [ ] テストが安定して成功する
-   [ ] エラーハンドリングが適切に動作する

## 参考資料

-   [Playwright テストガイド](https://playwright.dev/docs/intro)
-   [Next.js テストベストプラクティス](https://nextjs.org/docs/testing)
-   [Ethereum テスト環境](https://hardhat.org/docs/testing)
