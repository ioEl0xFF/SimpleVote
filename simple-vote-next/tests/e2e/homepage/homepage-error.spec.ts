/**
 * ホームページエラー状態テスト
 * エラー発生時の適切な処理をテストする
 */

import { test, expect } from '@playwright/test';
import {
    mockSuccessfulWalletConnection,
    mockFailedWalletConnection,
} from '../../helpers/wallet-mock';
import { mockContractError, mockNetworkError } from '../../helpers/contract-mock';
import { verifyErrorState, verifyPollList } from '../../helpers/homepage-helpers';
import { emptyPolls } from '../fixtures/homepage-fixtures';
import { simulateNetworkError, getConsoleLogs } from '../../utils/test-utils';
import { setupContractMock } from '../../helpers/contract-mock';

test.describe('ホームページエラー状態', () => {
    test.beforeEach(async ({ page }) => {
        // ホームページに移動
        await page.goto('/');
    });

    test('ネットワークエラー時の処理', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // ネットワークエラーをモック
        await page.evaluate(() => {
            (window as any).mockContract = {
                getPolls: () => Promise.reject(new Error('Network error')),
                on: () => {},
                off: () => {},
            };
        });

        // ページをリロードしてモックを適用
        await page.reload();

        // エラー後に空の状態が表示されることを確認
        await expect(page.locator('h2')).toContainText('Poll 一覧');
        await expect(page.locator('p')).toContainText('議題が存在しません');
    });

    test('コントラクトエラー時の処理', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // コントラクトエラーをモック
        await page.evaluate(() => {
            (window as any).mockContract = {
                getPolls: () => Promise.reject(new Error('Contract call failed')),
                on: () => {},
                off: () => {},
            };
        });

        // ページをリロードしてモックを適用
        await page.reload();

        // エラー後に空の状態が表示されることを確認
        await expect(page.locator('h2')).toContainText('Poll 一覧');
        await expect(page.locator('p')).toContainText('議題が存在しません');
    });

    test('ウォレット接続エラー時の処理', async ({ page }) => {
        // ウォレット接続エラーをシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: false,
                error: 'User rejected connection',
            };
        });

        // ページをリロードしてモックを適用
        await page.reload();

        // ウォレット接続ボタンが表示されることを確認
        await expect(page.locator('text=ウォレット接続')).toBeVisible();

        // 投票一覧が表示されないことを確認
        await expect(page.locator('h2')).not.toContainText('Poll 一覧');
    });

    test('無効なデータ形式エラー時の処理', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // 無効なデータ形式をモック
        await page.evaluate(() => {
            (window as any).mockContract = {
                getPolls: () => Promise.resolve([null, null, null, null]),
                on: () => {},
                off: () => {},
            };
        });

        // ページをリロードしてモックを適用
        await page.reload();

        // エラー後に空の状態が表示されることを確認
        await expect(page.locator('h2')).toContainText('Poll 一覧');
        await expect(page.locator('p')).toContainText('議題が存在しません');
    });

    test('タイムアウトエラー時の処理', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // タイムアウトエラーをモック
        await page.evaluate(() => {
            (window as any).mockContract = {
                getPolls: () =>
                    new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Timeout')), 100);
                    }),
                on: () => {},
                off: () => {},
            };
        });

        // ページをリロードしてモックを適用
        await page.reload();

        // エラー後に空の状態が表示されることを確認
        await expect(page.locator('h2')).toContainText('Poll 一覧');
        await expect(page.locator('p')).toContainText('議題が存在しません');
    });

    test('エラー状態からの復旧', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // 最初はエラー、次は正常なデータをモック
        let callCount = 0;
        await page.evaluate(() => {
            (window as any).mockContract = {
                getPolls: () => {
                    (window as any).callCount = ((window as any).callCount || 0) + 1;
                    if ((window as any).callCount === 1) {
                        return Promise.reject(new Error('Initial error'));
                    }
                    return Promise.resolve([
                        [1, 2],
                        [0, 1],
                        ['0x123', '0x123'],
                        ['投票1', '投票2'],
                    ]);
                },
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

        // 最初はエラー状態
        await expect(page.locator('p')).toContainText('議題が存在しません');

        // ページを再リロードして正常なデータを取得
        await page.reload();

        // 正常なデータが表示されることを確認
        const pollButtons = page.locator('ul li button');
        await expect(pollButtons).toHaveCount(2);
    });

    test('エラー状態のアクセシビリティ', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // エラーをモック
        await page.evaluate(() => {
            (window as any).mockContract = {
                getPolls: () => Promise.reject(new Error('Test error')),
                on: () => {},
                off: () => {},
            };
        });

        // ページをリロードしてモックを適用
        await page.reload();

        // エラーメッセージがスクリーンリーダーで読み取れることを確認
        const errorMessage = page.locator('p').filter({ hasText: '議題が存在しません' });
        await expect(errorMessage).toBeVisible();

        // ページの基本構造が維持されていることを確認
        await expect(page.locator('h1').first()).toContainText('SimpleVote');
        await expect(page.locator('h1').nth(1)).toContainText('投票一覧');
    });

    test('エラー状態でのユーザーインタラクション', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // エラーをモック
        await page.evaluate(() => {
            (window as any).mockContract = {
                getPolls: () => Promise.reject(new Error('Test error')),
                on: () => {},
                off: () => {},
            };
        });

        // ページをリロードしてモックを適用
        await page.reload();

        // エラー状態でも新規作成ボタンが機能することを確認
        const createButton = page.locator('text=新規作成');
        await expect(createButton).toBeVisible();
        await createButton.click();

        // 作成ページに遷移することを確認
        await expect(page).toHaveURL(/\/create/);
    });
});
