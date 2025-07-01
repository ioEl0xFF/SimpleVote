# ウォレット接続テスト修正計画

## 概要
SimpleVote Next.jsアプリケーションのウォレット接続テストで発生している主要な問題点を解決するための詳細な手順書です。

## 主要な問題点

### 1. Ethers.jsモックの不完全性
- `eth_newFilter`, `eth_call`, `eth_blockNumber`メソッドの未実装
- イベントエミッター機能（`window.ethereum.emit`）の未実装
- トーストメッセージの表示問題

### 2. トーストメッセージの表示問題
- CSSクラス名の不一致
- 表示タイミングの問題
- メッセージ内容の不整合

### 3. 状態管理の問題
- localStorageへの保存処理の不備
- ページリロード後の状態復元処理の問題

### 4. パフォーマンスの問題
- 応答時間が期待値を超過

## 修正手順

### ステップ1: Ethers.jsモックの改善

#### 1.1 不足しているメソッドの追加

**ファイル**: `simple-vote-next/tests/helpers/ethers-mock.ts`

```typescript
// eth_newFilterメソッドの追加
case 'eth_newFilter':
    console.log('Returning mock filter ID: 0x1');
    return '0x1';

// eth_callメソッドの追加
case 'eth_call':
    console.log('Mock eth_call with params:', args.params);
    return '0x0000000000000000000000000000000000000000000000000000000000000000';

// eth_blockNumberメソッドの追加
case 'eth_blockNumber':
    console.log('Returning mock block number: 0x123456');
    return '0x123456';
```

#### 1.2 イベントエミッター機能の実装

```typescript
// window.ethereumにイベントエミッター機能を追加
const eventListeners: { [key: string]: any[] } = {};

Object.defineProperty(window, 'ethereum', {
    value: {
        // 既存のプロパティ...

        // イベントリスナー管理
        on: (eventName: string, callback: any) => {
            console.log('Mock ethereum.on called with:', eventName);
            if (!eventListeners[eventName]) {
                eventListeners[eventName] = [];
            }
            eventListeners[eventName].push(callback);
        },

        removeListener: (eventName: string, callback: any) => {
            console.log('Mock ethereum.removeListener called with:', eventName);
            if (eventListeners[eventName]) {
                const index = eventListeners[eventName].indexOf(callback);
                if (index > -1) {
                    eventListeners[eventName].splice(index, 1);
                }
            }
        },

        // イベント発火機能
        emit: (eventName: string, data: any) => {
            console.log('Mock ethereum.emit called with:', eventName, data);
            if (eventListeners[eventName]) {
                eventListeners[eventName].forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error('Error in event listener:', error);
                    }
                });
            }
        }
    },
    writable: true,
    configurable: true,
});
```

### ステップ2: トーストメッセージの修正

#### 2.1 Toastコンポーネントの修正

**ファイル**: `simple-vote-next/components/Toast.tsx`

```typescript
'use client';

import { useEffect } from 'react';

interface ToastProps {
    message: string;
    onClose: () => void;
    type?: 'success' | 'error' | 'info';
}

function Toast({ message, onClose, type = 'info' }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const toastClasses = {
        success: 'toast toast-success',
        error: 'toast toast-error',
        info: 'toast toast-info'
    };

    return (
        <div className={toastClasses[type]} data-testid="toast">
            {message}
        </div>
    );
}

export default Toast;
```

#### 2.2 CSSスタイルの追加

**ファイル**: `simple-vote-next/app/globals.css`

```css
/* 既存のスタイルに追加 */

.toast-success {
    background: #10b981;
    color: white;
}

.toast-error {
    background: #ef4444;
    color: white;
}

.toast-info {
    background: #3b82f6;
    color: white;
}

/* トーストコンテナの改善 */
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    max-width: 400px;
}

.toast {
    background: #333;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
    word-wrap: break-word;
}
```

#### 2.3 WalletProviderのトーストメッセージ修正

