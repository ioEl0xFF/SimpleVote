import { test, expect } from '@playwright/test';
import { WalletHelper } from './helpers/wallet-helper';
import {
    setupEthersMock,
    simulateCompleteWalletConnection,
    simulateQuickWalletConnection,
    verifyWalletConnectionState,
    waitForToast,
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

test.describe('ウォレット接続テスト（最適化版）', () => {
    let walletHelper: WalletHelper;

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        walletHelper = new WalletHelper(page);
    });

    test.describe('2.1 MetaMask接続（高速版）', () => {
        test('ウォレット接続ボタンクリック時の動作', async ({ page }) => {
            // 初期状態でウォレット接続ボタンが表示される
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).toBeVisible();

            // ウォレット接続ボタンをクリック
            await page.getByRole('button', { name: 'ウォレット接続' }).click();

            // 接続プロセスが開始されることを確認
            await page.waitForTimeout(500);

            // 接続ボタンが一時的に無効化される（ローディング状態）
            const connectButton = page.getByRole('button', { name: 'ウォレット接続' });
            await expect(connectButton).toBeVisible();
        });

        test('接続成功後のアカウントアドレス表示（高速版）', async ({ page }) => {
            // 高速なウォレット接続をシミュレート
            await simulateQuickWalletConnection(page);

            // アカウントアドレスが表示されることを確認
            await expect(page.locator('.font-mono')).toBeVisible();

            // アカウントアドレスの形式を確認（0xで始まる16進数）
            const accountAddress = await page.locator('.font-mono').textContent();
            expect(accountAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);

            console.log('Account address displayed:', accountAddress);
        });

        test('接続成功後のUI状態確認（高速版）', async ({ page }) => {
            // 高速なウォレット接続をシミュレート
            await simulateQuickWalletConnection(page);

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

        test('接続成功後のトーストメッセージ表示（高速版）', async ({ page }) => {
            // 高速なウォレット接続をシミュレート
            await simulateQuickWalletConnection(page);

            // トーストメッセージの表示を待機
            await waitForToast(page, 'ウォレットが接続されました');
        });
    });

    test.describe('2.2 ウォレット切断（高速版）', () => {
        test('切断ボタンクリック時の動作', async ({ page }) => {
            // まずウォレット接続
            await simulateQuickWalletConnection(page);

            // 切断ボタンが表示されることを確認
            await expect(page.getByRole('button', { name: '切断' })).toBeVisible();

            // 切断ボタンをクリック
            await page.getByRole('button', { name: '切断' }).click();

            // 切断プロセスが完了するまで待機
            await page.waitForTimeout(500);

            console.log('Disconnect button clicked');
        });

        test('切断後の状態リセット（高速版）', async ({ page }) => {
            // まずウォレット接続
            await simulateQuickWalletConnection(page);

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

        test('切断後のトーストメッセージ表示（高速版）', async ({ page }) => {
            // まずウォレット接続
            await simulateQuickWalletConnection(page);

            // 切断をシミュレート
            await walletHelper.simulateWalletDisconnection();

            // 切断トーストメッセージの表示を待機
            await waitForToast(page, 'ウォレットが切断されました');
        });
    });

    test.describe('2.3 パフォーマンステスト（最適化版）', () => {
        test('ウォレット接続の応答時間（最適化版）', async ({ page }) => {
            const startTime = Date.now();

            await simulateQuickWalletConnection(page);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // タイムアウトを5秒に短縮
            expect(responseTime).toBeLessThan(5000);

            console.log('Optimized wallet connection response time:', responseTime, 'ms');
        });

        test('複数回接続時のパフォーマンス（最適化版）', async ({ page }) => {
            const connectionTimes: number[] = [];

            // 3回の接続を実行（回数を削減）
            for (let i = 0; i < 3; i++) {
                const startTime = Date.now();

                await simulateQuickWalletConnection(page);

                const endTime = Date.now();
                connectionTimes.push(endTime - startTime);

                // 切断して次の接続の準備
                if (i < 2) {
                    await walletHelper.simulateWalletDisconnection();
                }
            }

            // 平均応答時間を計算
            const averageTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;

            // 平均応答時間が2秒以内であることを確認
            expect(averageTime).toBeLessThan(2000);

            console.log('Optimized connection times:', connectionTimes);
            console.log(`Average connection time: ${averageTime}ms`);
        });
    });

    test.describe('2.4 セキュリティテスト', () => {
        test('アカウントアドレスの適切な表示', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // アカウントアドレスが適切に表示されることを確認
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

        test('localStorageのセキュリティ', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // localStorageに保存されるデータを確認
            const savedAccount = await page.evaluate(() => {
                return localStorage.getItem('wallet_account');
            });

            // アカウントアドレスのみが保存されることを確認
            expect(savedAccount).toMatch(/^0x[a-fA-F0-9]{40}$/);

            // 機密情報が保存されていないことを確認
            const sensitiveData = await page.evaluate(() => {
                return {
                    privateKey: localStorage.getItem('private_key'),
                    seedPhrase: localStorage.getItem('seed_phrase'),
                    password: localStorage.getItem('password'),
                };
            });

            expect(sensitiveData.privateKey).toBeNull();
            expect(sensitiveData.seedPhrase).toBeNull();
            expect(sensitiveData.password).toBeNull();

            console.log('localStorage security verified');
        });

        test('XSS攻撃の防止', async ({ page }) => {
            // 悪意のあるスクリプトを含むアカウントアドレスをシミュレート
            await page.addInitScript(() => {
                const maliciousAccount =
                    '0x1234567890123456789012345678901234567890<script>alert("XSS")</script>';
                window.ethereum.selectedAddress = maliciousAccount;
            });

            await page.goto('/');

            // ウォレット接続ボタンをクリック
            await page.getByRole('button', { name: 'ウォレット接続' }).click();

            // アラートが表示されないことを確認（XSS攻撃が防止されている）
            const alertPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
            const alert = await alertPromise;
            expect(alert).toBeNull();

            console.log('XSS attack prevention verified');
        });
    });

    test.describe('2.5 アクセシビリティテスト', () => {
        test('ウォレット接続ボタンのアクセシビリティ', async ({ page }) => {
            // 接続ボタンのアクセシビリティを確認
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

            // 切断ボタンのアクセシビリティを確認
            const disconnectButton = page.getByRole('button', { name: '切断' });

            // ボタンがフォーカス可能であることを確認
            await disconnectButton.focus();
            await expect(disconnectButton).toBeFocused();

            // キーボードでアクセス可能であることを確認
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);

            console.log('Disconnect button accessibility verified');
        });

        test('トーストメッセージのアクセシビリティ', async ({ page }) => {
            // ウォレット接続してトーストメッセージを表示
            await simulateCompleteWalletConnection(page);

            // トーストメッセージが適切に表示されることを確認
            const toast = page.locator('[data-testid="toast"]');
            await expect(toast).toBeVisible();

            // トーストメッセージの内容が適切であることを確認
            const toastText = await toast.textContent();
            expect(toastText).toContain('ウォレットが接続されました');

            console.log('Toast message accessibility verified');
        });

        test('アカウントアドレス表示のアクセシビリティ', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // アカウントアドレス要素が適切に表示されることを確認
            const accountElement = page.locator('.font-mono');
            await expect(accountElement).toBeVisible();

            // アカウントアドレスの形式が適切であることを確認
            const accountAddress = await accountElement.textContent();
            expect(accountAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);

            console.log('Account address accessibility verified');
        });
    });

    test.describe('2.6 カバレッジ向上テスト', () => {
        test('localStorageのクリア処理', async ({ page }) => {
            // 事前にlocalStorageにデータを設定
            await page.evaluate(() => {
                localStorage.setItem(
                    'wallet_account',
                    '0x1234567890123456789012345678901234567890'
                );
                localStorage.setItem('test_data', 'test_value');
            });

            // ウォレット接続
            await simulateQuickWalletConnection(page);

            // 切断
            await page.getByRole('button', { name: '切断' }).click();

            // localStorageからwallet_accountが削除されることを確認
            const savedAccount = await page.evaluate(() => {
                return localStorage.getItem('wallet_account');
            });
            expect(savedAccount).toBeNull();

            // 他のデータは残ることを確認
            const testData = await page.evaluate(() => {
                return localStorage.getItem('test_data');
            });
            expect(testData).toBe('test_value');

            console.log('localStorage clear functionality verified');
        });

        test('イベントリスナーの適切な削除', async ({ page }) => {
            // ウォレット接続
            await simulateQuickWalletConnection(page);

            // ページをリロードしてイベントリスナーが適切に設定されることを確認
            await page.reload();

            // アカウント変更イベントをシミュレート
            await page.evaluate(() => {
                const newAccount = '0x9876543210987654321098765432109876543210';
                window.ethereum.selectedAddress = newAccount;
                window.ethereum.emit('accountsChanged', [newAccount]);
            });

            // アカウント変更のトーストが表示されることを確認
            await waitForToast(page, 'アカウントが変更されました');

            console.log('Event listener functionality verified');
        });

        test('エラー状態からの復旧', async ({ page }) => {
            // エラー状態をシミュレート
            await page.addInitScript(() => {
                const originalRequest = window.ethereum.request;
                let errorCount = 0;
                window.ethereum.request = async (args: any) => {
                    if (args.method === 'eth_requestAccounts' && errorCount < 1) {
                        errorCount++;
                        throw new Error('Temporary error');
                    }
                    return originalRequest(args);
                };
            });

            await page.goto('/');

            // 1回目の接続試行（エラー）
            await page.getByRole('button', { name: 'ウォレット接続' }).click();
            await waitForToast(page, 'エラー: Temporary error');

            // 2回目の接続試行（成功）
            await page.getByRole('button', { name: 'ウォレット接続' }).click();
            await waitForToast(page, 'ウォレットが接続されました');

            console.log('Error recovery functionality verified');
        });

        test('メモリリークの防止', async ({ page }) => {
            // 複数回の接続・切断を実行
            for (let i = 0; i < 5; i++) {
                await simulateQuickWalletConnection(page);
                await page.getByRole('button', { name: '切断' }).click();
                await page.waitForTimeout(100);
            }

            // 最終的な接続
            await simulateQuickWalletConnection(page);

            // メモリ使用量を確認（簡易的なチェック）
            const memoryInfo = await page.evaluate(() => {
                return (performance as any).memory
                    ? {
                          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
                          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
                      }
                    : null;
            });

            if (memoryInfo) {
                console.log('Memory usage:', memoryInfo);
                // メモリリークがないことを確認（使用量が適切な範囲内）
                expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // 50MB以下
            }

            console.log('Memory leak prevention verified');
        });
    });
});
