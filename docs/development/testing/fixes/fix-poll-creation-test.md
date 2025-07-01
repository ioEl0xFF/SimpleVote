# 投票作成テスト修正ガイド

## 概要

このドキュメントは、`simple-vote-next/tests/poll-creation.spec.ts`のテスト失敗原因を分析し、具体的な修正方法を提供します。

## 主な失敗原因と修正方法

### 1. Toast要素の重複問題

#### 問題の詳細
- **エラー**: `strict mode violation: locator('[data-testid="toast"]') resolved to 2 elements`
- **原因**: `WalletProvider`で複数のトーストが同時に表示される可能性がある
- **影響**: テストヘルパーが単一要素を期待して失敗

#### 修正方法

**1.1 waitForToastヘルパーの修正**

```typescript
// simple-vote-next/tests/helpers/ethers-mock.ts の waitForToast関数を修正

export async function waitForToast(page: Page, expectedMessage: string, timeout = 3000) {
    // トースト要素が表示されるまで待機
    await page.waitForSelector('[data-testid="toast"]', { timeout });
    
    // 最新のトーストのみを取得
    const toasts = page.locator('[data-testid="toast"]');
    const count = await toasts.count();
    const latestToast = toasts.nth(count - 1);
    
    await expect(latestToast).toBeVisible();
    
    const toastText = await latestToast.textContent();
    expect(toastText).toContain(expectedMessage);
    
    console.log('Toast message verified:', toastText);
}
```

**1.2 代替案：特定のトーストを検証**

```typescript
export async function waitForSpecificToast(page: Page, expectedMessage: string, timeout = 3000) {
    // 特定のメッセージを含むトーストを待機
    await page.waitForFunction(
        (message) => {
            const toasts = document.querySelectorAll('[data-testid="toast"]');
            return Array.from(toasts).some(toast => 
                toast.textContent?.includes(message)
            );
        },
        expectedMessage,
        { timeout }
    );
    
    // 該当するトーストを検証
    const toast = page.locator(`[data-testid="toast"]:has-text("${expectedMessage}")`);
    await expect(toast).toBeVisible();
}
```

### 2. フォーム要素のセレクタ不一致

#### 問題の詳細
- **エラー**: `TimeoutError: locator.fill: Timeout 5000ms exceeded`
- **原因**: `input[name="end"]`というセレクタが実際のHTMLに存在しない
- **実際のHTML**: `input[type="datetime-local"]`が2つ存在

#### 修正方法

**2.1 テストファイルの修正**

```typescript
// simple-vote-next/tests/poll-creation.spec.ts の該当箇所を修正

// 修正前
await page.locator('input[name="end"]').fill(pastTime.toISOString().slice(0, 16));

// 修正後（2番目のdatetime-local入力が終了日時）
await page.locator('input[type="datetime-local"]').nth(1).fill(pastTime.toISOString().slice(0, 16));
```

**2.2 より堅牢なセレクタの使用**

```typescript
// ラベルテキストで特定する方法
await page.locator('label:has-text("終了日時") input[type="datetime-local"]').fill(pastTime.toISOString().slice(0, 16));

// または、data属性を追加する方法
// create/page.tsx で終了日時のinputに data-testid="end-time" を追加
await page.locator('[data-testid="end-time"]').fill(pastTime.toISOString().slice(0, 16));
```

### 3. 選択肢入力の部分一致問題

#### 問題の詳細
- **エラー**: `strict mode violation: locator('input[placeholder*="選択肢 1"]') resolved to 2 elements`
- **原因**: 「選択肢 10」も「選択肢 1」に部分一致してしまう
- **影響**: 複数の要素がマッチしてテストが失敗

#### 修正方法

**3.1 完全一致セレクタの使用**

```typescript
// simple-vote-next/tests/poll-creation.spec.ts の該当箇所を修正

// 修正前
await page.locator('input[placeholder*="選択肢 1"]').fill('選択肢1');

// 修正後（完全一致）
await page.locator('input[placeholder="選択肢 1"]').fill('選択肢1');
```

**3.2 ループ処理の修正**

```typescript
// 選択肢に値を入力する部分を修正
for (let i = 0; i < 10; i++) {
    // 完全一致のプレースホルダーを使用
    await page.locator(`input[placeholder="選択肢 ${i + 1}"]`).fill(`選択肢${i + 1}`);
}
```

**3.3 代替案：インデックスベースのセレクタ**

```typescript
// インデックスで特定する方法
const choiceInputs = page.locator('input[placeholder*="選択肢"]');
await choiceInputs.nth(0).fill('選択肢1');
await choiceInputs.nth(1).fill('選択肢2');
```