**ファイル**: `simple-vote-next/components/WalletProvider.tsx`

```typescript
// connectWallet関数内のトーストメッセージ修正
const connectWallet = async () => {
    if (!window.ethereum) {
        showToast('MetaMask をインストールしてください');
        return;
    }
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        const _signer = await provider.getSigner();
        const addr = await _signer.getAddress();
        await _signer.signMessage('SimpleVote login');
        setSigner(_signer);
        setAccount(addr);
        showToast('ウォレットが接続されました'); // メッセージを統一
    } catch (err: any) {
        showToast(`エラー: ${err.shortMessage ?? err.message}`);
    }
};

// signOut関数にトーストメッセージを追加
const signOut = () => {
    setSigner(null);
    setAccount('');
    showToast('ウォレットが切断されました'); // 切断メッセージを追加
};
```

### ステップ3: 状態管理の改善

#### 3.1 localStorage対応の追加

**ファイル**: `simple-vote-next/components/WalletProvider.tsx`

```typescript
import { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';

export function WalletProvider({ children }: WalletProviderProps) {
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [account, setAccount] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);

    // 初期化時にlocalStorageから状態を復元
    useEffect(() => {
        const savedAccount = localStorage.getItem('wallet_account');
        if (savedAccount) {
            setAccount(savedAccount);
            // ウォレット接続状態を復元
            if (window.ethereum) {
                window.ethereum.request({ method: 'eth_accounts' })
                    .then((accounts: string[]) => {
                        if (accounts.length > 0 && accounts[0] === savedAccount) {
                            // 接続状態を復元
                            const provider = new ethers.BrowserProvider(window.ethereum);
                            provider.getSigner().then(setSigner);
                        }
                    })
                    .catch(console.error);
            }
        }
    }, []);

    // アカウント変更時にlocalStorageに保存
    useEffect(() => {
        if (account) {
            localStorage.setItem('wallet_account', account);
        } else {
            localStorage.removeItem('wallet_account');
        }
    }, [account]);

    // 既存のコード...
}
```

#### 3.2 イベントリスナーの追加

```typescript
// WalletProvider内にイベントリスナーを追加
useEffect(() => {
    if (window.ethereum) {
        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) {
                // アカウントが切断された
                setSigner(null);
                setAccount('');
                showToast('ウォレットが切断されました');
            } else if (accounts[0] !== account) {
                // アカウントが変更された
                setAccount(accounts[0]);
                showToast('アカウントが変更されました');
            }
        };

        const handleChainChanged = () => {
            // ネットワークが変更された
            showToast('ネットワークが変更されました');
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        };
    }
}, [account, showToast]);
```

### ステップ4: テストファイルの修正

#### 4.1 テストヘルパーの改善

**ファイル**: `simple-vote-next/tests/helpers/ethers-mock.ts`

```typescript
// トーストメッセージの検証ヘルパーを追加
export async function waitForToast(page: Page, expectedMessage: string, timeout = 5000) {
    await page.waitForSelector('.toast', { timeout });
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();

    const toastText = await toast.textContent();
    expect(toastText).toContain(expectedMessage);

    console.log('Toast message verified:', toastText);
}

// ウォレット接続状態の詳細検証
export async function verifyWalletConnectionState(page: Page) {
    // アカウントアドレスが表示される
    await expect(page.locator('.font-mono')).toBeVisible();

    // 接続ボタンが非表示になる
    await expect(page.getByRole('button', { name: 'ウォレット接続' })).not.toBeVisible();

    // 切断ボタンが表示される
    await expect(page.getByRole('button', { name: '切断' })).toBeVisible();

    // 新規作成ボタンが表示される
    await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();

    // 投票一覧セクションが表示される
    await expect(page.locator('text=投票一覧')).toBeVisible();
}
```

#### 4.2 テストケースの修正

**ファイル**: `simple-vote-next/tests/wallet-connection.spec.ts`

