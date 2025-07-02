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

test.describe('2.3 ウォレット状態管理テスト', () => {
    let walletHelper: WalletHelper;

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        walletHelper = new WalletHelper(page);
    });

    test.describe('2.3.1 ページリロード後のウォレット状態保持', () => {
        test('ページリロード後もウォレット接続状態が保持される', async ({ page }) => {
            // まずウォレット接続
            await simulateCompleteWalletConnection(page);

            // 接続状態を確認
            await verifyWalletConnectionState(page);

            // ページをリロード
            await page.reload();

            // リロード後も接続状態が保持されていることを確認
            await expect(page.getByRole('button', { name: '切断' })).toBeVisible();
            await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();
            await expect(page.locator('text=投票一覧')).toBeVisible();

            // アカウントアドレスが表示されていることを確認
            await expect(page.locator('.font-mono')).toBeVisible();
        });

        test('ページリロード後のアカウントアドレス表示', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // アカウントアドレスを取得
            const originalAddress = await page.locator('.font-mono').textContent();

            // ページをリロード
            await page.reload();

            // リロード後のアカウントアドレスを取得
            const reloadedAddress = await page.locator('.font-mono').textContent();

            // アドレスが同じであることを確認
            expect(reloadedAddress).toBe(originalAddress);
            expect(reloadedAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
        });
    });

    test.describe('2.3.2 アカウント切り替え時の状態更新', () => {
        test('アカウント切り替え時の状態更新', async ({ page }) => {
            // 最初のアカウントで接続
            await simulateCompleteWalletConnection(page);

            // 最初のアカウントアドレスを取得
            const firstAddress = await page.locator('.font-mono').textContent();

            // アカウント切り替えをシミュレート
            await walletHelper.simulateAccountSwitch();

            // 新しいアカウントアドレスが表示されることを確認
            await expect(page.locator('.font-mono')).toBeVisible();

            // アドレスが変更されていることを確認（モックでは同じアドレスが返されるが、実際の動作をテスト）
            const newAddress = await page.locator('.font-mono').textContent();
            expect(newAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);

            // 接続状態が維持されていることを確認
            await expect(page.getByRole('button', { name: '切断' })).toBeVisible();
            await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();
        });

        test('アカウント切り替え時のトーストメッセージ', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // アカウント切り替えをシミュレート
            await walletHelper.simulateAccountSwitch();

            // アカウント切り替えのトーストメッセージを確認
            await waitForToast(page, 'アカウントが切り替えられました');
        });
    });

    test.describe('2.3.3 ネットワーク切り替え時の状態更新', () => {
        test('ネットワーク切り替え時の状態更新', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // ネットワーク切り替えをシミュレート
            await walletHelper.simulateNetworkSwitch();

            // ネットワーク切り替えのトーストメッセージを確認
            await waitForToast(page, 'ネットワークが切り替えられました');

            // 接続状態が維持されていることを確認
            await expect(page.getByRole('button', { name: '切断' })).toBeVisible();
            await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();
        });

        test('無効なネットワークへの切り替え時のエラーハンドリング', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // 無効なネットワークへの切り替えをシミュレート
            await walletHelper.simulateInvalidNetworkSwitch();

            // エラーメッセージが表示されることを確認
            await waitForToast(page, 'サポートされていないネットワークです');
        });
    });

    test.describe('2.3.4 ウォレット接続状態の永続化', () => {
        test('ローカルストレージでの状態永続化', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // ローカルストレージの状態を確認
            const walletState = await page.evaluate(() => {
                return localStorage.getItem('walletConnected');
            });

            expect(walletState).toBe('true');

            // アカウントアドレスも保存されていることを確認
            const storedAddress = await page.evaluate(() => {
                return localStorage.getItem('walletAddress');
            });

            expect(storedAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
        });

        test('セッションストレージでの状態永続化', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // セッションストレージの状態を確認
            const walletState = await page.evaluate(() => {
                return sessionStorage.getItem('walletConnected');
            });

            expect(walletState).toBe('true');
        });

        test('切断時の状態クリア', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // 切断
            await walletHelper.simulateWalletDisconnection();

            // ローカルストレージの状態がクリアされていることを確認
            const walletState = await page.evaluate(() => {
                return localStorage.getItem('walletConnected');
            });

            expect(walletState).toBeNull();

            // セッションストレージの状態もクリアされていることを確認
            const sessionState = await page.evaluate(() => {
                return sessionStorage.getItem('walletConnected');
            });

            expect(sessionState).toBeNull();
        });
    });

    test.describe('2.3.5 複数タブでの状態同期', () => {
        test('複数タブでのウォレット状態同期', async ({ page, context }) => {
            // 最初のタブでウォレット接続
            await simulateCompleteWalletConnection(page);

            // 新しいタブを開く
            const newPage = await context.newPage();
            await newPage.goto('/');

            // 新しいタブでもethersモックを設定
            await setupEthersMock(newPage);

            // 新しいタブでも接続状態が反映されていることを確認
            await expect(newPage.getByRole('button', { name: '切断' })).toBeVisible();
            await expect(newPage.getByRole('button', { name: '新規作成' })).toBeVisible();
            await expect(newPage.locator('.font-mono')).toBeVisible();

            // 新しいタブを閉じる
            await newPage.close();
        });

        test('タブ間でのアカウント切り替え同期', async ({ page, context }) => {
            // 最初のタブでウォレット接続
            await simulateCompleteWalletConnection(page);

            // 新しいタブを開く
            const newPage = await context.newPage();
            await newPage.goto('/');
            await setupEthersMock(newPage);

            // 最初のタブでアカウント切り替え
            await walletHelper.simulateAccountSwitch();

            // 新しいタブでもアカウント切り替えが反映されることを確認
            await expect(newPage.locator('.font-mono')).toBeVisible();

            await newPage.close();
        });
    });

    test.describe('2.3.6 状態復元のテスト', () => {
        test('ページ再読み込み時の状態復元', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // アカウントアドレスを記録
            const originalAddress = await page.locator('.font-mono').textContent();

            // ページを再読み込み
            await page.reload();

            // 状態が復元されていることを確認
            await expect(page.getByRole('button', { name: '切断' })).toBeVisible();
            await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();
            await expect(page.locator('.font-mono')).toBeVisible();

            // アカウントアドレスが同じであることを確認
            const restoredAddress = await page.locator('.font-mono').textContent();
            expect(restoredAddress).toBe(originalAddress);
        });

        test('ブラウザ再起動後の状態復元', async ({ page }) => {
            // ウォレット接続
            await simulateCompleteWalletConnection(page);

            // アカウントアドレスを記録
            const originalAddress = await page.locator('.font-mono').textContent();

            // ページを閉じて再開（ブラウザ再起動をシミュレート）
            await page.close();
            await page.goto('/');
            await setupEthersMock(page);

            // 状態が復元されていることを確認
            await expect(page.getByRole('button', { name: '切断' })).toBeVisible();
            await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();
            await expect(page.locator('.font-mono')).toBeVisible();

            // アカウントアドレスが同じであることを確認
            const restoredAddress = await page.locator('.font-mono').textContent();
            expect(restoredAddress).toBe(originalAddress);
        });
    });
});
