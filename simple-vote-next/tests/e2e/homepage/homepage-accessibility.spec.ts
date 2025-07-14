/**
 * ホームページアクセシビリティテスト
 * アクセシビリティ要件を満たしているかをテストする
 */

import { test, expect } from '@playwright/test';
import { setupContractMock } from '../../helpers/contract-mock';
import { defaultPolls } from '../fixtures/homepage-fixtures';

test.describe('ホームページアクセシビリティ', () => {
    test.beforeEach(async ({ page }) => {
        // ホームページに移動
        await page.goto('/');
    });

    test('ページの基本構造が適切', async ({ page }) => {
        // ページタイトルが適切に設定されていることを確認
        await expect(page).toHaveTitle(/SimpleVote/);

        // メインの見出しが適切に設定されていることを確認
        await expect(page.locator('h1').first()).toContainText('SimpleVote');
        await expect(page.locator('h1').nth(1)).toContainText('投票一覧');

        // 投票一覧の見出しが適切に設定されていることを確認
        await expect(page.locator('h2')).toContainText('Poll 一覧');

        // メインコンテンツエリアが存在することを確認
        await expect(page.locator('main')).toBeVisible();
    });

    test('キーボードナビゲーションが機能する', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

        // ページをリロードしてモックを適用
        await page.reload();

        // Tabキーでフォーカス移動
        await page.keyboard.press('Tab');

        // 新規作成ボタンにフォーカスが移動することを確認
        await expect(page.locator('text=新規作成')).toBeFocused();

        // Enterキーでボタンアクティベート
        await page.keyboard.press('Enter');

        // 作成ページに遷移することを確認
        await expect(page).toHaveURL(/\/create/);
    });

    test('投票項目のキーボードナビゲーション', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

        // ページをリロードしてモックを適用
        await page.reload();

        // 新規作成ボタンにフォーカスを移動
        await page.keyboard.press('Tab');
        await expect(page.locator('text=新規作成')).toBeFocused();

        // 次の要素（最初の投票）にフォーカスを移動
        await page.keyboard.press('Tab');
        await expect(page.locator('ul li button').first()).toBeFocused();

        // Enterキーで投票を選択
        await page.keyboard.press('Enter');

        // 適切なページに遷移することを確認
        await expect(page).toHaveURL(/\/dynamic\/1/);
    });

    test('aria-label属性が適切に設定されている', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

        // ページをリロードしてモックを適用
        await page.reload();

        // 新規作成ボタンのaria-label属性を確認
        await expect(page.locator('text=新規作成')).toHaveAttribute(
            'aria-label',
            '新しい投票を作成する'
        );

        // 各投票項目のaria-label属性を確認
        for (let i = 0; i < defaultPolls.length; i++) {
            const poll = defaultPolls[i];
            const button = page.locator('ul li button').nth(i);
            await expect(button).toHaveAttribute(
                'aria-label',
                `${poll.type}投票「${poll.topic}」を選択する`
            );
        }
    });

    test('ウォレット接続ボタンのアクセシビリティ', async ({ page }) => {
        // ウォレット接続ボタンのaria-label属性を確認
        await expect(page.locator('text=ウォレット接続')).toHaveAttribute(
            'aria-label',
            'ウォレットを接続する'
        );

        // ボタンがキーボードでアクセス可能であることを確認
        await page.keyboard.press('Tab');
        await expect(page.locator('text=ウォレット接続')).toBeFocused();

        // Enterキーでボタンアクティベート
        await page.keyboard.press('Enter');
    });

    test('色のコントラストが適切', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

        // ページをリロードしてモックを適用
        await page.reload();

        // 見出しの色が適切であることを確認
        const h1 = page.locator('h1').first();
        await expect(h1).toHaveClass(/text-gray-900/);

        // 新規作成ボタンの色が適切であることを確認
        const createButton = page.locator('text=新規作成');
        await expect(createButton).toHaveClass(/bg-green-600/);
        await expect(createButton).toHaveClass(/text-white/);

        // 投票項目の色が適切であることを確認
        const pollButton = page.locator('ul li button').first();
        await expect(pollButton).toHaveClass(/text-blue-600/);
    });

    test('フォーカス表示が適切', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

        // ページをリロードしてモックを適用
        await page.reload();

        // 新規作成ボタンにフォーカス
        await page.keyboard.press('Tab');
        const createButton = page.locator('text=新規作成');
        await expect(createButton).toBeFocused();

        // フォーカス表示のスタイルを確認
        await expect(createButton).toHaveClass(/focus:ring/);

        // 投票項目にフォーカス
        await page.keyboard.press('Tab');
        const pollButton = page.locator('ul li button').first();
        await expect(pollButton).toBeFocused();

        // フォーカス表示のスタイルを確認
        await expect(pollButton).toHaveClass(/focus:ring/);
    });

    test('スクリーンリーダー対応', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

        // ページをリロードしてモックを適用
        await page.reload();

        // 見出しの階層が適切であることを確認
        await expect(page.locator('h1').first()).toContainText('SimpleVote');
        await expect(page.locator('h1').nth(1)).toContainText('投票一覧');
        await expect(page.locator('h2')).toContainText('Poll 一覧');

        // リスト構造が適切であることを確認
        await expect(page.locator('ul')).toBeVisible();
        const listItems = page.locator('ul li');
        await expect(listItems).toHaveCount(defaultPolls.length);

        // 各リスト項目が適切に構造化されていることを確認
        for (let i = 0; i < defaultPolls.length; i++) {
            const listItem = listItems.nth(i);
            const button = listItem.locator('button');
            await expect(button).toBeVisible();
        }
    });

    test('レスポンシブアクセシビリティ', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

        // ページをリロードしてモックを適用
        await page.reload();

        // デスクトップサイズでのアクセシビリティ
        await page.setViewportSize({ width: 1920, height: 1080 });
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('text=新規作成')).toBeVisible();

        // タブレットサイズでのアクセシビリティ
        await page.setViewportSize({ width: 768, height: 1024 });
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('text=新規作成')).toBeVisible();

        // モバイルサイズでのアクセシビリティ
        await page.setViewportSize({ width: 375, height: 667 });
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('text=新規作成')).toBeVisible();
    });

    test('動的コンテンツのアクセシビリティ', async ({ page }) => {
        // ウォレット接続をシミュレート
        await page.evaluate(() => {
            (window as any).mockWallet = {
                isConnected: true,
                account: '0x1234567890123456789012345678901234567890',
            };
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

        // ページをリロードしてモックを適用
        await page.reload();

        // 動的に追加されたコンテンツが適切にアクセス可能であることを確認
        const pollButtons = page.locator('ul li button');
        await expect(pollButtons).toHaveCount(defaultPolls.length);

        // 各投票項目が適切にラベル付けされていることを確認
        for (let i = 0; i < defaultPolls.length; i++) {
            const poll = defaultPolls[i];
            const button = pollButtons.nth(i);
            await expect(button).toHaveAttribute(
                'aria-label',
                `${poll.type}投票「${poll.topic}」を選択する`
            );
        }
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

        // エラー状態でも基本的なアクセシビリティが維持されることを確認
        await expect(page.locator('h1').first()).toContainText('SimpleVote');
        await expect(page.locator('h1').nth(1)).toContainText('投票一覧');
        await expect(page.locator('h2')).toContainText('Poll 一覧');

        // エラーメッセージが適切に表示されることを確認
        await expect(page.locator('p')).toContainText('議題が存在しません');

        // 新規作成ボタンがアクセス可能であることを確認
        await expect(page.locator('text=新規作成')).toBeVisible();
        await expect(page.locator('text=新規作成')).toHaveAttribute(
            'aria-label',
            '新しい投票を作成する'
        );
    });
});