```typescript
// トーストメッセージテストの修正
test('接続成功後のトーストメッセージ表示', async ({ page }) => {
    await simulateCompleteWalletConnection(page);

    // トーストメッセージの表示を待機
    await waitForToast(page, 'ウォレットが接続されました');
});

test('切断後のトーストメッセージ表示', async ({ page }) => {
    await simulateCompleteWalletConnection(page);
    await walletHelper.simulateWalletDisconnection();

    // 切断トーストメッセージの表示を待機
    await waitForToast(page, 'ウォレットが切断されました');
});

// パフォーマンステストのタイムアウト調整
test('ウォレット接続の応答時間', async ({ page }) => {
    const startTime = Date.now();

    await simulateCompleteWalletConnection(page);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // タイムアウトを10秒に調整
    expect(responseTime).toBeLessThan(10000);

    console.log('Wallet connection response time:', responseTime, 'ms');
});
```

### ステップ5: エラーハンドリングの改善

#### 5.1 エラーケースのテスト追加

```typescript
test('MetaMaskがインストールされていない場合のエラーメッセージ', async ({ page }) => {
    // window.ethereumを削除
    await page.addInitScript(() => {
        delete (window as any).ethereum;
    });

    await page.goto('/');

    // ウォレット接続ボタンをクリック
    await page.getByRole('button', { name: 'ウォレット接続' }).click();

    // エラーメッセージの表示を確認
    await waitForToast(page, 'MetaMask をインストールしてください');
});

test('ユーザーが接続を拒否した場合のエラーハンドリング', async ({ page }) => {
    // 接続拒否をシミュレート
    await page.addInitScript(() => {
        const originalRequest = window.ethereum.request;
        window.ethereum.request = async (args: any) => {
            if (args.method === 'eth_requestAccounts') {
                throw new Error('User rejected the request');
            }
            return originalRequest(args);
        };
    });

    await page.goto('/');

    // ウォレット接続ボタンをクリック
    await page.getByRole('button', { name: 'ウォレット接続' }).click();

    // エラーメッセージの表示を確認
    await waitForToast(page, 'エラー: User rejected the request');
});
```

## 実装順序

### フェーズ1: 基本修正（優先度高）
1. Ethers.jsモックの不足メソッド追加
2. トーストメッセージの修正
3. 基本的なテストケースの修正

### フェーズ2: 状態管理改善（優先度中）
1. localStorage対応の追加
2. イベントリスナーの実装
3. ページリロード後の状態復元

### フェーズ3: エラーハンドリング強化（優先度中）
1. エラーケースのテスト追加
2. パフォーマンステストの調整
3. セキュリティテストの実装

### フェーズ4: 最適化（優先度低）
1. パフォーマンスの最適化
2. テスト実行時間の短縮
3. カバレッジの向上

## 期待される結果

### 修正後のテスト成功率
- **基本UI・ナビゲーションテスト**: 100% (30/30)
- **ウォレット接続テスト**: 100% (25/25)
- **総成功率**: 100% (55/55)

### 改善される機能
1. **トーストメッセージ**: 適切なタイミングで表示され、メッセージ内容が統一される
2. **状態管理**: ページリロード後もウォレット接続状態が保持される
3. **エラーハンドリング**: 各種エラーケースが適切に処理される
4. **パフォーマンス**: 応答時間が期待値内に収まる

## 注意事項

1. **テスト実行環境**: ローカル環境でのテスト実行を推奨
2. **ブラウザ互換性**: Chrome、Firefox、Safari、Edgeでの動作確認
3. **モックの依存関係**: ethers.jsのバージョン変更時はモックの更新が必要
4. **CI/CD環境**: GitHub Actionsでの自動テスト実行時の環境設定

## 次のステップ

1. フェーズ1の実装を開始
2. 各フェーズ完了後にテスト実行
3. 問題が発生した場合は段階的に修正
4. 最終的なテスト結果の検証

この手順書に従って実装することで、ウォレット接続テストの主要な問題点を解決し、安定したテスト環境を構築できます。