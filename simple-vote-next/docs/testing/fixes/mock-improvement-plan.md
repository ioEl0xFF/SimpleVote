# モック設定改善計画

## 現在の問題状況

### テスト失敗の詳細

-   **失敗テスト**: `投票一覧が表示される（データがある場合）`
-   **失敗時間**: 30 秒タイムアウト
-   **エラー箇所**: `page.waitForFunction()` で投票項目ボタン（`ul li button`）が 3 つ以上表示されるのを待機中

### 根本的なエラー

```javascript
Failed to fetch polls: TypeError: invalid BytesLike value
(argument="value", value=null, code=INVALID_ARGUMENT, version=6.14.4)

Page Error: invalid numeric value
(argument="%response", value=null, code=INVALID_ARGUMENT, version=6.14.4)
```

### 現在のモック実装の問題点

1. **複雑すぎるモック戦略**

    - `contract-mock.ts`: 複数の方法で ethers ライブラリを上書き（setTimeout、webpack、globalThis）
    - `wallet-mock.ts`: 独立した ethers モック設定
    - 2 つのファイルで異なる`ethers.Contract`クラスを定義

2. **BrowserProvider の不完全なモック**

    - `getBlockNumber()` メソッドで null 値を返している
    - `call()` メソッドの実装が不十分
    - ネットワーク情報の取得処理に問題

3. **タイミングの問題**
    - Next.js のハイドレーション完了前にモックが適用される
    - 実際の ethers ライブラリ読み込み後の上書きが不安定

## 改善方針

### 1. シンプルな単一モック戦略への移行

**現在の問題**:

-   `contract-mock.ts`と`wallet-mock.ts`で重複した ethers モック
-   複数の上書き手法が競合

**改善策**:

```typescript
// unified-mock.ts（新規作成）
export async function setupUnifiedEthersMock(page: any, config: UnifiedMockConfig) {
    await page.addInitScript((config) => {
        // 単一の統合されたethersモック
        window.ethers = {
            BrowserProvider: MockBrowserProvider,
            Contract: MockContract,
            parseEther: (value) => BigInt(value) * BigInt(10 ** 18),
            formatEther: (value) => (Number(value) / 10 ** 18).toString(),
        };
    }, config);
}
```

### 2. BrowserProvider の完全な実装

**現在の問題**:

```javascript
async getBlockNumber() {
    return 12345678; // 固定値だが、内部処理でnullになっている
}
```

**改善策**:

```javascript
class MockBrowserProvider {
    async getBlockNumber() {
        return Promise.resolve(12345678); // Promiseで確実に返す
    }

    async call(transaction) {
        // 確実に有効な値を返す
        if (!transaction || !transaction.data) {
            return '0x0000000000000000000000000000000000000000000000000000000000000000';
        }

        // getPolls呼び出しを検出
        if (transaction.data.includes('bb6e4e71')) {
            return this.mockGetPollsResponse();
        }

        return '0x0000000000000000000000000000000000000000000000000000000000000001';
    }

    async send(method, params) {
        // 全てのメソッドで有効な値を保証
        switch (method) {
            case 'eth_call':
                return this.call(params[0]);
            case 'eth_getBlockNumber':
                return '0xbc614e'; // 16進数文字列として返す
            default:
                return null;
        }
    }
}
```

### 3. コントラクトモックの単純化

**現在の問題**:

-   複雑な ABI 処理とデータエンコーディング
-   webpack 上書きなどの不安定な手法

**改善策**:

```javascript
class MockContract {
    constructor(address, abi, provider) {
        this.address = address;
        this.abi = abi;
        this.provider = provider;
        this._mockData = config.polls || [];
    }

    async getPolls() {
        // 直接的にモックデータを返す
        const pollIds = this._mockData.map((p) => BigInt(p.id));
        const pollTypes = this._mockData.map((p) => this.getTypeNumber(p.type));
        const owners = this._mockData.map((p) => p.owner);
        const topics = this._mockData.map((p) => p.topic);

        return [pollIds, pollTypes, owners, topics];
    }

    getTypeNumber(type) {
        switch (type) {
            case 'dynamic':
                return 0n;
            case 'weighted':
                return 1n;
            case 'simple':
                return 2n;
            default:
                return 0n;
        }
    }
}
```

### 4. テスト実行フローの改善

**現在の問題**:

```javascript
// テスト内で複雑な段階的モック設定
await page.evaluate((defaultPolls) => {
    // 長大な評価コード...
}, defaultPolls);
```

**改善策**:

```javascript
test('投票一覧が表示される（データがある場合）', async ({ page }) => {
    // 1. 統合モックの設定（ページ読み込み前）
    await setupUnifiedEthersMock(page, {
        polls: defaultPolls,
        walletAddress: '0x1234567890123456789012345678901234567890',
    });

    // 2. ページ読み込み
    await page.goto('/');

    // 3. ウォレット接続（シンプルなクリック）
    await page.click('text=ウォレット接続');

    // 4. データ読み込み完了の待機（具体的な要素）
    await expect(page.locator('ul li button')).toHaveCount(3);
});
```

## 実装優先順位

### Phase 1: 緊急修正

1. `BrowserProvider.getBlockNumber()` の null 値問題修正
2. `BrowserProvider.call()` の確実な戻り値設定
3. 既存テストの最小限修正で実行可能にする

### Phase 2: 構造改善

1. `unified-mock.ts` の作成
2. 重複するモック設定の統合
3. テストケースの簡素化

### Phase 3: 拡張対応

1. エラーケースのモック追加
2. パフォーマンステストのサポート
3. 複雑なシナリオ対応

## 検証方法

### 1. 単体テスト

```bash
# 特定のテストケースのみ実行
npm run test:e2e -- --grep "投票一覧が表示される"
```

### 2. デバッグ実行

```javascript
// モック設定直後の状態確認
await page.evaluate(() => {
    console.log('ethers object:', window.ethers);
    console.log('BrowserProvider:', typeof window.ethers?.BrowserProvider);
    console.log('Contract:', typeof window.ethers?.Contract);
});
```

### 3. 段階的検証

1. ウォレット接続のみのテスト
2. コントラクト初期化のテスト
3. データ取得のテスト
4. UI 表示のテスト

## 期待される結果

### 修正前の状態

```
❌ Test timeout of 30000ms exceeded
❌ Failed to fetch polls: invalid BytesLike value
❌ Page Error: invalid numeric value
```

### 修正後の期待状態

```
✅ ウォレット接続成功
✅ コントラクト初期化成功
✅ getPolls()呼び出し成功
✅ 投票項目3つが表示
✅ テスト完了時間: 5-10秒以内
```

## 追加の注意事項

### 1. ethers.js v6 の特徴

-   BigInt 使用が必須
-   プロバイダーとシグナーの分離
-   非同期処理の徹底

### 2. Next.js 環境での考慮事項

-   サーバーサイドレンダリング
-   ハイドレーションのタイミング
-   動的インポートの影響

### 3. テスト環境の制約

-   Playwright のセキュリティ制限
-   ブラウザ環境でのモック制限
-   実際のネットワーク接続の排除
