# ウォレット接続テスト問題修正計画

## 問題概要

**テスト項目**: 「ホームページのタイトル表示（ウォレット接続時）」
**エラー**: `Timed out 5000ms waiting for expect(locator).toBeVisible()`
**根本原因**: `window.ethereum`のモックが`ethers.BrowserProvider`と正しく連携していない

## 調査結果

### 1. 現在の問題点

1. **テスト実装の不適切性**
   - 元のテスト: `localStorage`とカスタムイベントを使用
   - 実際のアプリ: `window.ethereum`と`ethers.BrowserProvider`を使用
   - 不整合によりテストが失敗

2. **window.ethereumモックの不完全性**
   - `ethers.BrowserProvider`がモックされた`window.ethereum`を正しく認識しない
   - 非同期処理のタイミング問題
   - メソッド呼び出しの順序が実際のMetaMaskと異なる

3. **ウォレット接続プロセスの複雑さ**
   ```typescript
   // WalletProvider.tsx の実際の接続プロセス
   const connectWallet = async () => {
       const provider = new ethers.BrowserProvider(window.ethereum);
       await provider.send('eth_requestAccounts', []);
       const _signer = await provider.getSigner();
       const addr = await _signer.getAddress();
       await _signer.signMessage('SimpleVote login');
       setSigner(_signer);
       setAccount(addr);
   };
   ```

## 修正方法の詳細

### 方法1: ethers.jsの完全モック（推奨）

#### 1.1 ethers.BrowserProviderのモック
```typescript
// tests/helpers/ethers-mock.ts
import { ethers } from 'ethers';

// ethers.BrowserProviderをモック
jest.mock('ethers', () => ({
    ...jest.requireActual('ethers'),
    BrowserProvider: jest.fn().mockImplementation(() => ({
        send: jest.fn().mockResolvedValue(['0x1234567890123456789012345678901234567890']),
        getSigner: jest.fn().mockResolvedValue({
            getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
            signMessage: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
        }),
    })),
}));
```

#### 1.2 Playwrightでの実装
```typescript
// tests/helpers/wallet-helper.ts
export async function setupEthersMock(page: Page) {
    await page.addInitScript(() => {
        // ethers.jsをモック
        const originalEthers = (window as any).ethers;
        (window as any).ethers = {
            ...originalEthers,
            BrowserProvider: class MockBrowserProvider {
                constructor(ethereum: any) {
                    this.ethereum = ethereum;
                }

                async send(method: string, params: any[]) {
                    if (method === 'eth_requestAccounts') {
                        return ['0x1234567890123456789012345678901234567890'];
                    }
                    return null;
                }

                async getSigner() {
                    return {
                        getAddress: async () => '0x1234567890123456789012345678901234567890',
                        signMessage: async (message: string) => '0x1234567890123456789012345678901234567890',
                    };
                }
            }
        };
    });
}
```

### 方法2: テスト用WalletProviderの作成

#### 2.1 テスト専用コンポーネント
```typescript
// components/TestWalletProvider.tsx
'use client';

import { createContext, useContext, ReactNode, useState } from 'react';

interface TestWalletContextType {
    signer: any;
    account: string;
    connectWallet: () => Promise<void>;
    signOut: () => void;
}

const TestWalletContext = createContext<TestWalletContextType | undefined>(undefined);

export function TestWalletProvider({ children }: { children: ReactNode }) {
    const [signer, setSigner] = useState<any>(null);
    const [account, setAccount] = useState('');

    const connectWallet = async () => {
        const mockSigner = {
            getAddress: () => Promise.resolve('0x1234567890123456789012345678901234567890'),
        };
        setSigner(mockSigner);
        setAccount('0x1234567890123456789012345678901234567890');
    };

    const signOut = () => {
        setSigner(null);
        setAccount('');
    };

    return (
        <TestWalletContext.Provider value={{ signer, account, connectWallet, signOut }}>
            {children}
        </TestWalletContext.Provider>
    );
}

export function useTestWallet() {
    const context = useContext(TestWalletContext);
    if (!context) {
        throw new Error('useTestWallet must be used within TestWalletProvider');
    }
    return context;
}
```

#### 2.2 テスト環境での使用
```typescript
// tests/helpers/test-setup.ts
import { TestWalletProvider } from '@/components/TestWalletProvider';

export async function setupTestEnvironment(page: Page) {
    await page.addInitScript(() => {
        // テスト環境フラグを設定
        (window as any).__TEST_MODE__ = true;
    });
}
```

### 方法3: 環境変数による制御

#### 3.1 環境変数の設定
```typescript
// lib/constants.ts
export const IS_TEST_MODE = process.env.NODE_ENV === 'test';
export const TEST_WALLET_ADDRESS = process.env.TEST_WALLET_ADDRESS || '0x1234567890123456789012345678901234567890';
```

