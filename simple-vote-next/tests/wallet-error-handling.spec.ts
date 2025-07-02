import { test, expect } from '@playwright/test';
import { WalletHelper } from './helpers/wallet-helper';
import {
    setupEthersMock,
    simulateWalletError,
    removeEthereum,
    restoreEthereum,
} from './helpers/ethers-mock';
import { waitForToast, waitForWalletConnection } from './helpers/wallet-helper';

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

test.describe('2.4 エラーハンドリングテスト', () => {
    let walletHelper: WalletHelper;

    test.beforeEach(async ({ page }) => {
        await page.goto('/test');

        // ページの状態を安定化
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Fast Refreshの完了を待機
        await page.waitForFunction(
            () => {
                return !document.querySelector('[data-nextjs-router-state]');
            },
            { timeout: 10000 }
        );

        walletHelper = new WalletHelper(page);
    });

    test.describe('2.4.1 MetaMaskがインストールされていない場合のエラーメッセージ', () => {
        test('MetaMask未インストール時のエラーハンドリング', async ({ page }) => {
            // エラーをシミュレート
            await simulateWalletError(page, 'METAMASK_NOT_INSTALLED');

            // ウォレット接続ボタンをクリック
            await page.getByTestId('wallet-connect-button').click();

            // エラーメッセージが表示されることを確認（タイムアウト延長）
            const toastFound = await waitForToast(
                page,
                'MetaMaskがインストールされていません',
                15000
            );
            expect(toastFound).toBe(true);
        });

        test('MetaMask未インストール時のUI状態', async ({ page }) => {
            // エラーをシミュレート
            await simulateWalletError(page, 'METAMASK_NOT_INSTALLED');

            // ウォレット接続ボタンをクリック
            await page.getByTestId('wallet-connect-button').click();

            // 接続ボタンが再び有効になることを確認
            await expect(page.getByTestId('wallet-connect-button')).toBeVisible();
            await expect(page.getByTestId('wallet-connect-button')).toBeEnabled();
        });
    });

    test.describe('2.4.2 ユーザーが接続を拒否した場合のエラーハンドリング', () => {
        test('ユーザーが接続を拒否した場合のエラーメッセージ', async ({ page }) => {
            // ユーザーが接続を拒否するシナリオをシミュレート
            await simulateWalletError(page, 'CONNECTION_REJECTED');

            // ウォレット接続ボタンをクリック
            await page.getByTestId('wallet-connect-button').click();

            // エラーメッセージが表示されることを確認
            const toastFound = await waitForToast(page, 'ウォレット接続が拒否されました');
            expect(toastFound).toBe(true);
        });

        test('接続拒否後のUI状態', async ({ page }) => {
            // ユーザーが接続を拒否するシナリオをシミュレート
            await simulateWalletError(page, 'CONNECTION_REJECTED');

            // ウォレット接続ボタンをクリック
            await page.getByTestId('wallet-connect-button').click();

            // 接続ボタンが再び有効になることを確認
            await expect(page.getByTestId('wallet-connect-button')).toBeVisible();
            await expect(page.getByTestId('wallet-connect-button')).toBeEnabled();

            // アカウントアドレスが表示されていないことを確認
            await expect(page.locator('.font-mono')).not.toBeVisible();
        });
    });

    test.describe('2.4.3 ネットワークエラー時のエラーハンドリング', () => {
        test('ネットワークエラー時のエラーメッセージ', async ({ page }) => {
            // ネットワークエラーをシミュレート
            await simulateWalletError(page, 'NETWORK_ERROR');

            // ウォレット接続ボタンをクリック
            await page.getByTestId('wallet-connect-button').click();

            // エラーメッセージが表示されることを確認
            const toastFound = await waitForToast(page, 'ネットワークエラーが発生しました');
            expect(toastFound).toBe(true);
        });

        test('ネットワークエラー後の再接続試行', async ({ page }) => {
            // 最初にネットワークエラーをシミュレート
            await simulateWalletError(page, 'NETWORK_ERROR');

            // ウォレット接続ボタンをクリック
            await page.getByTestId('wallet-connect-button').click();

            // エラーメッセージを待機
            await waitForToast(page, 'ネットワークエラーが発生しました');

            // 正常な接続に戻す
            await restoreEthereum(page);

            // 追加の待機時間
            await page.waitForTimeout(2000);

            // 再度接続を試行
            await page.getByTestId('wallet-connect-button').click();

            // 今度は成功することを確認（タイムアウト延長）
            await expect(page.locator('.font-mono')).toBeVisible({ timeout: 10000 });
        });
    });

    test.describe('2.4.4 無効なネットワークへの接続時のエラーハンドリング', () => {
        test('無効なネットワークへの接続時のエラーメッセージ', async ({ page }) => {
            // 無効なネットワークをシミュレート
            await simulateWalletError(page, 'UNSUPPORTED_NETWORK');

            // ウォレット接続ボタンをクリック
            await page.getByTestId('wallet-connect-button').click();

            // エラーメッセージが表示されることを確認
            const toastFound = await waitForToast(page, 'サポートされていないネットワークです');
            expect(toastFound).toBe(true);
        });

        test('無効なネットワーク時のUI状態', async ({ page }) => {
            // 無効なネットワークをシミュレート
            await simulateWalletError(page, 'UNSUPPORTED_NETWORK');

            // ウォレット接続ボタンをクリック
            await page.getByTestId('wallet-connect-button').click();

            // 接続ボタンが再び有効になることを確認
            await expect(page.getByTestId('wallet-connect-button')).toBeVisible();
            await expect(page.getByTestId('wallet-connect-button')).toBeEnabled();

            // アカウントアドレスが表示されていないことを確認
            await expect(page.locator('.font-mono')).not.toBeVisible();
        });
    });

    test.describe('2.4.5 タイムアウトエラーのハンドリング', () => {
        test('接続タイムアウト時のエラーメッセージ', async ({ page }) => {
            // タイムアウトエラーをシミュレート
            await simulateWalletError(page, 'TIMEOUT_ERROR');

            // ウォレット接続ボタンをクリック
            await page.getByTestId('wallet-connect-button').click();

            // エラーメッセージが表示されることを確認（タイムアウト延長）
            const toastFound = await waitForToast(page, '接続がタイムアウトしました', 10000);
            expect(toastFound).toBe(true);
        });

        test('タイムアウト後の再接続試行', async ({ page }) => {
            // タイムアウトエラーをシミュレート
            await simulateWalletError(page, 'TIMEOUT_ERROR');

            // ウォレット接続ボタンをクリック
            await page.getByTestId('wallet-connect-button').click();

            // エラーメッセージを待機
            await waitForToast(page, '接続がタイムアウトしました');

            // 正常な接続に戻す
            await restoreEthereum(page);

            // 追加の待機時間
            await page.waitForTimeout(2000);

            // 再度接続を試行
            await page.getByTestId('wallet-connect-button').click();

            // 今度は成功することを確認（タイムアウト延長）
            await expect(page.locator('.font-mono')).toBeVisible({ timeout: 10000 });
        });
    });

    test.describe('2.4.6 予期しないエラーのハンドリング', () => {
        test('予期しないエラー時のエラーメッセージ', async ({ page }) => {
            // 予期しないエラーをシミュレート
            await simulateWalletError(page, 'unexpected');

            // ウォレット接続ボタンをクリック
            await page.getByTestId('wallet-connect-button').click();

            // エラーメッセージが表示されることを確認
            const toastFound = await waitForToast(page, '予期しないエラーが発生しました');
            expect(toastFound).toBe(true);
        });

        test('エラー詳細のログ出力', async ({ page }) => {
            const consoleLogs: string[] = [];

            // コンソールログをキャプチャ
            page.on('console', (msg) => {
                consoleLogs.push(msg.text());
            });

            // 予期しないエラーをシミュレート
            await simulateWalletError(page, 'unexpected');

            // ウォレット接続ボタンをクリック
            await page.getByTestId('wallet-connect-button').click();

            // エラーメッセージを待機
            await waitForToast(page, '予期しないエラーが発生しました');

            // エラー詳細がログに出力されていることを確認
            const errorLogs = consoleLogs.filter(
                (log) =>
                    log.includes('Unexpected error occurred') ||
                    log.includes('Wallet connection error')
            );
            expect(errorLogs.length).toBeGreaterThan(0);
        });
    });

    test.describe('2.4.7 エラー状態からの復旧', () => {
        test('エラー状態からの正常な接続への復旧', async ({ page }) => {
            // 最初にエラー状態を作成
            await simulateWalletError(page, 'network_error');

            // エラーを発生させる
            await page.getByTestId('wallet-connect-button').click();
            await waitForToast(page, 'ネットワークエラーが発生しました');

            // 正常な状態に復旧
            await restoreEthereum(page);

            // 追加の待機時間
            await page.waitForTimeout(2000);

            // 再度接続を試行
            await page.getByTestId('wallet-connect-button').click();

            // 正常に接続されることを確認（タイムアウト延長）
            await expect(page.locator('.font-mono')).toBeVisible({ timeout: 10000 });
            await expect(page.getByRole('button', { name: '切断' })).toBeVisible({
                timeout: 10000,
            });
        });

        test('複数回のエラーからの復旧', async ({ page }) => {
            // 複数回エラーを発生させてから復旧
            for (let i = 0; i < 3; i++) {
                // エラー状態を作成
                await simulateWalletError(page, 'unexpected');

                // エラーを発生させる
                await page.getByTestId('wallet-connect-button').click();
                await waitForToast(page, '予期しないエラーが発生しました');
            }

            // 正常な状態に復旧
            await restoreEthereum(page);

            // 追加の待機時間
            await page.waitForTimeout(2000);

            // 最終的に正常に接続されることを確認（タイムアウト延長）
            await page.getByTestId('wallet-connect-button').click();
            await expect(page.locator('.font-mono')).toBeVisible({ timeout: 10000 });
        });
    });
});
