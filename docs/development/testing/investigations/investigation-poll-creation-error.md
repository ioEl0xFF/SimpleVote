# 投票作成実行エラー調査ガイド

## 概要
`poll-creation.spec.ts`のテスト実行で発生している「invalid BigNumberish value」エラーの原因を特定し、修正するための詳細な調査手順書です。

## エラー概要
- **エラーメッセージ**: `invalid BigNumberish value`
- **発生箇所**: 投票作成時のコントラクト呼び出し
- **影響範囲**: Dynamic Vote、Weighted Vote、Simple Vote すべての投票タイプ
- **発生環境**: 全ブラウザ（chromium、firefox、webkit、Mobile Chrome、Mobile Safari）

## 調査手順

### 1. エラーの詳細分析

#### 1.1 エラーログの確認
```bash
# テスト実行時の詳細ログを確認
cd simple-vote-next
npx playwright test tests/poll-creation.spec.ts --reporter=line --debug
```

#### 1.2 ブラウザ開発者ツールでの確認
1. テスト実行中にブラウザの開発者ツールを開く
2. Consoleタブでエラーの詳細スタックトレースを確認
3. Networkタブでコントラクト呼び出しの詳細を確認

#### 1.3 エラーコンテキストファイルの分析
```bash
# 各テストのエラーコンテキストを確認
ls simple-vote-next/test-results/poll-creation-投票作成テスト-*/error-context.md
```

### 2. コントラクト呼び出しの調査

#### 2.1 コントラクトメソッドの確認
```solidity
// contracts/PollRegistry.sol の createPoll メソッドを確認
function createPoll(
    string memory _topic,
    uint256 _startTime,
    uint256 _endTime,
    string[] memory _options,
    PollType _pollType,
    address _tokenAddress
) external returns (uint256)
```

#### 2.2 フロントエンドでの呼び出し確認
```typescript
// app/create/page.tsx での createPoll 呼び出し部分を確認
const createPoll = async () => {
    // パラメータの型変換を確認
    const startTime = Math.floor(new Date(startDate).getTime() / 1000);
    const endTime = Math.floor(new Date(endDate).getTime() / 1000);
    
    await contract.createPoll(
        topic,
        startTime,  // BigNumberish 変換が必要
        endTime,    // BigNumberish 変換が必要
        options,
        pollType,
        tokenAddress
    );
};
```

### 3. BigNumberish変換の問題調査

#### 3.1 ethers.js の BigNumberish 型確認
```typescript
// BigNumberish は以下の型を受け入れる
type BigNumberish = string | number | BigNumber | { _hex: string; _isBigNumber?: boolean };
```

#### 3.2 現在の変換処理の確認
```typescript
// 現在の実装を確認
const startTime = Math.floor(new Date(startDate).getTime() / 1000);
const endTime = Math.floor(new Date(endDate).getTime() / 1000);

// 問題の可能性: 数値が適切に変換されていない
```

#### 3.3 正しい変換方法の実装
```typescript
import { ethers } from 'ethers';

// 正しい変換方法
const startTime = ethers.BigNumber.from(Math.floor(new Date(startDate).getTime() / 1000));
const endTime = ethers.BigNumber.from(Math.floor(new Date(endDate).getTime() / 1000));

// または文字列として渡す
const startTime = Math.floor(new Date(startDate).getTime() / 1000).toString();
const endTime = Math.floor(new Date(endDate).getTime() / 1000).toString();
```

### 4. モック環境での調査

#### 4.1 ethers-mock.ts の確認
```typescript
// tests/helpers/ethers-mock.ts を確認
// createPoll メソッドのモック実装を確認
```

#### 4.2 モックでの BigNumberish 処理確認
```typescript
// モックでの適切な処理
(window as any).ethers.Contract.prototype.createPoll = async (
    topic: string,
    startTime: any,
    endTime: any,
    options: string[],
    pollType: number,
    tokenAddress: string
) => {
    // BigNumberish の適切な処理を確認
    console.log('createPoll called with:', { topic, startTime, endTime, options, pollType, tokenAddress });
    
    // 適切なレスポンスを返す
    return Promise.resolve();
};
```

### 5. デバッグ用の修正手順

