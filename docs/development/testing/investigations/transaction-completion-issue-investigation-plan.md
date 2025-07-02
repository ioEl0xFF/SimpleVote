# トランザクション完了問題の原因調査計画

## 問題の概要

**問題**: 投票作成時にトランザクション完了後の処理が実行されない
**症状**:
- トーストメッセージが「トランザクション承認待ち…」のまま変化しない
- リダイレクトが発生しない（URLが`/create`のまま）
- 成功メッセージ「議題を作成しました」が表示されない

**現在の状況**:
- エラーハンドリングテスト: ✅ 成功
- ウォレット接続: ✅ 成功
- フォーム入力: ✅ 成功
- トランザクション開始: ✅ 成功
- トランザクション完了処理: ❌ 失敗

## 調査方法

### 1. モック適用状況の確認

#### 1.1 ブラウザコンソールでのモック確認

```bash
# テスト実行時にブラウザのコンソールを確認
cd simple-vote-next
npx playwright test tests/poll-creation.spec.ts --headed
```

**確認項目**:
- `window.ethers.isMock` が `true` を返すか
- モックのコンストラクタが呼び出されているか
- `Mock createPoll called` ログが出力されているか

#### 1.2 モック適用タイミングの確認

```typescript
// simple-vote-next/tests/poll-creation.spec.ts に追加
test.beforeEach(async ({ page }) => {
    // モック適用前の確認
    await page.evaluate(() => {
        console.log('Before mock setup:');
        console.log('window.ethers:', typeof (window as any).ethers);
        console.log('window.ethers.isMock:', (window as any).ethers?.isMock);
    });

    await setupEthersMock(page);

    // モック適用後の確認
    await page.evaluate(() => {
        console.log('After mock setup:');
        console.log('window.ethers:', typeof (window as any).ethers);
        console.log('window.ethers.isMock:', (window as any).ethers?.isMock);
    });
});
```

### 2. トランザクション処理の詳細デバッグ

#### 2.1 アプリケーションコードのログ確認

```typescript
// simple-vote-next/app/create/page.tsx の submit 関数に追加
const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('=== SUBMIT FUNCTION START ===');
    console.log('ethers object:', typeof ethers);
    console.log('ethers.isMock:', (ethers as any).isMock);
    console.log('signer:', signer);

    // ... 既存のコード ...

    try {
        console.log('=== CREATING CONTRACT INSTANCE ===');
        const registry = new ethers.Contract(POLL_REGISTRY_ADDRESS, POLL_REGISTRY_ABI, signer);
        console.log('Registry contract instance:', registry);
        console.log('Registry constructor:', registry.constructor.name);

        console.log('=== CALLING CREATE POLL ===');
        const tx = await registry.createPoll(pollTypeEnum, topic, s, eTime, filteredChoices, tokenAddress);
        console.log('Transaction object received:', tx);
        console.log('Transaction hash:', tx.hash);
        console.log('Transaction wait method:', typeof tx.wait);

        console.log('=== WAITING FOR TRANSACTION ===');
        const receipt = await tx.wait();
        console.log('Transaction confirmed:', receipt);
        console.log('Receipt events:', receipt.events);

        // ... 既存のコード ...
    } catch (error) {
        console.error('=== ERROR IN POLL CREATION ===');
        console.error('Error:', error);
        console.error('Error stack:', (error as Error).stack);
    }
};
```

#### 2.2 モックトランザクションの詳細ログ