#### 3.2 WalletProviderの修正
```typescript
// components/WalletProvider.tsx
export function WalletProvider({ children }: WalletProviderProps) {
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [account, setAccount] = useState('');

    // テストモードでの自動接続
    useEffect(() => {
        if (IS_TEST_MODE && !signer) {
            const mockSigner = {
                getAddress: () => Promise.resolve(TEST_WALLET_ADDRESS),
            };
            setSigner(mockSigner as any);
            setAccount(TEST_WALLET_ADDRESS);
        }
    }, [signer]);

    // ... 既存のコード
}
```

## 実装手順

### ステップ1: ethers.jsモックの実装
```bash
# 1. ethersモックヘルパーを作成
touch simple-vote-next/tests/helpers/ethers-mock.ts

# 2. モック実装
# 上記のethers-mock.tsの内容を実装

# 3. テストファイルでモックを使用
```

### ステップ2: テストヘルパーの更新
```bash
# 1. wallet-helper.tsを更新
# setupEthersMock関数を追加

# 2. テストファイルを更新
# 新しいヘルパー関数を使用
```

### ステップ3: テストの実行と検証
```bash
# 1. 単体テストの実行
cd simple-vote-next
npx playwright test basic-ui-navigation.spec.ts --grep "ウォレット接続時"

# 2. 全テストの実行
npx playwright test

# 3. デバッグモードでの実行
npx playwright test --headed --debug
```

## 実装履歴（2024/06/09）

### 概要
Playwrightテストでウォレット接続の状態遷移が正しく再現されず、`window.ethereum`や`ethers.BrowserProvider`のモックが不完全だった問題を、下記の手順で解決しました。

### 主な修正内容

1. **グローバルモックの徹底**
    - Playwrightの`addInitScript`で、テスト開始時に`window.ethereum`と`window.ethers`をグローバルにモック。
    - `eth_chainId`や`eth_accounts`、`personal_sign`など、アプリが利用する全てのメソッドを返すようにした。
    - `ethers.BrowserProvider`のモッククラスを用意し、`send`や`getSigner`も本番の挙動に近づけた。

2. **テストヘルパーの簡素化**
    - `WalletHelper`の`simulateWalletConnection`は「接続ボタンを押すだけ」にし、余計なリロードや複雑なモック呼び出しを排除。
    - 切断も同様にボタン押下のみで状態遷移を再現。

3. **テストファイル先頭でのモック注入**
    - 各テストの`beforeEach`で`addInitScript`を使い、常に正しいモックが有効化されるようにした。

4. **デバッグログの追加**
    - テスト失敗時に、ページ内の要素数やHTMLを出力し、どこで状態遷移が止まっているかを可視化。

### 経緯
- もともと`window.ethers`や`window.ethereum`のモックが不完全で、`ethers.BrowserProvider`の内部で`eth_chainId`や`eth_accounts`が未実装だったため、アプリ側でエラーが発生していた。
- 仕様書の「方法1: ethers.jsの完全モック」に沿って、必要なメソッドをすべて返すように修正。
- テストヘルパーやテスト本体も、余計なリロードや複雑な状態遷移を排除し、UIの状態変化をシンプルに検証できるようにした。
- デバッグログを追加し、テスト実行時の要素数やHTMLを確認することで、モックの不足やUIの状態遷移の問題を特定しやすくした。
- その結果、ウォレット接続後の状態変化テストを含め、UIの状態遷移が安定して再現されるようになった。

### 今後の指針
- 追加で必要な`ethereum.request`メソッドがあれば、モックに随時追加する。
- さらなる堅牢化や保守性向上のため、jestやvitestのモックも活用可能。

## 期待される結果

### 成功時の動作
- ウォレット接続ボタンがクリックされる
- アカウントアドレスが表示される
- 「切断」ボタンが表示される
- 「新規作成」ボタンが表示される
- 「投票一覧」セクションが表示される

### テストの安定性
- 複数のブラウザで一貫した動作
- 非同期処理の適切な待機
- エラーハンドリングの確認

## 代替案

### 案1: 統合テストの分離
- ウォレット接続部分を別テストファイルに分離
- UIテストとウォレット機能テストを分けて実行

### 案2: モックライブラリの使用
- `jest-mock-extended`や`ts-mockito`などのモックライブラリを使用
- より堅牢なモック実装

### 案3: テスト用APIの作成
- テスト専用のウォレット接続APIエンドポイントを作成
- フロントエンドとバックエンドの分離

## 注意事項

### セキュリティ
- テスト用のアカウントアドレスは実際のウォレットと混同しないよう注意
- テスト環境と本番環境の設定を明確に分離

### パフォーマンス
- モックの初期化時間を最小化
- テスト実行時間の最適化

### 保守性
- モック実装のドキュメント化
- テストコードの可読性向上

## 参考資料

- [Playwright Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Mocking](https://jestjs.io/docs/mock-functions)

この修正計画に従って実装することで、ウォレット接続テストの問題を根本的に解決し、安定したテスト環境を構築できます。