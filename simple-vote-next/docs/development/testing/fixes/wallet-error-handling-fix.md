# ウォレットエラーハンドリング修正ガイド

## 概要
`wallet-error-handling-test-report.md`のテスト結果から判明した問題点とその修正方法をまとめています。

## 主要な問題点

### 1. Toastメッセージの表示問題
**問題**: エラーメッセージのToastが正しく表示されていない
**影響**: ユーザーにエラー情報が適切に伝わらない

### 2. UI要素の表示問題
**問題**: ウォレット接続ボタンやアカウントアドレスが表示されない
**影響**: ユーザーが操作できない状態になる

### 3. エラーハンドリングの実装問題
**問題**: エラー状態からの復旧が正しく動作していない
**影響**: エラー発生後に正常な状態に戻れない

## 修正方法

### 1. Toastメッセージの表示ロジック修正

#### 問題の詳細
- `waitForToast(page, 'MetaMaskがインストールされていません')`が`false`を返す
- `waitForToast(page, 'サポートされていないネットワークです')`が`false`を返す

#### 修正手順

1. **Toastコンポーネントの確認**
```typescript
// components/Toast.tsx の確認
// Toastメッセージが正しく表示されるか確認
```

2. **エラーメッセージの統一**
```typescript
// lib/constants.ts にエラーメッセージを定義
export const ERROR_MESSAGES = {
  METAMASK_NOT_INSTALLED: 'MetaMaskがインストールされていません',
  UNSUPPORTED_NETWORK: 'サポートされていないネットワークです',
  CONNECTION_REJECTED: 'ウォレット接続が拒否されました',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  TIMEOUT_ERROR: '接続がタイムアウトしました',
  UNEXPECTED_ERROR: '予期しないエラーが発生しました'
} as const;
```

3. **Toast表示ロジックの改善**
```typescript
// components/WalletProvider.tsx の修正
const showErrorToast = (message: string) => {
  // Toast表示の確実な実行
  if (typeof window !== 'undefined') {
    // ブラウザ環境でのみ実行
    toast.error(message);
  }
};
```

### 2. UI状態管理の改善

#### 問題の詳細
- ウォレット接続ボタンが見つからない
- アカウントアドレス表示要素が見つからない

#### 修正手順

1. **コンポーネントの状態管理改善**
```typescript
// components/WalletProvider.tsx
interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  account: string | null;
  error: string | null;
  showConnectButton: boolean;
}

const [walletState, setWalletState] = useState<WalletState>({
  isConnected: false,
  isConnecting: false,
  account: null,
  error: null,
  showConnectButton: true
});
```

2. **エラー状態でのUI表示制御**
```typescript
// エラー発生時の状態更新
const handleError = (error: Error) => {
  setWalletState(prev => ({
    ...prev,
    isConnecting: false,
    error: error.message,
    showConnectButton: true, // エラー時は接続ボタンを表示
    account: null
  }));

  showErrorToast(error.message);
};
```

3. **条件付きレンダリングの改善**
```typescript
// ウォレット接続ボタンの表示条件
{walletState.showConnectButton && !walletState.isConnected && (
  <button
    onClick={connectWallet}
    disabled={walletState.isConnecting}
    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
  >
    {walletState.isConnecting ? '接続中...' : 'ウォレット接続'}
  </button>
)}

// アカウントアドレス表示
{walletState.isConnected && walletState.account && (
  <div className="font-mono text-sm">
    {walletState.account}
  </div>
)}
```

### 3. モック機能の修正

#### 問題の詳細
- テスト用のモック機能が正しく動作していない
- エラーシミュレーションが不完全

#### 修正手順