```typescript
// simple-vote-next/tests/helpers/ethers-mock.ts の createPoll メソッドに追加
async createPoll(pollTypeEnum: number, topic: string, s: number, eTime: number, filteredChoices: string[], tokenAddress: string) {
    console.log('=== MOCK CREATE POLL CALLED ===');
    console.log('Parameters:', { pollTypeEnum, topic, s, eTime, filteredChoices, tokenAddress });

    const hash = '0x' + Math.random().toString(16).substring(2, 42);
    console.log('Generated hash:', hash);

    const mockTx = {
        hash,
        wait: async () => {
            console.log('=== MOCK TX.WAIT() CALLED ===');
            console.log('Hash:', hash);
            console.log('Timestamp:', new Date().toISOString());

            await new Promise(resolve => setTimeout(resolve, 100));

            const receipt = {
                hash,
                blockNumber: 12345,
                blockHash: '0x' + '0'.repeat(64),
                transactionIndex: 0,
                from: '0x1234567890123456789012345678901234567890',
                to: '0x0987654321098765432109876543210987654321',
                contractAddress: null,
                cumulativeGasUsed: '21000',
                gasUsed: '21000',
                effectiveGasPrice: '20000000000',
                logs: [],
                logsBloom: '0x' + '0'.repeat(512),
                status: 1,
                type: 2,
                events: [
                    {
                        event: 'PollCreated',
                        args: {
                            pollId: '1',
                            creator: '0x1234567890123456789012345678901234567890',
                            pollType: 0,
                            topic: 'テスト議題',
                            startTime: Math.floor(Date.now() / 1000),
                            endTime: Math.floor(Date.now() / 1000) + 3600,
                            choices: ['選択肢1', '選択肢2'],
                        },
                    },
                ],
            };

            console.log('=== MOCK RECEIPT GENERATED ===');
            console.log('Receipt:', receipt);
            console.log('Events:', receipt.events);

            return receipt;
        }
    };

    console.log('=== RETURNING MOCK TRANSACTION ===');
    console.log('Mock transaction:', mockTx);

    return mockTx;
}
```

### 3. イベント処理の確認

#### 3.1 イベント検索ロジックの確認

```typescript
// simple-vote-next/app/create/page.tsx のイベント処理部分に追加
console.log('=== PROCESSING EVENTS ===');
console.log('Receipt events:', receipt.events);
console.log('Events type:', typeof receipt.events);
console.log('Events length:', receipt.events?.length);

if (receipt.events) {
    console.log('=== SEARCHING FOR POLL CREATED EVENT ===');
    const pollCreatedEvent = receipt.events.find((event: any) => {
        console.log('Checking event:', event);
        console.log('Event event property:', event.event);
        console.log('Event event === PollCreated:', event.event === 'PollCreated');
        return event.event === 'PollCreated';
    });

    console.log('Found PollCreated event:', pollCreatedEvent);

    if (pollCreatedEvent) {
        const pollId = pollCreatedEvent.args.pollId.toString();
        console.log('Poll ID extracted:', pollId);
        console.log('=== SHOWING SUCCESS TOAST ===');
        showToast('議題を作成しました');

        console.log('=== SCHEDULING REDIRECT ===');
        setTimeout(() => {
            console.log('=== EXECUTING REDIRECT ===');
            console.log('Redirecting to:', `/simple/${pollId}`);
            router.push(`/simple/${pollId}`);
        }, 2000);
    } else {
        console.log('PollCreated event not found');
    }
} else {
    console.log('No events in receipt');
}
```

### 4. トーストメッセージの確認

#### 4.1 トーストコンポーネントの動作確認

```typescript
// simple-vote-next/components/WalletProvider.tsx の showToast 関数に追加
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log('=== SHOW TOAST CALLED ===');
    console.log('Message:', message);
    console.log('Type:', type);
    console.log('Current toast state:', toastMessage);

    setToastMessage(message);
    setToastType(type);
    setShowToast(true);

    console.log('Toast state updated');

    setTimeout(() => {
        console.log('=== HIDING TOAST ===');
        setShowToast(false);
    }, 5000);
};
```

### 5. テストでの詳細確認

#### 5.1 テスト実行時の詳細ログ

