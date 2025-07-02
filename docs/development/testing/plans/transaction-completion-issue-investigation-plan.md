# トランザクション完了問題の調査計画

## 問題概要

トランザクション完了後の処理が正常に動作せず、以下の問題が発生しています：
- `tx.wait()`メソッドが呼び出されない、または呼び出されてもその後の処理が実行されない
- トーストメッセージが「トランザクション承認待ち…」のまま変化しない
- 期待される「議題を作成しました」メッセージが表示されない

## 調査対象ファイル

### 主要ファイル
- `tests/poll-creation.spec.ts` - テストケース
- `tests/helpers/ethers-mock.ts` - モック実装
- `app/create/page.tsx` - アプリ側の投票作成処理
- `components/Toast.tsx` - トースト表示コンポーネント

### 関連ファイル
- `lib/constants.ts` - 定数定義
- `components/WalletProvider.tsx` - ウォレット接続処理

## 調査ステップ

### ステップ1: モック適用の確認強化

#### 1.1 アプリ側でのモック使用状況確認
```typescript
// app/create/page.tsx にログを追加
console.log('Current ethers object:', typeof ethers);
console.log('Current ethers.Contract:', typeof ethers.Contract);
console.log('Is mock applied?', ethers.isMock);
```

#### 1.2 モックと実際のethers.jsの切り替えタイミング確認
```typescript
// tests/helpers/ethers-mock.ts に追加
console.log('Mock application timing:', new Date().toISOString());
console.log('Window.ethers before mock:', window.ethers);
console.log('Window.ethers after mock:', window.ethers);
```

### ステップ2: 非同期処理の詳細調査

#### 2.1 トランザクション処理フローの詳細ログ追加
```typescript
// app/create/page.tsx の投票作成処理に追加
console.log('Starting poll creation...');
console.log('Registry contract instance:', registry);
console.log('Calling createPoll with params:', { title, description, options });

const tx = await registry.createPoll(title, description, options);
console.log('Transaction object received:', tx);
console.log('Transaction hash:', tx.hash);
console.log('Transaction wait method:', typeof tx.wait);

console.log('Calling tx.wait()...');
const receipt = await tx.wait();
console.log('Transaction receipt received:', receipt);
console.log('Transaction status:', receipt.status);
```

#### 2.2 Promiseチェーンの詳細追跡
```typescript
// エラーハンドリングの強化
try {
    const tx = await registry.createPoll(title, description, options);
    console.log('Step 1: createPoll completed');
    
    const receipt = await tx.wait();
    console.log('Step 2: tx.wait completed');
    
    // イベント処理
    console.log('Step 3: Processing events...');
} catch (error) {
    console.error('Error in poll creation:', error);
    console.error('Error stack:', error.stack);
}
```

### ステップ3: モックトランザクションオブジェクトの検証

#### 3.1 モックオブジェクトの構造確認
```typescript
// tests/helpers/ethers-mock.ts でモックオブジェクトの詳細ログ
const mockTx = {
    hash: '0x1234567890123456789012345678901234567890123456789012345678901234',
    from: '0x1234567890123456789012345678901234567890',
    to: '0x0000000000000000000000000000000000000000',
    gasLimit: '0x186A0',
    value: '0x0',
    nonce: '0x1',
    data: '0x',
    wait: async () => {
        console.log('Mock tx.wait() called at:', new Date().toISOString());
        console.log('Mock tx.wait() context:', this);
        
        // レシートの詳細ログ
        const receipt = {
            status: 1,
            transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
            logs: [
                {
                    address: '0x0000000000000000000000000000000000000000',
                    topics: ['0x...'],
                    data: '0x...'
                }
            ]
        };
        
        console.log('Mock receipt generated:', receipt);
        return receipt;
    }
};
```

#### 3.2 アプリ側の期待するオブジェクト構造との比較
```typescript
// app/create/page.tsx でトランザクションオブジェクトの検証
console.log('Expected tx properties:', Object.keys(tx));
console.log('Expected tx.wait type:', typeof tx.wait);
console.log('Expected tx.wait.toString():', tx.wait.toString());
```

### ステップ4: エラーハンドリングの強化

#### 4.1 グローバルエラーハンドラーの追加
```typescript
// tests/helpers/global-setup.ts に追加
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    console.error('Promise rejection stack:', event.reason?.stack);
});

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    console.error('Error stack:', event.error?.stack);
});
```

#### 4.2 非同期処理でのエラー伝播確認
```typescript
// 各非同期処理でエラーの詳細をログ出力
.catch((error) => {
    console.error('Error in async operation:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error; // エラーを再スロー
});
```

### ステップ5: テスト環境の確認

#### 5.1 ブラウザ環境での非同期処理実行状況
```typescript
// テスト実行前の環境確認
console.log('Test environment:', {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor,
    onLine: navigator.onLine
});

console.log('Async support:', {
    Promise: typeof Promise,
    async: typeof (async () => {}),
    await: 'available'
});
```

#### 5.2 テスト実行時のタイミング問題確認
```typescript
// テスト実行時の詳細タイミングログ
console.log('Test start time:', new Date().toISOString());
console.log('Page load time:', performance.now());

// 各ステップでのタイミング記録
const stepTimings = {
    mockSetup: 0,
    pageLoad: 0,
    walletConnect: 0,
    pollCreation: 0,
    txWait: 0,
    toastDisplay: 0
};
```

## 調査実行手順

### 1. 準備作業
1. 現在のテスト結果をバックアップ
2. 調査用のブランチを作成
3. ログ出力用の一時的なコードを追加

### 2. 段階的調査
1. **ステップ1**: モック適用の確認
2. **ステップ2**: 非同期処理の詳細調査
3. **ステップ3**: モックオブジェクトの検証
4. **ステップ4**: エラーハンドリングの強化
5. **ステップ5**: テスト環境の確認

### 3. 結果分析
1. 各ステップでのログ出力を分析
2. 問題箇所の特定
3. 解決策の検討

## 期待される結果

### 正常な場合
- モックが正しく適用されている
- `tx.wait()`が正常に呼び出される
- レシートが正しく生成される
- トーストメッセージが「議題を作成しました」に変化する

### 問題がある場合
- モックが適用されていない
- `tx.wait()`が呼び出されていない
- エラーが発生しているがキャッチされていない
- 非同期処理のタイミングに問題がある

## 次のアクション

1. **即座に実行**: ステップ1とステップ2のログ追加
2. **短期**: ステップ3とステップ4の実装
3. **中期**: ステップ5の環境確認と根本原因の特定
4. **長期**: 問題解決後のテスト安定化

## 参考資料

- [トランザクション完了問題のテスト結果分析](../results/transaction-completion-issue-test-results.md)
- [トランザクション完了問題の調査](../investigations/transaction-completion-issue.md)
- [ethers.js モック実装](../helpers/ethers-mock.ts)

---

**作成日**: 2025年7月2日
**作成者**: AI Assistant
**対象問題**: トランザクション完了後の処理が正常に動作しない問題 