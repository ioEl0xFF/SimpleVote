# ウォレットエラーハンドリング追加修正ガイド

## 概要
`wallet-error-handling-fix.md`で実施した基本修正に続く、残存問題の解決方法をまとめています。

## テスト結果から判明した残存問題

### 1. Toast表示の問題
**問題**: 一部のエラーメッセージが正しく表示されていない
**影響**: ユーザーにエラー情報が適切に伝わらない

### 2. 再接続テストの問題
**問題**: エラー状態からの復旧が正しく動作していない
**影響**: エラー発生後の正常な状態への復旧ができない

### 3. モック機能の問題
**問題**: テスト環境でのモック設定と実際のアプリケーションの動作に違いがある
**影響**: テストが不安定になる

## 追加修正方法

### 1. Toast表示のタイミング調整

#### 問題の詳細
- `waitForToast(page, '接続がタイムアウトしました')`が`false`を返す
- エラーメッセージが「予期しないエラーが発生しました」として表示される

#### 修正手順

1. **Toast表示の遅延処理**
```typescript
// components/WalletProvider.tsx の修正
const showErrorToast = (message: string) => {
    // Toast表示の確実な実行
    if (typeof window !== 'undefined') {
        // ブラウザ環境でのみ実行
        console.error('Wallet Error:', message);

        // 遅延処理でToast表示を確実にする
        setTimeout(() => {
            showToast(message, 'error');
        }, 100);
    }
};
```

2. **エラーメッセージの分類改善**
```typescript
// エラーメッセージの分類をより詳細に
let errorMessage: string = ERROR_MESSAGES.UNEXPECTED_ERROR;

if (err.message.includes('MetaMaskがインストールされていません')) {
    errorMessage = ERROR_MESSAGES.METAMASK_NOT_INSTALLED;
} else if (
    err.message.includes('User rejected') ||
    err.message.includes('ウォレット接続が拒否されました')
) {
    errorMessage = ERROR_MESSAGES.CONNECTION_REJECTED;
} else if (
    err.message.includes('Network error') ||
    err.message.includes('Failed to fetch')
) {
    errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
} else if (
    err.message.includes('timeout') ||
    err.message.includes('Request timeout') ||
    err.message.includes('接続がタイムアウトしました')
) {
    errorMessage = ERROR_MESSAGES.TIMEOUT_ERROR;
} else if (
    err.message.includes('サポートされていないネットワーク') ||
    err.message.includes('unsupported network')
) {
    errorMessage = ERROR_MESSAGES.UNSUPPORTED_NETWORK;
}
```

### 2. モック機能のさらなる改善

#### 問題の詳細
- エラーシミュレーションが不完全
- テスト環境での状態管理が不安定

#### 修正手順

1. **エラーモックの改善**
```typescript
// tests/helpers/ethers-mock.ts の修正
export async function simulateWalletError(page: Page, errorType: string) {
    console.log(`Simulating wallet error: ${errorType}`);

    await page.addInitScript((errorType) => {
        // 既存のethereumオブジェクトを保存
        const originalEthereum = (window as any).ethereum;

        // エラーシミュレーション用のモック
        const createErrorMock = (type: string) => {
            switch (type) {
                case 'METAMASK_NOT_INSTALLED':
                    return () => {
                        throw new Error('MetaMaskがインストールされていません');
                    };
                case 'UNSUPPORTED_NETWORK':
                    return () => {
                        throw new Error('サポートされていないネットワークです');
                    };
                case 'CONNECTION_REJECTED':
                    return () => {
                        throw new Error('ウォレット接続が拒否されました');
                    };
                case 'NETWORK_ERROR':
                    return () => {
                        throw new Error('ネットワークエラーが発生しました');
                    };
                case 'TIMEOUT_ERROR':
                    return () => {
                        throw new Error('接続がタイムアウトしました');
                    };
                default:
                    return () => {
                        throw new Error('予期しないエラーが発生しました');
                    };
            }
        };

        // window.ethereumをエラーモックに置き換え
        Object.defineProperty(window, 'ethereum', {
            value: {
                request: createErrorMock(errorType),
                on: () => {},
                removeListener: () => {},
                isMetaMask: false,
            },
            configurable: true,
        });

        console.log(`Error mock set up for: ${errorType}`);
    }, errorType);

    // ページをリロードしてモックを適用
    await page.reload();
    await page.waitForLoadState('networkidle');
}

// 正常な状態への復旧機能の改善
export async function restoreEthereum(page: Page) {
    console.log('Restoring normal ethereum state...');

    await page.addInitScript(() => {
        // 元のethersモックを再適用
        setupEthersMock(page);
    });

    // ページをリロードしてモックを適用
    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('Ethereum state restored');
}
```

