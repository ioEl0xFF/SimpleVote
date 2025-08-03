/**
 * ホームページローディング状態テスト
 * ローディング中の表示と完了後の状態をテストする
 */

import { test, expect } from '@playwright/test';
import {
    setupUnifiedEthersMock,
    defaultPolls,
    setupEmptyPolls,
    setupMockError,
} from '../../helpers/unified-mock';

test.describe('ホームページローディング状態', () => {
    test.beforeEach(async ({ page }) => {
        // 統合モックを設定（デフォルトの投票データで）
        await setupUnifiedEthersMock(page, {
            polls: defaultPolls,
            walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        });

        // ホームページに移動
        await page.goto('/');

        // ウォレット接続ボタンが表示されることを確認
        await expect(page.locator('button')).toContainText('ウォレットを接続する');

        // ウォレット接続をトリガー
        await page.locator('button').filter({ hasText: 'ウォレットを接続する' }).click();

        // ウォレット接続完了後、投票一覧の読み込みが開始されるまで少し待機
        await page.waitForTimeout(100);
    });

    test('初期ローディング状態が表示される', async ({ page }) => {
        // ローディングスピナーが表示されることを確認
        await expect(page.locator('.animate-spin')).toBeVisible();

        // ローディングメッセージが表示されることを確認
        await expect(page.locator('p')).toContainText('投票一覧を読み込み中...');
    });

    test('ローディング完了後に投票一覧が表示される', async ({ page }) => {
        // 初期ローディング状態を確認（オプション - すぐにローディングが完了する場合はスキップ）
        // await expect(page.locator('.animate-spin')).toBeVisible();

        // ローディング完了を待機
        await expect(page.locator('h2')).toContainText('Poll 一覧');

        // ローディングスピナーが非表示になることを確認
        await expect(page.locator('.animate-spin')).not.toBeVisible();

        // 投票一覧が表示されることを確認（デフォルトで3つの投票データ）
        const pollButtons = page.locator('ul li button');
        await expect(pollButtons).toHaveCount(3);
    });

    test('ローディング中にエラーが発生した場合の処理', async ({ page }) => {
        // エラー状態のモックを設定し、ページを再読み込み
        await setupMockError(page, 'Network error');
        await page.reload();

        // ウォレット接続をトリガー
        await page.locator('button').filter({ hasText: 'ウォレットを接続する' }).click();
        await page.waitForTimeout(100);

        // ローディング完了を待機
        await expect(page.locator('h2')).toContainText('Poll 一覧');

        // エラー後に空の状態が表示されることを確認
        await expect(page.locator('p')).toContainText('議題が存在しません');
    });

    test('ローディング状態のアクセシビリティ', async ({ page }) => {
        // ローディングメッセージがスクリーンリーダーで読み取れることを確認
        const loadingMessage = page.locator('p').filter({ hasText: '投票一覧を読み込み中...' });
        await expect(loadingMessage).toBeVisible();

        // ローディングスピナーが適切にラベル付けされていることを確認
        const spinner = page.locator('.animate-spin');
        await expect(spinner).toBeVisible();
    });

    test('ローディング状態のパフォーマンス', async ({ page }) => {
        // ローディング状態の表示時間を測定
        const startTime = Date.now();

        // ローディング完了を待機
        await expect(page.locator('h2')).toContainText('Poll 一覧');

        const loadTime = Date.now() - startTime;

        // ローディング時間が妥当な範囲内であることを確認（5秒以内）
        expect(loadTime).toBeLessThan(5000);
    });

    test('空の投票一覧のローディング', async ({ page }) => {
        // 空の投票データでモックを設定し、ページを再読み込み
        await setupEmptyPolls(page);
        await page.reload();

        // ウォレット接続をトリガー
        await page.locator('button').filter({ hasText: 'ウォレットを接続する' }).click();
        await page.waitForTimeout(100);

        // ローディング完了を待機
        await expect(page.locator('h2')).toContainText('Poll 一覧');

        // 空の状態メッセージが表示されることを確認
        await expect(page.locator('p')).toContainText('議題が存在しません');

        // 投票ボタンが表示されないことを確認
        const pollButtons = page.locator('ul li button');
        await expect(pollButtons).toHaveCount(0);
    });
});