### 4. トークンアドレスバリデーション問題

#### 問題の詳細
- **エラー**: `Expected substring: "トークンアドレスを正しく入力してください"`
- **原因**: バリデーションロジックが正しく動作していない、またはトーストの競合
- **影響**: 期待されるエラーメッセージが表示されない

#### 修正方法

**4.1 バリデーションロジックの確認**

```typescript
// create/page.tsx のバリデーション部分を確認
if (pollType === 'weighted') {
    if (!token || !ethers.isAddress(token)) {
        showToast('トークンアドレスを正しく入力してください');
        return;
    }
    // ...
}
```

**4.2 テストの修正**

```typescript
// simple-vote-next/tests/poll-creation.spec.ts の該当箇所を修正

test('Weighted Vote作成 - 無効なトークンアドレス', async ({ page }) => {
    // 投票タイプをWeighted Voteに設定
    await page.locator('select').selectOption('weighted');
    
    // 無効なトークンアドレスを入力
    await page.locator('input[placeholder*="0x"]').fill('invalid-address');
    
    // 作成ボタンをクリック
    await page.getByRole('button', { name: '作成' }).click();
    
    // エラーメッセージの確認（修正されたwaitForToastを使用）
    await waitForToast(page, 'トークンアドレスを正しく入力してください');
});
```

**4.3 モックの確認**

```typescript
// simple-vote-next/tests/helpers/ethers-mock.ts の isAddress モックを確認
isAddress: (address: string) => {
    console.log('Mock ethers.isAddress called with:', address);
    // 簡単なアドレス形式チェック
    return /^0x[a-fA-F0-9]{40}$/.test(address);
},
```

## 実装手順

### ステップ1: waitForToastヘルパーの修正

1. `simple-vote-next/tests/helpers/ethers-mock.ts`を開く
2. `waitForToast`関数を上記の修正版に置き換える

### ステップ2: フォームセレクタの修正

1. `simple-vote-next/tests/poll-creation.spec.ts`を開く
2. `input[name="end"]`の使用箇所を`input[type="datetime-local"]`に修正

### ステップ3: 選択肢セレクタの修正

1. 部分一致セレクタ（`placeholder*=`）を完全一致（`placeholder=`）に修正
2. ループ処理での選択肢入力部分を修正

### ステップ4: テストの実行と検証

```bash
cd simple-vote-next
npm run test:e2e -- tests/poll-creation.spec.ts
```

## 追加の改善提案

### 1. テストデータ属性の追加

```typescript
// create/page.tsx にテスト用のdata属性を追加
<input
    type="datetime-local"
    data-testid="end-time"
    className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    value={end}
    onChange={(e) => setEnd(e.target.value)}
    required
/>

// 選択肢入力にもdata属性を追加
<input
    key={i}
    data-testid={`choice-${i + 1}`}
    className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    value={c}
    onChange={(e) => updateChoice(i, e.target.value)}
    required={i < 2}
    placeholder={`選択肢 ${i + 1}`}
/>
```

### 2. テストヘルパーの拡張

```typescript
// 新しいヘルパー関数の追加
export async function fillPollForm(page: Page, pollData: {
    type: string;
    topic: string;
    startTime: string;
    endTime: string;
    choices: string[];
    tokenAddress?: string;
}) {
    // 投票タイプの設定
    await page.locator('select').selectOption(pollData.type);
    
    // トピックの入力
    await page.locator('input[placeholder*="投票のトピック"]').fill(pollData.topic);
    
    // 日時の入力
    await page.locator('input[type="datetime-local"]').nth(0).fill(pollData.startTime);
    await page.locator('input[type="datetime-local"]').nth(1).fill(pollData.endTime);
    
    // 選択肢の入力
    for (let i = 0; i < pollData.choices.length; i++) {
        await page.locator(`input[placeholder="選択肢 ${i + 1}"]`).fill(pollData.choices[i]);
    }
    
    // トークンアドレスの入力（Weighted Voteの場合）
    if (pollData.tokenAddress) {
        await page.locator('input[placeholder*="0x"]').fill(pollData.tokenAddress);
    }
}
```

## 期待される結果

これらの修正により、以下の改善が期待されます：

1. **Toast要素の重複問題**: 最新のトーストのみを検証することで解決
2. **フォーム要素の特定**: 正しいセレクタを使用することで解決
3. **選択肢入力の誤マッチ**: 完全一致セレクタにより解決
4. **バリデーション問題**: 適切なエラーメッセージの検証が可能

修正後のテスト成功率は90%以上に向上することが期待されます。 