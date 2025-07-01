# BigNumberishエラー原因調査手順書

## 概要

このドキュメントは、SimpleVoteアプリケーションで発生している「invalid BigNumberish value」エラーの原因を特定し、修正するための詳細な調査手順を説明します。

## エラーの概要

### 発生状況
- **エラーメッセージ**: `"エラー: invalid BigNumberish value"`
- **発生箇所**: 投票作成時の`registry.createPoll()`呼び出し
- **影響範囲**: すべての投票タイプ（Dynamic Vote、Weighted Vote、Simple Vote）

### エラーの特徴
- ethers.jsのBigNumberish型変換で発生
- 数値パラメータの型変換に問題がある可能性
- モック環境でのみ発生している可能性

## 調査手順

### ステップ1: エラーの詳細ログ取得

#### 1.1 ブラウザコンソールログの確認
```bash
# テスト実行時に詳細ログを有効化
npx playwright test tests/poll-creation.spec.ts --debug
```

#### 1.2 モック関数の呼び出しログ確認
```typescript
// ethers-mock.tsのcreatePoll関数でログ出力を追加
console.log('createPoll called with raw values:', {
    pollType,
    topic,
    startTime,
    endTime,
    choices,
    tokenAddress,
});
console.log('Value types:', {
    pollType: typeof pollType,
    startTime: typeof startTime,
    endTime: typeof endTime,
});
```

### ステップ2: パラメータ型の調査

#### 2.1 実際のアプリケーションでのパラメータ確認
```typescript
// app/create/page.tsxのsubmit関数でログ追加
console.log('Submit parameters:', {
    pollTypeEnum,
    topic,
    s,
    eTime,
    filteredChoices,
    tokenAddress,
});
console.log('Parameter types:', {
    pollTypeEnum: typeof pollTypeEnum,
    s: typeof s,
    eTime: typeof eTime,
    tokenAddress: typeof tokenAddress,
});
```

#### 2.2 スマートコントラクトの期待する型確認
```solidity
// contracts/PollRegistry.solのcreatePoll関数シグネチャ
function createPoll(
    PollType _pollType,      // uint8
    string memory _topic,    // string
    uint256 _startTime,      // uint256
    uint256 _endTime,        // uint256
    string[] memory _choiceNames, // string[]
    address _tokenAddress    // address
) external returns (uint256 pollId)
```

### ステップ3: ethers.jsモックの型変換問題調査

#### 3.1 現在のモック実装の問題点確認
```typescript
// ethers-mock.tsのcreatePoll関数
async createPoll(
    pollType: any,        // ← 型がanyになっている
    topic: string,
    startTime: any,       // ← 型がanyになっている
    endTime: any,         // ← 型がanyになっている
    choices: string[],
    tokenAddress: string
) {
    // 数値をBigIntに変換
    const pollTypeBigInt = BigInt(pollType);    // ← ここでエラー発生の可能性
    const startTimeBigInt = BigInt(startTime);  // ← ここでエラー発生の可能性
    const endTimeBigInt = BigInt(endTime);      // ← ここでエラー発生の可能性
}
```

#### 3.2 型変換の安全性確認
```typescript
// 安全な型変換関数の実装
function safeToBigInt(value: any): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    if (typeof value === 'string') {
        // 数値文字列かチェック
        if (/^\d+$/.test(value)) {
            return BigInt(value);
        }
        throw new Error(`Invalid number string: ${value}`);
    }
    throw new Error(`Cannot convert ${typeof value} to BigInt: ${value}`);
}
```

### ステップ4: 実際のethers.js動作との比較

#### 4.1 本番環境での動作確認
```bash
# ローカル開発サーバーで実際のethers.jsを使用
npm run dev
```