#### 5.1 フロントエンド修正
```typescript
// app/create/page.tsx の修正
const createPoll = async () => {
    try {
        // デバッグ用ログ
        console.log('Creating poll with params:', {
            topic,
            startDate,
            endDate,
            options,
            pollType,
            tokenAddress
        });

        // 適切な型変換
        const startTime = ethers.BigNumber.from(
            Math.floor(new Date(startDate).getTime() / 1000)
        );
        const endTime = ethers.BigNumber.from(
            Math.floor(new Date(endDate).getTime() / 1000)
        );

        console.log('Converted times:', { startTime: startTime.toString(), endTime: endTime.toString() });

        const tx = await contract.createPoll(
            topic,
            startTime,
            endTime,
            options,
            pollType,
            tokenAddress
        );

        console.log('Transaction sent:', tx);
        
        // 成功処理
        showToast('議題を作成しました', 'success');
        router.push('/');
    } catch (error) {
        console.error('Create poll error:', error);
        showToast(`エラー: ${error.message}`, 'error');
    }
};
```

#### 5.2 モック環境修正
```typescript
// tests/helpers/ethers-mock.ts の修正
export const setupEthersMock = async (page: Page) => {
    await page.addInitScript(() => {
        // BigNumberish の適切な処理
        const originalCreatePoll = (window as any).ethers.Contract.prototype.createPoll;
        (window as any).ethers.Contract.prototype.createPoll = async (
            topic: string,
            startTime: any,
            endTime: any,
            options: string[],
            pollType: number,
            tokenAddress: string
        ) => {
            console.log('Mock createPoll called with:', {
                topic,
                startTime: startTime?.toString(),
                endTime: endTime?.toString(),
                options,
                pollType,
                tokenAddress
            });

            // 適切なレスポンスを返す
            return Promise.resolve({
                hash: '0x1234567890abcdef',
                wait: () => Promise.resolve({ status: 1 })
            });
        };
    });
};
```

### 6. テスト修正手順

#### 6.1 テストケースの修正
```typescript
// tests/poll-creation.spec.ts の修正
test('Dynamic Vote作成', async ({ page }) => {
    // デバッグ用のコンソールログを有効化
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // フォーム入力
    await page.locator('input[placeholder*="投票のトピック"]').fill('テスト投票');
    await page.locator('input[placeholder*="選択肢 1"]').fill('選択肢1');
    await page.locator('input[placeholder*="選択肢 2"]').fill('選択肢2');

    // 作成実行前にログを確認
    await page.getByRole('button', { name: '作成' }).click();

    // エラーメッセージの詳細確認
    await waitForToast(page, 'エラー: invalid BigNumberish value');
});
```

### 7. 段階的デバッグ手順

#### 7.1 手動テスト
1. アプリケーションを起動
```bash
cd simple-vote-next
npm run dev
```

2. ブラウザで投票作成ページにアクセス
3. 開発者ツールのコンソールを開く
4. 投票作成を実行し、エラーの詳細を確認

#### 7.2 単体テスト
```bash
# 特定のテストケースのみ実行
npx playwright test tests/poll-creation.spec.ts --grep "Dynamic Vote作成"
```

#### 7.3 デバッグモード実行
```bash
# デバッグモードでテスト実行
npx playwright test tests/poll-creation.spec.ts --debug
```

### 8. 修正後の検証

#### 8.1 修正内容の確認
1. BigNumberish 変換の修正
2. エラーハンドリングの改善
3. ログ出力の追加

#### 8.2 テスト実行
```bash
# 修正後のテスト実行
npx playwright test tests/poll-creation.spec.ts --reporter=html
```

#### 8.3 手動検証
1. 各投票タイプでの作成テスト
2. エラーケースの確認
3. 成功フローの確認

## 期待される結果

### 修正後の動作
1. **投票作成成功**: 各投票タイプで正常に作成される
2. **適切なエラーハンドリング**: 明確なエラーメッセージが表示される
3. **テスト成功**: 全テストケースが成功する

### 修正ポイント
1. **BigNumberish 変換**: 適切な型変換の実装
2. **エラーログ**: 詳細なデバッグ情報の出力
3. **モック環境**: テスト環境での適切な動作

## 注意事項

1. **ethers.js バージョン**: 使用している ethers.js のバージョンを確認
2. **コントラクト互換性**: フロントエンドとコントラクトの型定義の整合性
3. **テスト環境**: モック環境と実際の環境の違いを考慮
4. **ブラウザ互換性**: 各ブラウザでの動作確認

## 参考資料

- [ethers.js BigNumberish ドキュメント](https://docs.ethers.org/v5/api/utils/bignumber/)
- [Playwright デバッグガイド](https://playwright.dev/docs/debug)
- [Solidity 型変換ガイド](https://docs.soliditylang.org/en/latest/types.html) 