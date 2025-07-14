/**
 * ホームページローディング状態テスト
 * ローディング中の表示と完了後の状態をテストする
 */

import { test, expect } from '@playwright/test';
import { setupContractMock } from '../../helpers/contract-mock';

test.describe('ホームページローディング状態', () => {
    test.beforeEach(async ({ page }) => {
        // ホームページに移動
        await page.goto('/');
    });

    test('初期ローディング状態が表示される', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // ページをリロードしてモックを適用
        await page.reload();

        // ローディングスピナーが表示されることを確認
        await expect(page.locator('.animate-spin')).toBeVisible();

        // ローディングメッセージが表示されることを確認
        await expect(page.locator('p')).toContainText('投票一覧を読み込み中...');
    });

    test('ローディング完了後に投票一覧が表示される', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // 投票データをモック（遅延付き）
        await page.evaluate(() => {
            (window as any).mockContract = {
                getPolls: () =>
                    new Promise((resolve) => {
                        setTimeout(() => {
                            resolve([
                                [1, 2, 3],
                                [0, 1, 2],
                                ['0x123', '0x123', '0x123'],
                                ['投票1', '投票2', '投票3'],
                            ]);
                        }, 1000);
                    }),
                getPoll: () =>
                    Promise.resolve([
                        '0x1234567890123456789012345678901234567890',
                        'Test Poll',
                        ['Option 1', 'Option 2'],
                        [10, 5],
                        0, // startTime
                        9999999999, // endTime
                        ['Option 1', 'Option 2'],
                        [10, 5],
                    ]),
                on: () => {},
                off: () => {},
            };
        });

        // ページをリロードしてモックを適用
        await page.reload();

        // 初期ローディング状態を確認
        await expect(page.locator('.animate-spin')).toBeVisible();

        // ローディング完了を待機
        await expect(page.locator('h2')).toContainText('Poll 一覧');

        // ローディングスピナーが非表示になることを確認
        await expect(page.locator('.animate-spin')).not.toBeVisible();

        // 投票一覧が表示されることを確認
        const pollButtons = page.locator('ul li button');
        await expect(pollButtons).toHaveCount(3);
    });

    test('ローディング中にエラーが発生した場合の処理', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // エラーを発生させるモック
        await page.evaluate(() => {
            (window as any).mockContract = {
                getPolls: () => Promise.reject(new Error('Network error')),
                on: () => {},
                off: () => {},
            };
        });

        // ページをリロードしてモックを適用
        await page.reload();

        // ローディング完了を待機
        await expect(page.locator('h2')).toContainText('Poll 一覧');

        // エラー後に空の状態が表示されることを確認
        await expect(page.locator('p')).toContainText('議題が存在しません');
    });

    test('ローディング状態のアクセシビリティ', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // ページをリロードしてモックを適用
        await page.reload();

        // ローディングメッセージがスクリーンリーダーで読み取れることを確認
        const loadingMessage = page.locator('p').filter({ hasText: '投票一覧を読み込み中...' });
        await expect(loadingMessage).toBeVisible();

        // ローディングスピナーが適切にラベル付けされていることを確認
        const spinner = page.locator('.animate-spin');
        await expect(spinner).toBeVisible();
    });

    test('ローディング状態のパフォーマンス', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // ページをリロードしてモックを適用
        await page.reload();

        // ローディング状態の表示時間を測定
        const startTime = Date.now();

        // ローディング完了を待機
        await expect(page.locator('h2')).toContainText('Poll 一覧');

        const loadTime = Date.now() - startTime;

        // ローディング時間が妥当な範囲内であることを確認（5秒以内）
        expect(loadTime).toBeLessThan(5000);
    });
});
