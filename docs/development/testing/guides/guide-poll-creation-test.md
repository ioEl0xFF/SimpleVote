# 投票作成テスト実装手順書

## 概要
このドキュメントでは、SimpleVote Next.jsアプリケーションの投票作成機能（`/create`ページ）のPlaywrightテスト実装手順を詳細に説明します。

## 現在の実装状況

### 投票作成ページの機能
- **投票タイプ選択**: Dynamic Vote、Weighted Vote、Simple Vote
- **フォーム入力**: トピック、開始日時、終了日時、選択肢
- **Weighted Vote専用**: トークンアドレス入力
- **バリデーション**: 日時、トークンアドレス、必須項目
- **トランザクション実行**: PollRegistryコントラクトのcreatePoll呼び出し
- **成功時の処理**: ホームページへのリダイレクト

### 既存のモック実装
- ethers.jsの基本モック
- ウォレット接続のモック
- 基本的なコントラクト呼び出しのモック

## 実装手順

### ステップ1: テストファイルの作成

```bash
# テストファイルを作成
touch simple-vote-next/tests/poll-creation.spec.ts
```

### ステップ2: 基本的なテスト構造の実装

```typescript
import { test, expect } from '@playwright/test';
import { setupEthersMock, simulateCompleteWalletConnection } from './helpers/ethers-mock';

test.describe('投票作成テスト', () => {
    test.beforeEach(async ({ page }) => {
        // ethers.jsのモックを設定
        await setupEthersMock(page);
        
        // ホームページに移動
        await page.goto('/');
        
        // ウォレット接続
        await simulateCompleteWalletConnection(page);
        
        // 新規作成ページに移動
        await page.getByRole('button', { name: '新規作成' }).click();
        await page.waitForURL('/create');
    });

    test('ページの基本表示', async ({ page }) => {
        // ページタイトルの確認
        await expect(page.locator('h1')).toHaveText('議題作成');
        
        // フォーム要素の確認
        await expect(page.locator('select[name="pollType"]')).toBeVisible();
        await expect(page.locator('input[name="topic"]')).toBeVisible();
        await expect(page.locator('input[name="start"]')).toBeVisible();
        await expect(page.locator('input[name="end"]')).toBeVisible();
        await expect(page.locator('input[placeholder*="選択肢"]')).toHaveCount(2);
    });
});
```

### ステップ3: モックの拡張

既存の`ethers-mock.ts`に以下の機能を追加：

```typescript
// MockContractクラスにcreatePollメソッドを追加
async createPoll(
    pollType: number,
    topic: string,
    startTime: number,
    endTime: number,
    choices: string[],
    tokenAddress: string
) {
    console.log('MockContract.createPoll called with:', {
        pollType,
        topic,
        startTime,
        endTime,
        choices,
        tokenAddress
    });

    // モックトランザクションオブジェクトを返す
    return {
        wait: async () => ({
            logs: [
                {
                    // PollCreatedイベントのモックログ
                    topics: [
                        '0x...', // イベントシグネチャ
                        '0x...', // pollId
                        '0x...', // pollType
                        '0x...'  // owner
                    ],
                    data: '0x...' // イベントデータ
                }
            ]
        })
    };
}
```

### ステップ4: フォームバリデーションテスト

```typescript
test('フォームバリデーション', async ({ page }) => {
    // 必須項目のバリデーション
    await page.getByRole('button', { name: '作成' }).click();
    
    // エラーメッセージの確認
    await expect(page.locator('input[name="topic"]')).toHaveAttribute('required');
    
    // 日時のバリデーション
    const now = new Date();
    const pastTime = new Date(now.getTime() - 3600000); // 1時間前
    
    await page.locator('input[name="end"]').fill(pastTime.toISOString().slice(0, 16));
    await page.getByRole('button', { name: '作成' }).click();
    
    // 日時エラーの確認
    await expect(page.locator('.toast-container')).toContainText('終了日時は開始日時より後を設定してください');
});
```

### ステップ5: 投票タイプ別テスト

```typescript
test('Dynamic Vote作成', async ({ page }) => {
    // 投票タイプをDynamic Voteに設定
    await page.locator('select[name="pollType"]').selectOption('dynamic');
    
    // フォーム入力
    await page.locator('input[name="topic"]').fill('テスト投票');
    await page.locator('input[placeholder*="選択肢 1"]').fill('選択肢1');
    await page.locator('input[placeholder*="選択肢 2"]').fill('選択肢2');
    
    // 作成実行
    await page.getByRole('button', { name: '作成' }).click();
    
    // 成功メッセージの確認
    await expect(page.locator('.toast-container')).toContainText('議題を作成しました');
    
    // ホームページへのリダイレクト確認
    await page.waitForURL('/');
});

test('Weighted Vote作成', async ({ page }) => {
    // 投票タイプをWeighted Voteに設定
    await page.locator('select[name="pollType"]').selectOption('weighted');
    
    // トークンアドレス入力フィールドの表示確認
    await expect(page.locator('input[name="token"]')).toBeVisible();
    
    // 無効なトークンアドレスのテスト
    await page.locator('input[name="token"]').fill('invalid-address');
    await page.getByRole('button', { name: '作成' }).click();
    
    // エラーメッセージの確認
    await expect(page.locator('.toast-container')).toContainText('トークンアドレスを正しく入力してください');
});
```