#### 4.2 パラメータの型変換確認
```typescript
// 実際のethers.jsでの型変換テスト
import { ethers } from 'ethers';

// テストケース
const testCases = [
    { value: 0, expected: 'number' },
    { value: '0', expected: 'string' },
    { value: BigInt(0), expected: 'bigint' },
    { value: '0x0', expected: 'string' },
];

testCases.forEach(({ value, expected }) => {
    console.log(`${value} (${typeof value}) -> ethers.js conversion`);
});
```

### ステップ5: モック実装の修正

#### 5.1 型安全なモック実装
```typescript
// ethers-mock.tsの修正版
async createPoll(
    pollType: number | string | bigint,
    topic: string,
    startTime: number | string | bigint,
    endTime: number | string | bigint,
    choices: string[],
    tokenAddress: string
) {
    // 型安全な変換
    const pollTypeBigInt = this.safeToBigInt(pollType);
    const startTimeBigInt = this.safeToBigInt(startTime);
    const endTimeBigInt = this.safeToBigInt(endTime);
    
    console.log('Converted values:', {
        pollType: pollTypeBigInt,
        startTime: startTimeBigInt,
        endTime: endTimeBigInt,
    });
    
    // バリデーション
    if (startTimeBigInt >= endTimeBigInt) {
        throw new Error('終了日時は開始日時より後を設定してください');
    }
    
    // モックトランザクション返却
    return this.createMockTransaction();
}

private safeToBigInt(value: number | string | bigint): bigint {
    try {
        if (typeof value === 'bigint') return value;
        if (typeof value === 'number') return BigInt(value);
        if (typeof value === 'string') {
            // 16進数文字列の場合は10進数に変換
            if (value.startsWith('0x')) {
                return BigInt(value);
            }
            // 10進数文字列
            return BigInt(value);
        }
        throw new Error(`Unsupported type: ${typeof value}`);
    } catch (error) {
        throw new Error(`BigNumberish conversion failed: ${value} (${typeof value})`);
    }
}
```

## 修正手順

### 修正1: ethers-mock.tsの型変換改善
```typescript
// ethers-mock.tsの修正
export async function setupEthersMock(page: Page) {
    await page.addInitScript(() => {
        // ... 既存のコード ...
        
        // 型安全なBigInt変換関数
        function safeToBigInt(value: any): bigint {
            if (value === null || value === undefined) {
                throw new Error('Value is null or undefined');
            }
            if (typeof value === 'bigint') return value;
            if (typeof value === 'number') return BigInt(value);
            if (typeof value === 'string') {
                // 空文字列チェック
                if (value.trim() === '') {
                    throw new Error('Empty string cannot be converted to BigInt');
                }
                // 数値文字列かチェック
                if (/^-?\d+$/.test(value)) {
                    return BigInt(value);
                }
                // 16進数文字列かチェック
                if (/^0x[a-fA-F0-9]+$/.test(value)) {
                    return BigInt(value);
                }
                throw new Error(`Invalid number format: ${value}`);
            }
            throw new Error(`Cannot convert ${typeof value} to BigInt: ${value}`);
        }
        
        // MockContractクラスの修正
        class MockContract {
            // ... 既存のコード ...
            
            async createPoll(
                pollType: any,
                topic: string,
                startTime: any,
                endTime: any,
                choices: string[],
                tokenAddress: string
            ) {
                console.log('MockContract.createPoll called with:', {
                    pollType,
                    topic,
                    startTime,
                    endTime,
                    choices,
                    tokenAddress,
                });
                
                console.log('Parameter types:', {
                    pollType: typeof pollType,
                    startTime: typeof startTime,
                    endTime: typeof endTime,
                });
                
                try {
                    // 型安全な変換
                    const pollTypeBigInt = safeToBigInt(pollType);
                    const startTimeBigInt = safeToBigInt(startTime);
                    const endTimeBigInt = safeToBigInt(endTime);
                    
                    console.log('Successfully converted to BigInt:', {
                        pollType: pollTypeBigInt,
                        startTime: startTimeBigInt,
                        endTime: endTimeBigInt,
                    });
                    
                    // バリデーション
                    if (startTimeBigInt >= endTimeBigInt) {
                        throw new Error('終了日時は開始日時より後を設定してください');
                    }
                    
                    // モックトランザクション返却
                    return {
                        wait: async () => ({
                            logs: [
                                {
                                    topics: [
                                        '0x1234567890123456789012345678901234567890',
                                        '0x0000000000000000000000000000000000000000000000000000000000000001',
                                        '0x0000000000000000000000000000000000000000000000000000000000000000',
                                        '0x1234567890123456789012345678901234567890',
                                    ],
                                    data: '0x',
                                },
                            ],
                        }),
                    };
                } catch (error) {
                    console.error('MockContract.createPoll error:', error);
                    throw error;
                }
            }
        }
    });
}
```