```typescript
// simple-vote-next/tests/poll-creation.spec.ts に追加
test('投票作成が正常に完了する', async ({ page }) => {
    // ページの読み込みを待機
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // フォームの入力
    await page.fill('input[placeholder*="投票のトピック"]', 'テスト議題');
    await page.locator('input[type="datetime-local"]').nth(0).fill('2024-01-01T10:00');
    await page.locator('input[type="datetime-local"]').nth(1).fill('2024-01-01T11:00');
    await page.fill('input[placeholder="選択肢 1"]', '選択肢1');
    await page.fill('input[placeholder="選択肢 2"]', '選択肢2');

    // 投票作成ボタンのクリック
    await page.click('button[type="submit"]');

    // トランザクション承認待ちメッセージの確認
    await expect(page.locator('text=トランザクション承認待ち…')).toBeVisible({ timeout: 10000 });

    // 詳細なデバッグ情報の収集
    console.log('=== COLLECTING DEBUG INFORMATION ===');

    // ページの内容を確認
    const pageContent = await page.content();
    console.log('Page content length:', pageContent.length);

    // トースト要素を確認
    const toastElements = await page.locator('[data-testid="toast"]').all();
    console.log('Toast elements count:', toastElements.length);

    for (let i = 0; i < toastElements.length; i++) {
        const text = await toastElements[i].textContent();
        const isVisible = await toastElements[i].isVisible();
        console.log(`Toast ${i}: text="${text}", visible=${isVisible}`);
    }

    // コンソールログを確認
    const logs = await page.evaluate(() => {
        return (window as any).consoleLogs || [];
    });
    console.log('Console logs:', logs);

    // URLの確認
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // ボタンの状態を確認
    const submitButton = page.locator('button[type="submit"]');
    const isDisabled = await submitButton.isDisabled();
    const buttonText = await submitButton.textContent();
    console.log('Submit button disabled:', isDisabled);
    console.log('Submit button text:', buttonText);
});
```

### 6. 実行手順

#### 6.1 デバッグ情報付きテストの実行

```bash
# 1. デバッグ情報を追加したファイルを保存

# 2. テストを実行（ヘッドレスモードでコンソールログを確認）
cd simple-vote-next
npx playwright test tests/poll-creation.spec.ts --reporter=line

# 3. ヘッド付きモードでブラウザのコンソールを確認
npx playwright test tests/poll-creation.spec.ts --headed
```

#### 6.2 手動での動作確認

```bash
# 1. 開発サーバーを起動
cd simple-vote-next
npm run dev

# 2. ブラウザで http://localhost:3000 にアクセス

# 3. 開発者ツールのコンソールを開く

# 4. ウォレット接続 → 新規作成 → 投票作成を実行

# 5. コンソールログを確認
```

### 7. 期待される結果

#### 7.1 正常な動作の場合

```
=== MOCK CREATE POLL CALLED ===
Parameters: { pollTypeEnum: 0, topic: "テスト議題", ... }
=== MOCK TX.WAIT() CALLED ===
=== MOCK RECEIPT GENERATED ===
=== PROCESSING EVENTS ===
=== SEARCHING FOR POLL CREATED EVENT ===
Found PollCreated event: { event: "PollCreated", args: {...} }
=== SHOWING SUCCESS TOAST ===
=== SCHEDULING REDIRECT ===
=== EXECUTING REDIRECT ===
```

#### 7.2 問題がある場合の確認ポイント

1. **モックが適用されていない場合**:
   - `window.ethers.isMock` が `false` または `undefined`
   - 実際のethers.jsが使用されている

2. **トランザクション処理が失敗している場合**:
   - `Mock createPoll called` ログが出力されない
   - エラーが発生している

3. **イベント処理が失敗している場合**:
   - `Mock tx.wait() called` ログが出力されない
   - レシートのイベントが正しく生成されていない

4. **トースト表示が失敗している場合**:
   - `SHOW TOAST CALLED` ログが出力されない
   - トースト要素が正しく更新されていない

5. **リダイレクトが失敗している場合**:
   - `SCHEDULING REDIRECT` ログが出力されない
   - `EXECUTING REDIRECT` ログが出力されない

### 8. 修正後の確認

#### 8.1 テストの成功確認

```bash
# 修正後にテストを実行
cd simple-vote-next
npx playwright test tests/poll-creation.spec.ts

# 期待される結果
# ✓ 投票作成が正常に完了する
# ✓ エラーハンドリングが正常に動作する
```

#### 8.2 手動での動作確認

1. ウォレット接続が正常に動作する
2. 投票作成フォームが正しく表示される
3. フォーム入力が正常に動作する
4. トランザクション承認待ちメッセージが表示される
5. トランザクション完了メッセージが表示される
6. 投票詳細ページにリダイレクトされる

---

**作成日**: 2025年7月2日
**作成者**: AI Assistant
**対象問題**: トランザクション完了後の処理が正常に動作しない問題
**調査方法**: モック適用状況、トランザクション処理、イベント処理の詳細デバッグ