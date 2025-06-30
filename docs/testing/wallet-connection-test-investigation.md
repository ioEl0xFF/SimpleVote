# ウォレット接続テスト問題調査手順書

## 問題概要
**テスト項目**: 「ホームページのタイトル表示（ウォレット接続時）」
**エラー**: `Timed out 5000ms waiting for expect(locator).toBeVisible()`
**原因**: ウォレット接続シミュレーションが正しく動作していない可能性

## 調査対象ファイル
- `simple-vote-next/tests/basic-ui-navigation.spec.ts` (行85-95)
- `simple-vote-next/app/page.tsx` (行175-179)
- `simple-vote-next/components/App.tsx` (行1-45)
- `simple-vote-next/components/WalletProvider.tsx` (行1-94)

## 調査手順

### 1. 現在のテスト実装の確認

#### 1.1 テストコードの分析
```typescript
// 現在のテスト実装（basic-ui-navigation.spec.ts 行85-95）
test('ホームページのタイトル表示（ウォレット接続時）', async ({ page }) => {
    // ウォレット接続をシミュレート
    await page.evaluate(() => {
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem(
            'accountAddress',
            '0x1234567890123456789012345678901234567890'
        );
        window.dispatchEvent(
            new CustomEvent('walletConnected', {
                detail: { address: '0x1234567890123456789012345678901234567890' },
            })
        );
    });

    // ページをリロードしてウォレット接続状態を反映
    await page.reload();

    await expect(page.locator('h1').first()).toHaveText('SimpleVote');
    await expect(page.locator('text=投票一覧')).toBeVisible(); // 接続時は表示
});
```

#### 1.2 問題点の特定
1. **localStorageの使用**: アプリケーションはlocalStorageを使用していない
2. **カスタムイベント**: アプリケーションは`walletConnected`イベントをリッスンしていない
3. **状態管理**: WalletProviderの状態が正しく更新されていない

### 2. アプリケーションの状態管理フロー確認

#### 2.1 WalletProviderの状態管理
```typescript
// WalletProvider.tsx の状態管理
const [signer, setSigner] = useState<ethers.Signer | null>(null);
const [account, setAccount] = useState('');
```

#### 2.2 App.tsxの条件分岐
```typescript
// App.tsx の表示条件
{!signer ? (
    <button>ウォレット接続</button>
) : (
    <>
        <div>アカウント情報</div>
        {children} // ここに投票一覧が表示される
    </>
)}
```

#### 2.3 page.tsxのタイトル表示
```typescript
// page.tsx のタイトル
<PageHeader title="投票一覧" showHomeButton={false} />
```

### 3. 調査手順

#### 3.1 現在のテスト実行とデバッグ
```bash
# テストを実行して詳細なログを確認
cd simple-vote-next
npx playwright test basic-ui-navigation.spec.ts --headed --debug
```

#### 3.2 ブラウザでの動作確認
```bash
# 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:3000 にアクセス
# 手動でウォレット接続を試行
```

#### 3.3 テスト環境でのウォレット接続シミュレーション方法の調査

##### 方法1: window.ethereumのモック
```typescript
// テストファイルでwindow.ethereumをモック
await page.addInitScript(() => {
    window.ethereum = {
        request: async (args: any) => {
            if (args.method === 'eth_requestAccounts') {
                return ['0x1234567890123456789012345678901234567890'];
            }
            return null;
        },
        on: () => {},
        removeListener: () => {},
    };
});
```

##### 方法2: WalletProviderの状態を直接操作
```typescript
// WalletProviderの状態を直接更新
await page.evaluate(() => {
    // Reactの状態を直接操作する方法を調査
    // ただし、これは推奨されない
});
```

##### 方法3: テスト用のウォレット接続ヘルパー作成
```typescript
// tests/helpers/wallet-helper.ts を作成
export async function simulateWalletConnection(page: Page) {
    // ウォレット接続のシミュレーション処理
}
```

### 4. 修正案の検討

#### 4.1 推奨修正案: window.ethereumのモック
```typescript
test('ホームページのタイトル表示（ウォレット接続時）', async ({ page }) => {
    // window.ethereumをモック
    await page.addInitScript(() => {
        window.ethereum = {
            request: async (args: any) => {
                if (args.method === 'eth_requestAccounts') {
                    return ['0x1234567890123456789012345678901234567890'];
                }
                if (args.method === 'personal_sign') {
                    return '0x1234567890123456789012345678901234567890';
                }
                return null;
            },
            on: () => {},
            removeListener: () => {},
        };
    });

    await page.goto('/');
    
    // ウォレット接続ボタンをクリック
    await page.getByRole('button', { name: 'ウォレット接続' }).click();
    
    // 接続後の状態を確認
    await expect(page.locator('h1').first()).toHaveText('SimpleVote');
    await expect(page.locator('text=投票一覧')).toBeVisible();
});
```

#### 4.2 代替修正案: テスト用の環境変数
```typescript
// テスト環境でウォレット接続状態を強制
process.env.TEST_WALLET_CONNECTED = 'true';
process.env.TEST_ACCOUNT_ADDRESS = '0x1234567890123456789012345678901234567890';
```

### 5. 実装手順

#### 5.1 ヘルパー関数の作成
```bash
# tests/helpers/wallet-helper.ts を作成
touch simple-vote-next/tests/helpers/wallet-helper.ts
```

#### 5.2 テストファイルの修正
```bash
# basic-ui-navigation.spec.ts を修正
# ウォレット接続シミュレーションを適切に実装
```

#### 5.3 テストの実行と検証
```bash
# 修正後のテストを実行
npx playwright test basic-ui-navigation.spec.ts --headed
```

### 6. 期待される結果

#### 6.1 成功時の動作
- ウォレット接続ボタンがクリックされる
- アカウントアドレスが表示される
- 「切断」ボタンが表示される
- 「新規作成」ボタンが表示される
- 「投票一覧」セクションが表示される

#### 6.2 失敗時の対処
- エラーメッセージの詳細確認
- デバッグログの分析
- 代替実装方法の検討

### 7. 追加調査項目

#### 7.1 ネットワーク接続の確認
- Hardhatローカルネットワークの起動確認
- コントラクトアドレスの設定確認

#### 7.2 ブラウザ互換性の確認
- 異なるブラウザでの動作確認
- Playwrightの設定確認

#### 7.3 パフォーマンスの確認
- ウォレット接続の応答時間
- ページ読み込み時間

### 8. 参考資料

#### 8.1 Playwright公式ドキュメント
- [Playwright Testing](https://playwright.dev/docs/intro)
- [Mocking and Intercepting](https://playwright.dev/docs/network)

#### 8.2 MetaMask関連
- [MetaMask Provider API](https://docs.metamask.io/guide/ethereum-provider.html)
- [Ethers.js BrowserProvider](https://docs.ethers.org/v6/api/providers/#BrowserProvider)

#### 8.3 テスト関連
- [React Testing Best Practices](https://react.dev/learn/testing)
- [Next.js Testing](https://nextjs.org/docs/testing)

## 注意事項

1. **セキュリティ**: テスト用のアカウントアドレスは実際のウォレットと混同しないよう注意
2. **環境分離**: テスト環境と本番環境の設定を明確に分離
3. **データクリーンアップ**: テスト後の状態を適切にリセット
4. **エラーハンドリング**: ネットワークエラーやタイムアウトの適切な処理

この手順書に従って調査を進めることで、ウォレット接続テストの問題を特定し、適切な修正を行うことができます。 