### 修正2: テストケースでのパラメータ確認
```typescript
// poll-creation.spec.tsの修正
test('Dynamic Vote作成', async ({ page }) => {
    // ... 既存のコード ...
    
    // パラメータの型確認を追加
    await page.evaluate(() => {
        // グローバル変数でパラメータをキャプチャ
        (window as any).capturedParams = null;
        
        // 元のcreatePollを保存
        const originalCreatePoll = (window as any).ethers.Contract.prototype.createPoll;
        
        // createPollをオーバーライド
        (window as any).ethers.Contract.prototype.createPoll = function(...args: any[]) {
            console.log('createPoll intercepted with args:', args);
            console.log('Argument types:', args.map(arg => typeof arg));
            (window as any).capturedParams = args;
            return originalCreatePoll.apply(this, args);
        };
    });
    
    // 作成実行
    await page.getByRole('button', { name: '作成' }).click();
    
    // キャプチャされたパラメータを確認
    const capturedParams = await page.evaluate(() => (window as any).capturedParams);
    console.log('Captured parameters:', capturedParams);
});
```

## 検証手順

### 1. 修正後のテスト実行
```bash
# 修正後のテスト実行
npx playwright test tests/poll-creation.spec.ts --reporter=line
```

### 2. エラーメッセージの確認
- BigNumberishエラーが解消されているか確認
- 新しいエラーが発生していないか確認

### 3. ログ出力の確認
- パラメータの型が正しく変換されているか確認
- エラーメッセージが詳細になっているか確認

## 期待される結果

### 修正後の動作
1. **BigNumberishエラーの解消**: 型変換が正常に動作
2. **詳細なログ出力**: 問題の特定が容易になる
3. **型安全性の向上**: 将来的なエラーの予防

### 成功指標
- ✅ すべてのテストケースが正常に実行される
- ✅ 投票作成が成功する
- ✅ エラーメッセージが適切に表示される
- ✅ トランザクション処理が完了する

## トラブルシューティング

### よくある問題と対処法

#### 1. 型変換エラーが続く場合
```typescript
// より詳細なデバッグ情報を追加
console.log('Raw value:', value);
console.log('Value constructor:', value.constructor);
console.log('Value toString:', value.toString());
```

#### 2. モックが適用されない場合
```typescript
// モックの適用確認
await page.evaluate(() => {
    console.log('ethers object:', (window as any).ethers);
    console.log('Contract constructor:', (window as any).ethers?.Contract);
});
```

#### 3. パラメータが期待と異なる場合
```typescript
// アプリケーション側でのパラメータ確認
// app/create/page.tsxでtoTimestamp関数の出力を確認
console.log('toTimestamp output:', {
    start: s,
    end: eTime,
    types: { start: typeof s, end: typeof eTime }
});
```

## まとめ

この手順書に従って調査を進めることで、BigNumberishエラーの根本原因を特定し、適切な修正を行うことができます。特に重要なのは：

1. **詳細なログ出力**: 問題の特定に不可欠
2. **型安全な変換**: エラーの根本原因
3. **段階的な検証**: 修正の効果確認

修正後は、すべての投票タイプで正常に投票作成ができるようになるはずです。 