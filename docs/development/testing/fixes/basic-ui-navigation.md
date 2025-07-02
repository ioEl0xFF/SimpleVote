# basic-ui-navigation.spec.ts の失敗修正内容

## 概要
「ページタイトルが各ページで正しく表示される」テストが失敗していた問題の修正内容をまとめています。

## 問題点
- ウォレット未接続時は「投票一覧」テキストが表示されない仕様なのに、  
  テストでは常に「投票一覧」が表示されることを期待していた。
- 実際のアプリケーションでは、ウォレット接続後にのみPollListPageが表示され、「投票一覧」タイトルが表示される。

## 修正方針
1. ウォレット未接続時は「投票一覧」テキストが表示されないことを確認する。
2. ウォレット接続時のみ「投票一覧」テキストが表示されることを確認する。
3. テストを2つに分割し、状態ごとに正しいアサーションを行う。

## 修正版テスト例

### 修正前（失敗していたテスト）
```typescript
test('ページタイトルが各ページで正しく表示される', async ({ page }) => {
    // ホームページのタイトル確認
    await expect(page.locator('h1').first()).toHaveText('SimpleVote');
    await expect(page.locator('text=投票一覧')).toBeVisible(); // ← ここで失敗
});
```

### 修正後（正しいテスト）
```typescript
test('ホームページのタイトル表示（ウォレット未接続時）', async ({ page }) => {
    await expect(page.locator('h1').first()).toHaveText('SimpleVote');
    await expect(page.locator('text=投票一覧')).not.toBeVisible(); // 未接続時は非表示
});

test('ホームページのタイトル表示（ウォレット接続時）', async ({ page }) => {
    // ウォレット接続をシミュレート
    await page.evaluate(() => {
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('accountAddress', '0x1234567890123456789012345678901234567890');
        window.dispatchEvent(new CustomEvent('walletConnected', {
            detail: { address: '0x1234567890123456789012345678901234567890' }
        }));
    });
    
    // ページをリロードしてウォレット接続状態を反映
    await page.reload();
    
    await expect(page.locator('h1').first()).toHaveText('SimpleVote');
    await expect(page.locator('text=投票一覧')).toBeVisible(); // 接続時は表示
});
```

## アプリケーションの仕様
- **ウォレット未接続時**: App.tsxでウォレット接続ボタンのみ表示、PollListPageは表示されない
- **ウォレット接続時**: PollListPageが表示され、PageHeaderで「投票一覧」タイトルが表示される

## テスト実行方法
```bash
cd simple-vote-next
npx playwright test basic-ui-navigation.spec.ts --project=chromium --reporter=list
```

## 修正日
2024年12月

## 関連ファイル
- `simple-vote-next/tests/basic-ui-navigation.spec.ts`
- `simple-vote-next/app/page.tsx`
- `simple-vote-next/components/App.tsx`
- `simple-vote-next/components/PageHeader.tsx` 