2. **テストヘルパー関数の改善**
```typescript
// tests/helpers/wallet-helper.ts の修正
export const waitForToast = async (page: Page, message: string, timeout = 5000): Promise<boolean> => {
    try {
        // Toast要素の存在確認
        const toastSelectors = [
            '[data-testid="toast"]',
            '.toast',
            '[role="alert"]',
            '.fixed.top-4.right-4'
        ];

        // 複数のToast要素セレクターを試行
        for (const selector of toastSelectors) {
            try {
                const toast = await page.waitForSelector(selector, { timeout: timeout / 4 });
                if (toast) {
                    const toastText = await toast.textContent();
                    if (toastText?.includes(message)) {
                        console.log(`Toast found with message: ${message}`);
                        return true;
                    }
                }
            } catch (error) {
                console.log(`Selector ${selector} not found, trying next...`);
            }
        }

        // より詳細なログ出力
        console.log(`Toast with message "${message}" not found`);
        console.log('Available toast elements:');
        for (const selector of toastSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0) {
                for (const element of elements) {
                    const text = await element.textContent();
                    console.log(`- ${selector}: "${text}"`);
                }
            }
        }

        return false;
    } catch (error) {
        console.log(`Toast待機エラー: ${error}`);
        return false;
    }
};
```

### 3. テストケースの微調整

#### 修正手順

1. **テストの安定性向上**
```typescript
// tests/wallet-error-handling.spec.ts の修正
test.beforeEach(async ({ page }) => {
    await page.goto('/test');
    walletHelper = new WalletHelper(page);

    // ページのリロードで状態をリセット
    await page.reload();

    // 初期状態の確認
    await page.waitForLoadState('networkidle');

    // 追加の待機時間
    await page.waitForTimeout(1000);
});

// タイムアウトテストの修正
test('接続タイムアウト時のエラーメッセージ', async ({ page }) => {
    // タイムアウトエラーをシミュレート
    await simulateWalletError(page, 'TIMEOUT_ERROR');

    // ウォレット接続ボタンをクリック
    await page.getByRole('button', { name: 'ウォレット接続' }).click();

    // エラーメッセージが表示されることを確認（タイムアウト延長）
    const toastFound = await waitForToast(page, '接続がタイムアウトしました', 10000);
    expect(toastFound).toBe(true);
});
```

2. **再接続テストの改善**
```typescript
test('タイムアウト後の再接続試行', async ({ page }) => {
    // タイムアウトエラーをシミュレート
    await simulateWalletError(page, 'TIMEOUT_ERROR');

    // ウォレット接続ボタンをクリック
    await page.getByRole('button', { name: 'ウォレット接続' }).click();

    // エラーメッセージを待機
    await waitForToast(page, '接続がタイムアウトしました');

    // 正常な接続に戻す
    await restoreEthereum(page);

    // 追加の待機時間
    await page.waitForTimeout(2000);

    // 再度接続を試行
    await page.getByRole('button', { name: 'ウォレット接続' }).click();

    // 今度は成功することを確認（タイムアウト延長）
    await expect(page.locator('.font-mono')).toBeVisible({ timeout: 10000 });
});
```

### 4. 状態管理の改善

#### 修正手順

1. **エラー状態のリセット機能**
```typescript
// components/WalletProvider.tsx の修正
const resetErrorState = () => {
    setWalletState(prev => ({
        ...prev,
        error: null,
        isConnecting: false,
        showConnectButton: true
    }));
};

// 接続成功時の状態更新
const handleConnectionSuccess = (account: string) => {
    setWalletState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        account: account,
        error: null,
        showConnectButton: false
    }));
};
```

2. **エラーハンドリングの改善**
```typescript
// エラーハンドリングの改善
try {
    // 接続処理
    const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
    });

    if (accounts.length === 0) {
        throw new Error(ERROR_MESSAGES.CONNECTION_REJECTED);
    }

    // ネットワークチェック
    const chainId = await window.ethereum.request({
        method: 'eth_chainId',
    });

    // サポートされているネットワークかチェック
    const supportedNetworks = ['0x1', '0x5', '0xaa36a7']; // Mainnet, Goerli, Sepolia
    if (!supportedNetworks.includes(chainId)) {
        throw new Error(ERROR_MESSAGES.UNSUPPORTED_NETWORK);
    }

    // 接続成功
    handleConnectionSuccess(accounts[0]);
} catch (err: any) {
    console.error('Wallet connection error:', err);
    handleConnectionError(err);
}
```

## 実装優先順位

### 高優先度
1. Toast表示のタイミング調整
2. エラーメッセージの分類改善
3. モック機能の改善

### 中優先度
1. テストケースの微調整
2. 状態管理の改善
3. エラー状態のリセット機能

### 低優先度
1. より詳細なログ出力
2. パフォーマンス最適化
3. ユーザビリティの向上

## 検証方法

### 1. 手動テスト
```bash
# 開発サーバーの起動
cd simple-vote-next
npm run dev
```

### 2. 自動テスト
```bash
# 特定のテストファイルの実行
npm test -- wallet-error-handling.spec.ts

# ヘッドレスモードでの実行
npm test -- wallet-error-handling.spec.ts --headed
```

### 3. テスト結果の確認
```bash
# テストレポートの生成
npm run test:debug
```

## 注意事項

1. **タイミングの問題**: Toast表示は非同期処理のため、適切な待機時間が必要
2. **モックの整合性**: テスト環境と実際の環境での動作の違いに注意
3. **状態の永続化**: ページリロード時の状態リセットを確実に行う
4. **エラーハンドリング**: 予期しないエラーも適切に処理する

## 参考資料

- [Playwright Testing Best Practices](https://playwright.dev/docs/best-practices)
- [React Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Toast Notification Patterns](https://www.nngroup.com/articles/toast-notifications/)
- [JavaScript Error Handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)