1. **モック機能の改善**
```typescript
// tests/helpers/ethers-mock.ts
export const mockEthers = {
  providers: {
    Web3Provider: class MockWeb3Provider {
      constructor(provider: any) {
        this.provider = provider;
      }

      async getSigner() {
        return {
          getAddress: async () => '0x1234567890123456789012345678901234567890',
          signMessage: async (message: string) => '0x...'
        };
      }

      async getNetwork() {
        return { chainId: 31337 }; // Hardhat network
      }
    }
  }
};

// エラーシミュレーション用のモック
export const createErrorMock = (errorType: string) => {
  switch (errorType) {
    case 'METAMASK_NOT_INSTALLED':
      return () => {
        throw new Error('MetaMaskがインストールされていません');
      };
    case 'UNSUPPORTED_NETWORK':
      return () => {
        throw new Error('サポートされていないネットワークです');
      };
    default:
      return () => {
        throw new Error('予期しないエラーが発生しました');
      };
  }
};
```

2. **テストヘルパー関数の改善**
```typescript
// tests/helpers/wallet-helper.ts
export const waitForToast = async (page: Page, message: string, timeout = 5000): Promise<boolean> => {
  try {
    // Toast要素の存在確認
    const toastSelector = '[data-testid="toast"], .toast, [role="alert"]';

    // 複数のToast要素セレクターを試行
    const toast = await page.waitForSelector(toastSelector, { timeout });

    if (toast) {
      const toastText = await toast.textContent();
      return toastText?.includes(message) || false;
    }

    return false;
  } catch (error) {
    console.log(`Toast待機エラー: ${error}`);
    return false;
  }
};

export const waitForWalletConnection = async (page: Page, timeout = 10000): Promise<boolean> => {
  try {
    // アカウントアドレス表示の待機
    await page.waitForSelector('.font-mono', { timeout });
    return true;
  } catch (error) {
    console.log(`ウォレット接続待機エラー: ${error}`);
    return false;
  }
};
```

### 4. テストケースの修正

#### 修正手順

1. **テストの安定性向上**
```typescript
// tests/wallet-error-handling.spec.ts
test('MetaMask未インストール時のエラーハンドリング', async ({ page }) => {
  // モックの設定
  await page.addInitScript(() => {
    window.ethereum = undefined;
  });

  await page.goto('/');

  // 接続ボタンのクリック
  const connectButton = page.getByRole('button', { name: 'ウォレット接続' });
  await connectButton.click();

  // Toastメッセージの確認（複数のセレクターを試行）
  const toastFound = await waitForToast(page, 'MetaMaskがインストールされていません');
  expect(toastFound).toBe(true);
});
```

2. **エラー状態のリセット**
```typescript
// 各テストの前に状態をリセット
test.beforeEach(async ({ page }) => {
  await page.goto('/');

  // ページのリロードで状態をリセット
  await page.reload();

  // 初期状態の確認
  await page.waitForLoadState('networkidle');
});
```

## 実装優先順位

### 高優先度
1. Toastメッセージの表示ロジック修正
2. UI状態管理の改善
3. 基本的なエラーハンドリングの実装

### 中優先度
1. モック機能の改善
2. テストヘルパー関数の改善
3. テストケースの修正

### 低優先度
1. エラーメッセージの多言語対応
2. より詳細なエラーログの実装
3. パフォーマンス最適化

## 検証方法

### 1. 手動テスト
```bash
# 開発サーバーの起動
cd simple-vote-next
npm run dev
```

### 2. 自動テスト
```bash
# テストの実行
npm run test:playwright

# 特定のテストファイルの実行
npx playwright test wallet-error-handling.spec.ts
```

### 3. テスト結果の確認
```bash
# テストレポートの生成
npx playwright show-report
```

## 注意事項

1. **ブラウザ環境の確認**: Toast表示はブラウザ環境でのみ動作するため、SSRとの整合性に注意
2. **エラー状態の永続化**: ページリロード時にエラー状態がリセットされることを確認
3. **ユーザビリティ**: エラーメッセージはユーザーにとって理解しやすい内容にする
4. **セキュリティ**: エラーログに機密情報が含まれないよう注意

## 参考資料

- [Playwright Testing Best Practices](https://playwright.dev/docs/best-practices)
- [React Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Toast Notification Patterns](https://www.nngroup.com/articles/toast-notifications/)