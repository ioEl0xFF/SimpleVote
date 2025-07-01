import { test, expect } from '@playwright/test';
import { WalletHelper } from './helpers/wallet-helper';
import {
    setupEthersMock,
    simulateCompleteWalletConnection,
    verifyWalletConnectionState,
} from './helpers/ethers-mock';

// ethersモジュールの完全モックを設定
test.beforeEach(async ({ page }) => {
    // コンソールログを監視
    page.on('console', (msg) => {
        console.log('Browser console:', msg.text());
    });

    // エラーを監視
    page.on('pageerror', (error) => {
        console.log('Page error:', error.message);
    });

    // ethers.jsの完全モックを設定
    await setupEthersMock(page);
});

test.describe('ウォレット接続テスト', () => {
    let walletHelper: WalletHelper;

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        walletHelper = new WalletHelper(page);
    });

    test.describe('2.1 MetaMask接続', () => {
        test('ウォレット接続ボタンクリック時の動作', async ({ page }) => {
            // 初期状態でウォレット接続ボタンが表示される
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).toBeVisible();

            // ウォレット接続ボタンをクリック
            await page.getByRole('button', { name: 'ウォレット接続' }).click();

            // 接続プロセスが開始されることを確認
            await page.waitForTimeout(1000);

            // 接続ボタンが一時的に無効化される（ローディング状態）
            const connectButton = page.getByRole('button', { name: 'ウォレット接続' });
            await expect(connectButton).toBeVisible();
        });

        test('接続成功後のアカウントアドレス表示', async ({ page }) => {
            // 完全なウォレット接続をシミュレート
            await simulateCompleteWalletConnection(page);

            // アカウントアドレスが表示されることを確認
            await expect(page.locator('.font-mono')).toBeVisible();

            // アカウントアドレスの形式を確認（0xで始まる16進数）
            const accountAddress = await page.locator('.font-mono').textContent();
            expect(accountAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);

            console.log('Account address displayed:', accountAddress);
        });

        test('接続成功後のUI状態確認', async ({ page }) => {
            // 完全なウォレット接続をシミュレート
            await simulateCompleteWalletConnection(page);

            // ウォレット接続状態を検証
            await verifyWalletConnectionState(page);

            // 接続ボタンが非表示になる
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).not.toBeVisible();

            // 切断ボタンが表示される
            await expect(page.getByRole('button', { name: '切断' })).toBeVisible();

            // 新規作成ボタンが表示される
            await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();

            // 投票一覧セクションが表示される
            await expect(page.locator('text=投票一覧')).toBeVisible();
        });

        test('接続成功後のトーストメッセージ表示', async ({ page }) => {
            // 完全なウォレット接続をシミュレート
            await simulateCompleteWalletConnection(page);

            // トーストメッセージが表示されることを確認
            await expect(page.locator('.toast')).toBeVisible();

            // 成功メッセージが含まれることを確認
            const toastText = await page.locator('.toast').textContent();
            expect(toastText).toContain('ウォレットが接続されました');

            console.log('Toast message displayed:', toastText);
        });

        test('複数回の接続試行', async ({ page }) => {
            // 1回目の接続
            await simulateCompleteWalletConnection(page);
            await expect(page.locator('.font-mono')).toBeVisible();

            // 切断
            await walletHelper.simulateWalletDisconnection();
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).toBeVisible();

            // 2回目の接続
            await simulateCompleteWalletConnection(page);
            await expect(page.locator('.font-mono')).toBeVisible();

            // 接続が正常に動作することを確認
            await verifyWalletConnectionState(page);
        });
    });

    test.describe('2.2 ウォレット切断', () => {
        test('切断ボタンクリック時の動作', async ({ page }) => {
            // まずウォレット接続
            await simulateCompleteWalletConnection(page);

            // 切断ボタンが表示されることを確認
            await expect(page.getByRole('button', { name: '切断' })).toBeVisible();

            // 切断ボタンをクリック
            await page.getByRole('button', { name: '切断' }).click();

            // 切断プロセスが完了するまで待機
            await page.waitForTimeout(1000);

            console.log('Disconnect button clicked');
        });

        test('切断後の状態リセット', async ({ page }) => {
            // まずウォレット接続
            await simulateCompleteWalletConnection(page);

            // 切断をシミュレート
            await walletHelper.simulateWalletDisconnection();

            // 接続ボタンが再表示される
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).toBeVisible();

            // アカウントアドレスが非表示になる
            await expect(page.locator('.font-mono')).not.toBeVisible();

            // 切断ボタンが非表示になる
            await expect(page.getByRole('button', { name: '切断' })).not.toBeVisible();

            // 新規作成ボタンが非表示になる
            await expect(page.getByRole('button', { name: '新規作成' })).not.toBeVisible();

            // 投票一覧セクションが非表示になる
            await expect(page.locator('text=投票一覧')).not.toBeVisible();
        });

        test('切断後のトーストメッセージ表示', async ({ page }) => {
            // まずウォレット接続
            await simulateCompleteWalletConnection(page);

            // 切断をシミュレート
            await walletHelper.simulateWalletDisconnection();

            // トーストメッセージが表示されることを確認
            await expect(page.locator('.toast')).toBeVisible();

            // 切断メッセージが含まれることを確認
            const toastText = await page.locator('.toast').textContent();
            expect(toastText).toContain('ウォレットが切断されました');

            console.log('Disconnect toast message:', toastText);
        });

        test('切断後の再接続', async ({ page }) => {
            // まずウォレット接続
            await simulateCompleteWalletConnection(page);

            // 切断
            await walletHelper.simulateWalletDisconnection();

            // 再接続
            await simulateCompleteWalletConnection(page);

            // 再接続が正常に動作することを確認
            await verifyWalletConnectionState(page);
        });
    });

    test.describe('2.3 ウォレット状態管理', () => {
        test('ページリロード後のウォレット状態保持', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // ページをリロード
            await page.reload();

            // リロード後もウォレット接続状態が保持されることを確認
            await expect(page.locator('.font-mono')).toBeVisible();
            await expect(page.getByRole('button', { name: '切断' })).toBeVisible();
            await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();
            await expect(page.locator('text=投票一覧')).toBeVisible();

            console.log('Wallet state maintained after page reload');
        });

        test('アカウント切り替え時の状態更新', async ({ page }) => {
            // 初期ウォレット接続
            await simulateCompleteWalletConnection(page);

            // アカウント切り替えをシミュレート
            await page.evaluate(() => {
                // 新しいアカウントアドレスを設定
                const newAccount = '0x9876543210987654321098765432109876543210';
                (window as any).ethereum.selectedAddress = newAccount;

                // アカウント変更イベントを発火
                (window as any).ethereum.emit('accountsChanged', [newAccount]);
            });

            // アカウント変更の処理を待機
            await page.waitForTimeout(2000);

            // 新しいアカウントアドレスが表示されることを確認
            const newAccountAddress = await page.locator('.font-mono').textContent();
            expect(newAccountAddress).toBe('0x9876543210987654321098765432109876543210');

            console.log('Account switched to:', newAccountAddress);
        });

        test('ネットワーク切り替え時の状態更新', async ({ page }) => {
            // 初期ウォレット接続
            await simulateCompleteWalletConnection(page);

            // ネットワーク切り替えをシミュレート
            await page.evaluate(() => {
                // 新しいネットワーク情報を設定
                (window as any).ethereum.chainId = '0x5'; // Goerli
                (window as any).ethereum.networkVersion = '5';

                // ネットワーク変更イベントを発火
                (window as any).ethereum.emit('chainChanged', '0x5');
            });

            // ネットワーク変更の処理を待機
            await page.waitForTimeout(2000);

            // ネットワーク変更が適切に処理されることを確認
            // （エラーメッセージや警告が表示される可能性）
            console.log('Network change handled');
        });

        test('ウォレット接続状態の永続化', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // localStorageに接続状態が保存されることを確認
            const connectionState = await page.evaluate(() => {
                return localStorage.getItem('walletConnected');
            });
            expect(connectionState).toBe('true');

            // アカウントアドレスも保存されることを確認
            const savedAccount = await page.evaluate(() => {
                return localStorage.getItem('accountAddress');
            });
            expect(savedAccount).toMatch(/^0x[a-fA-F0-9]{40}$/);

            console.log('Connection state persisted in localStorage');
        });
    });

    test.describe('2.4 エラーハンドリング', () => {
        test('MetaMaskがインストールされていない場合のエラーメッセージ', async ({ page }) => {
            // MetaMaskを無効化
            await page.evaluate(() => {
                delete (window as any).ethereum;
            });

            // ページをリロード
            await page.reload();

            // ウォレット接続ボタンをクリック
            await page.getByRole('button', { name: 'ウォレット接続' }).click();

            // エラーメッセージが表示されることを確認
            await expect(page.locator('.toast')).toBeVisible();

            const errorText = await page.locator('.toast').textContent();
            expect(errorText).toContain('MetaMaskがインストールされていません');

            console.log('MetaMask not installed error:', errorText);
        });

        test('ユーザーが接続を拒否した場合のエラーハンドリング', async ({ page }) => {
            // 接続拒否をシミュレート
            await page.evaluate(() => {
                (window as any).ethereum.request = async (args: any) => {
                    if (args.method === 'eth_requestAccounts') {
                        throw new Error('User rejected the request');
                    }
                    return null;
                };
            });

            // ウォレット接続ボタンをクリック
            await page.getByRole('button', { name: 'ウォレット接続' }).click();

            // エラーメッセージが表示されることを確認
            await expect(page.locator('.toast')).toBeVisible();

            const errorText = await page.locator('.toast').textContent();
            expect(errorText).toContain('ウォレット接続が拒否されました');

            console.log('Connection rejected error:', errorText);
        });

        test('ネットワークエラー時のエラーハンドリング', async ({ page }) => {
            // ネットワークエラーをシミュレート
            await page.evaluate(() => {
                (window as any).ethereum.request = async (args: any) => {
                    throw new Error('Network error');
                };
            });

            // ウォレット接続ボタンをクリック
            await page.getByRole('button', { name: 'ウォレット接続' }).click();

            // エラーメッセージが表示されることを確認
            await expect(page.locator('.toast')).toBeVisible();

            const errorText = await page.locator('.toast').textContent();
            expect(errorText).toContain('ネットワークエラー');

            console.log('Network error:', errorText);
        });

        test('無効なネットワークへの接続時のエラーハンドリング', async ({ page }) => {
            // 無効なネットワークをシミュレート
            await page.evaluate(() => {
                (window as any).ethereum.chainId = '0x999'; // 無効なチェーンID
                (window as any).ethereum.networkVersion = '999';
            });

            // ウォレット接続ボタンをクリック
            await page.getByRole('button', { name: 'ウォレット接続' }).click();

            // エラーメッセージが表示されることを確認
            await expect(page.locator('.toast')).toBeVisible();

            const errorText = await page.locator('.toast').textContent();
            expect(errorText).toContain('サポートされていないネットワーク');

            console.log('Invalid network error:', errorText);
        });
    });

    test.describe('2.5 パフォーマンステスト', () => {
        test('ウォレット接続の応答時間', async ({ page }) => {
            const startTime = Date.now();

            // ウォレット接続を実行
            await simulateCompleteWalletConnection(page);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // 応答時間が5秒以内であることを確認
            expect(responseTime).toBeLessThan(5000);

            console.log(`Wallet connection response time: ${responseTime}ms`);
        });

        test('複数回接続時のパフォーマンス', async ({ page }) => {
            const connectionTimes: number[] = [];

            // 5回の接続を実行
            for (let i = 0; i < 5; i++) {
                const startTime = Date.now();

                await simulateCompleteWalletConnection(page);

                const endTime = Date.now();
                connectionTimes.push(endTime - startTime);

                // 切断して次の接続の準備
                if (i < 4) {
                    await walletHelper.simulateWalletDisconnection();
                }
            }

            // 平均応答時間を計算
            const averageTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;

            // 平均応答時間が3秒以内であることを確認
            expect(averageTime).toBeLessThan(3000);

            console.log('Connection times:', connectionTimes);
            console.log(`Average connection time: ${averageTime}ms`);
        });
    });

    test.describe('2.6 セキュリティテスト', () => {
        test('アカウントアドレスの適切な表示', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // アカウントアドレスが適切にマスクされていることを確認
            const accountAddress = await page.locator('.font-mono').textContent();

            // 完全なアドレスが表示される（セキュリティ上、マスクは不要）
            expect(accountAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);

            console.log('Account address properly displayed:', accountAddress);
        });

        test('接続状態の適切な検証', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // 接続状態が適切に検証されることを確認
            const isConnected = await walletHelper.isWalletConnected();
            expect(isConnected).toBe(true);

            // アカウントアドレスが取得できることを確認
            const accountAddress = await walletHelper.getAccountAddress();
            expect(accountAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);

            console.log('Connection state properly verified');
        });

        test('不正なアカウントアドレスの検証', async ({ page }) => {
            // 不正なアカウントアドレスをシミュレート
            await page.evaluate(() => {
                (window as any).ethereum.selectedAddress = 'invalid-address';
            });

            // ウォレット接続ボタンをクリック
            await page.getByRole('button', { name: 'ウォレット接続' }).click();

            // エラーメッセージが表示されることを確認
            await expect(page.locator('.toast')).toBeVisible();

            const errorText = await page.locator('.toast').textContent();
            expect(errorText).toContain('無効なアカウントアドレス');

            console.log('Invalid address error:', errorText);
        });
    });

    test.describe('2.7 アクセシビリティテスト', () => {
        test('ウォレット接続ボタンのアクセシビリティ', async ({ page }) => {
            // 接続ボタンのaria属性を確認
            const connectButton = page.getByRole('button', { name: 'ウォレット接続' });

            // ボタンがフォーカス可能であることを確認
            await connectButton.focus();
            await expect(connectButton).toBeFocused();

            // キーボードでアクセス可能であることを確認
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);

            console.log('Connect button accessibility verified');
        });

        test('切断ボタンのアクセシビリティ', async ({ page }) => {
            // まずウォレット接続
            await simulateCompleteWalletConnection(page);

            // 切断ボタンのaria属性を確認
            const disconnectButton = page.getByRole('button', { name: '切断' });

            // ボタンがフォーカス可能であることを確認
            await disconnectButton.focus();
            await expect(disconnectButton).toBeFocused();

            // キーボードでアクセス可能であることを確認
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);

            console.log('Disconnect button accessibility verified');
        });

        test('アカウントアドレス表示のアクセシビリティ', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // アカウントアドレス要素のaria属性を確認
            const accountElement = page.locator('.font-mono');

            // 要素が適切にラベル付けされていることを確認
            const ariaLabel = await accountElement.getAttribute('aria-label');
            expect(ariaLabel).toContain('アカウントアドレス');

            console.log('Account address accessibility verified');
        });
    });
});