### ステップ6: 選択肢操作テスト

```typescript
test('選択肢の追加・削除', async ({ page }) => {
    // 初期選択肢数の確認
    await expect(page.locator('input[placeholder*="選択肢"]')).toHaveCount(2);
    
    // 選択肢を追加
    await page.getByRole('button', { name: '選択肢を追加' }).click();
    await expect(page.locator('input[placeholder*="選択肢"]')).toHaveCount(3);
    
    // 最大10個まで追加
    for (let i = 0; i < 7; i++) {
        await page.getByRole('button', { name: '選択肢を追加' }).click();
    }
    
    // 最大数に達したらボタンが無効化される
    await expect(page.getByRole('button', { name: '選択肢を追加' })).toBeDisabled();
});
```

### ステップ7: エラーハンドリングテスト

```typescript
test('トランザクションエラーハンドリング', async ({ page }) => {
    // モックでエラーを発生させる
    await page.addInitScript(() => {
        // createPollメソッドでエラーを発生させるモック
        const originalCreatePoll = window.ethers.Contract.prototype.createPoll;
        window.ethers.Contract.prototype.createPoll = async () => {
            throw new Error('Transaction failed');
        };
    });
    
    // フォーム入力
    await page.locator('input[name="topic"]').fill('エラーテスト');
    await page.getByRole('button', { name: '作成' }).click();
    
    // エラーメッセージの確認
    await expect(page.locator('.toast-container')).toContainText('エラー: Transaction failed');
});
```

## 重要な注意事項

### 1. モックの完全性
- **createPollメソッド**: PollRegistryコントラクトのcreatePollメソッドの完全なモックが必要
- **イベントログ**: PollCreatedイベントのログ構造を正確にモック
- **トランザクション**: トランザクションオブジェクトとreceiptの適切なモック

### 2. 日時処理
- **タイムゾーン**: ブラウザのタイムゾーン設定に依存する処理
- **フォーマット**: datetime-local入力のフォーマット（YYYY-MM-DDTHH:MM）
- **バリデーション**: 開始日時 < 終了日時の検証

### 3. フォーム状態管理
- **選択肢の動的追加**: 最大10個までの制限
- **Weighted Vote**: 投票タイプ変更時のUI更新
- **バリデーション**: リアルタイムバリデーションの確認

### 4. トランザクション処理
- **非同期処理**: トランザクション承認待ち状態の表示
- **エラーハンドリング**: ネットワークエラー、ガス不足、コントラクトエラー
- **成功時の処理**: ホームページへのリダイレクト

### 5. セキュリティ考慮事項
- **入力値検証**: XSS攻撃対策
- **アドレス検証**: ethers.isAddress()によるトークンアドレス検証
- **権限チェック**: ウォレット接続状態の確認

## テスト実行手順

### 1. 環境準備
```bash
cd simple-vote-next
npm install
```

### 2. テスト実行
```bash
# 特定のテストファイルを実行
npx playwright test tests/poll-creation.spec.ts

# ヘッドレスモードで実行
npx playwright test tests/poll-creation.spec.ts --headed

# デバッグモードで実行
npx playwright test tests/poll-creation.spec.ts --debug
```

### 3. テスト結果の確認
```bash
# テストレポートを表示
npx playwright show-report
```

## トラブルシューティング

### よくある問題と解決方法

1. **モックが適用されない**
   - ページリロードのタイミングを確認
   - モックスクリプトの実行順序を確認

2. **フォーム要素が見つからない**
   - セレクターの確認
   - ページ読み込み完了の待機

3. **トランザクションエラーが発生しない**
   - モックのcreatePollメソッドの実装を確認
   - エラー発生のタイミングを確認

4. **日時バリデーションが失敗**
   - タイムゾーンの設定を確認
   - 日時フォーマットの確認

## 次のステップ

1. **統合テスト**: 実際のコントラクトとの統合テスト
2. **パフォーマンステスト**: 大量データでの動作確認
3. **セキュリティテスト**: より詳細なセキュリティ検証
4. **アクセシビリティテスト**: スクリーンリーダー対応の確認

## 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [ethers.js公式ドキュメント](https://docs.ethers.org/)
- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [SimpleVoteコントラクト仕様](../specifications/single-contract-design-spec.md) 