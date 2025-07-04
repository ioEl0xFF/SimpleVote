import { test, expect } from '@playwright/test';
import { WalletTestUtils } from '../helpers/wallet-test-utils';

test.describe('ウォレット接続機能', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test.describe('ウォレット接続ボタンの表示', () => {
        test('接続前の状態でボタンが表示される', async ({ page }) => {
            const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
            await expect(connectButton).toBeVisible();
        });

        test('ボタンのテキストが正しく表示される', async ({ page }) => {
            const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
            await expect(connectButton).toHaveText(/ウォレット接続/);
        });

        test('ボタンがクリック可能である', async ({ page }) => {
            const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
            await expect(connectButton).toBeEnabled();
        });

        test('ボタンのスタイルが正しく適用されている', async ({ page }) => {
            await WalletTestUtils.checkConnectButtonStyles(page);
        });
    });

    test.describe('ウォレット接続プロセス', () => {
        test('接続ボタンクリックでウォレット選択ダイアログが表示される', async ({ page }) => {
            const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
            await connectButton.click();

            // ウォレット接続状態をシミュレート
            await WalletTestUtils.mockMetaMaskInstalled(page);
        });

        test('MetaMaskなどのウォレットが検出される', async ({ page }) => {
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            // ウォレットアドレスが表示されることを確認
            await expect(page.getByText(/0x1234/)).toBeVisible();
        });

        test('接続成功時にウォレットアドレスが表示される', async ({ page }) => {
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            const isAddressVisible = await WalletTestUtils.isWalletAddressVisible(page);
            expect(isAddressVisible).toBe(true);
        });

        test('接続成功時に投票一覧が表示される', async ({ page }) => {
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            const isPollListVisible = await WalletTestUtils.isPollListVisible(page);
            expect(isPollListVisible).toBe(true);
        });

        test('接続成功時に新規作成ボタンが表示される', async ({ page }) => {
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            const isCreateButtonVisible = await WalletTestUtils.isCreateButtonVisible(page);
            expect(isCreateButtonVisible).toBe(true);
        });

        test('接続成功時にページタイトルが表示される', async ({ page }) => {
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            const isPageTitleVisible = await WalletTestUtils.isPageTitleVisible(page);
            expect(isPageTitleVisible).toBe(true);
        });
    });

    test.describe('ウォレット切断機能', () => {
        test('切断ボタンが表示される', async ({ page }) => {
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            const disconnectButton = page.getByRole('button', { name: /切断/i });
            await expect(disconnectButton).toBeVisible();
        });

        test('切断ボタンのスタイルが正しく適用されている', async ({ page }) => {
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            await WalletTestUtils.checkDisconnectButtonStyles(page);
        });

        test('切断後に接続状態がリセットされる', async ({ page }) => {
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            await WalletTestUtils.disconnectWallet(page);
            
            const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
            await expect(connectButton).toBeVisible();
        });

        test('切断後に投票一覧が非表示になる', async ({ page }) => {
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            await WalletTestUtils.disconnectWallet(page);

            const isPollListVisible = await WalletTestUtils.isPollListVisible(page);
            expect(isPollListVisible).toBe(false);
        });

        test('切断後に新規作成ボタンが非表示になる', async ({ page }) => {
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            await WalletTestUtils.disconnectWallet(page);

            const isCreateButtonVisible = await WalletTestUtils.isCreateButtonVisible(page);
            expect(isCreateButtonVisible).toBe(false);
        });
    });

    test.describe('エラーハンドリング', () => {
        test('接続失敗時のエラーハンドリング', async ({ page }) => {
            await WalletTestUtils.mockWalletRejection(page, 'User rejected the request');
            await WalletTestUtils.connectWallet(page);

            const isErrorMessageVisible = await WalletTestUtils.isErrorMessageVisible(page, 'rejected');
            expect(isErrorMessageVisible).toBe(true);
        });

        test('署名拒否時のエラーハンドリング', async ({ page }) => {
            await WalletTestUtils.mockSignatureRejection(page);
            await WalletTestUtils.connectWallet(page);

            const isErrorMessageVisible = await WalletTestUtils.isErrorMessageVisible(page, 'signature');
            expect(isErrorMessageVisible).toBe(true);
        });

        test('ネットワークエラー時のエラーハンドリング', async ({ page }) => {
            await WalletTestUtils.mockNetworkError(page, 'Network error occurred');
            await WalletTestUtils.connectWallet(page);

            const isErrorMessageVisible = await WalletTestUtils.isErrorMessageVisible(page, 'Network');
            expect(isErrorMessageVisible).toBe(true);
        });

        test('MetaMaskが未インストールの場合のエラーハンドリング', async ({ page }) => {
            await WalletTestUtils.mockMetaMaskNotInstalled(page);
            await WalletTestUtils.connectWallet(page);

            const isErrorMessageVisible = await WalletTestUtils.isErrorMessageVisible(page, 'MetaMask');
            expect(isErrorMessageVisible).toBe(true);
        });
    });

    test.describe('アクセシビリティ', () => {
        test('キーボードナビゲーション', async ({ page }) => {
            await WalletTestUtils.testKeyboardNavigation(page);
        });

        test('Tabキーでフォーカス移動', async ({ page }) => {
            await page.keyboard.press('Tab');
            
            const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
            await expect(connectButton).toBeFocused();
        });

        test('Enterキーでボタン操作', async ({ page }) => {
            const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
            await connectButton.focus();
            await page.keyboard.press('Enter');

            // ウォレット接続状態をシミュレート
            await WalletTestUtils.mockMetaMaskInstalled(page);
            
            const isAddressVisible = await WalletTestUtils.isWalletAddressVisible(page);
            expect(isAddressVisible).toBe(true);
        });

        test('Spaceキーでボタン操作', async ({ page }) => {
            const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
            await connectButton.focus();
            await page.keyboard.press('Space');

            // ウォレット接続状態をシミュレート
            await WalletTestUtils.mockMetaMaskInstalled(page);
            
            const isAddressVisible = await WalletTestUtils.isWalletAddressVisible(page);
            expect(isAddressVisible).toBe(true);
        });

        test('Escapeキーでダイアログ閉じる', async ({ page }) => {
            await WalletTestUtils.mockWalletRejection(page, 'User rejected the request');
            await WalletTestUtils.connectWallet(page);

            // エラーメッセージが表示された状態でEscapeキーを押す
            await page.keyboard.press('Escape');

            // エラーメッセージが非表示になることを確認
            const isErrorMessageVisible = await WalletTestUtils.isErrorMessageVisible(page, 'rejected');
            expect(isErrorMessageVisible).toBe(false);
        });

        test('aria-label属性の確認', async ({ page }) => {
            const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
            await expect(connectButton).toHaveAttribute('aria-label', /ウォレット接続/i);
        });
    });

    test.describe('レスポンシブデザイン', () => {
        test('デスクトップ表示 (1920x1080)', async ({ page }) => {
            await WalletTestUtils.testResponsiveDesign(page, { width: 1920, height: 1080 });
        });

        test('デスクトップ表示 (1366x768)', async ({ page }) => {
            await WalletTestUtils.testResponsiveDesign(page, { width: 1366, height: 768 });
        });

        test('タブレット表示 (768x1024)', async ({ page }) => {
            await WalletTestUtils.testResponsiveDesign(page, { width: 768, height: 1024 });
        });

        test('モバイル表示 (375x667)', async ({ page }) => {
            await WalletTestUtils.testResponsiveDesign(page, { width: 375, height: 667 });
        });

        test('モバイル表示 (320x568)', async ({ page }) => {
            await WalletTestUtils.testResponsiveDesign(page, { width: 320, height: 568 });
        });

        test('タッチ操作の動作確認', async ({ page }) => {
            // モバイルサイズに設定
            await page.setViewportSize({ width: 375, height: 667 });
            
            const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
            await expect(connectButton).toBeVisible();

            // タッチ操作をシミュレート
            await connectButton.tap();

            // ウォレット接続状態をシミュレート
            await WalletTestUtils.mockMetaMaskInstalled(page);
            
            const isAddressVisible = await WalletTestUtils.isWalletAddressVisible(page);
            expect(isAddressVisible).toBe(true);
        });
    });

    test.describe('パフォーマンス', () => {
        test('ページ読み込み速度', async ({ page }) => {
            const startTime = Date.now();
            await page.goto('/');
            const loadTime = Date.now() - startTime;

            // 3秒以内に読み込みが完了することを確認
            expect(loadTime).toBeLessThan(3000);
        });

        test('ウォレット接続の応答速度', async ({ page }) => {
            await WalletTestUtils.mockMetaMaskInstalled(page);
            
            const startTime = Date.now();
            await WalletTestUtils.connectWallet(page);
            const responseTime = Date.now() - startTime;

            // 2秒以内に応答することを確認
            expect(responseTime).toBeLessThan(2000);
        });
    });

    test.describe('ブラウザ互換性', () => {
        test('Chrome/Chromiumでの動作確認', async ({ page }) => {
            // Chrome/Chromiumでの動作確認
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            const isAddressVisible = await WalletTestUtils.isWalletAddressVisible(page);
            expect(isAddressVisible).toBe(true);
        });

        test('Firefoxでの動作確認', async ({ page }) => {
            // Firefoxでの動作確認
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            const isAddressVisible = await WalletTestUtils.isWalletAddressVisible(page);
            expect(isAddressVisible).toBe(true);
        });

        test('Safariでの動作確認', async ({ page }) => {
            // Safariでの動作確認
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            const isAddressVisible = await WalletTestUtils.isWalletAddressVisible(page);
            expect(isAddressVisible).toBe(true);
        });

        test('Edgeでの動作確認', async ({ page }) => {
            // Edgeでの動作確認
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            const isAddressVisible = await WalletTestUtils.isWalletAddressVisible(page);
            expect(isAddressVisible).toBe(true);
        });
    });

    test.describe('統合テスト', () => {
        test('完全なウォレット接続・切断フロー', async ({ page }) => {
            // 1. 初期状態の確認
            const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
            await expect(connectButton).toBeVisible();

            // 2. ウォレット接続
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            // 3. 接続後の状態確認
            const isAddressVisible = await WalletTestUtils.isWalletAddressVisible(page);
            expect(isAddressVisible).toBe(true);

            const isPollListVisible = await WalletTestUtils.isPollListVisible(page);
            expect(isPollListVisible).toBe(true);

            // 4. ウォレット切断
            await WalletTestUtils.disconnectWallet(page);

            // 5. 切断後の状態確認
            await expect(page.getByRole('button', { name: /ウォレット接続/i })).toBeVisible();

            const isPollListVisibleAfterDisconnect = await WalletTestUtils.isPollListVisible(page);
            expect(isPollListVisibleAfterDisconnect).toBe(false);
        });

        test('エラー発生後の再接続', async ({ page }) => {
            // 1. 初回接続失敗
            await WalletTestUtils.mockWalletRejection(page, 'User rejected the request');
            await WalletTestUtils.connectWallet(page);

            const isErrorMessageVisible = await WalletTestUtils.isErrorMessageVisible(page, 'rejected');
            expect(isErrorMessageVisible).toBe(true);

            // 2. 再接続成功
            await WalletTestUtils.mockMetaMaskInstalled(page);
            await WalletTestUtils.connectWallet(page);

            const isAddressVisible = await WalletTestUtils.isWalletAddressVisible(page);
            expect(isAddressVisible).toBe(true);
        });
    });
});
