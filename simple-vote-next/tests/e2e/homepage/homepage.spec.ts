/**
 * ホームページ基本機能テスト
 * ホームページの主要機能をテストする
 * ウォレット接続前後の表示の違いを正確にテスト
 */

import { test, expect } from '@playwright/test';

import {
    setupUnifiedEthersMock,
    defaultPolls as unifiedDefaultPolls,
} from '../../helpers/unified-mock';

import {
    setupHomePageTest,
    verifyPollList,
    clickPollAndVerifyNavigation,
    testCreateButton,
    testAccessibility,
    testResponsiveDesign,
} from '../../helpers/homepage-helpers';
import { setupConsoleLogging, ConsoleLogger } from '../../utils/test-utils';

test.describe('ホームページ基本機能', () => {
    test('ウォレット未接続時の表示内容', async ({ page }) => {
        // ホームページに移動
        await page.goto('/');

        // メインタイトルが表示されることを確認
        await expect(page.locator('h1').first()).toContainText('SimpleVote');

        // ウォレット接続ボタンが表示されることを確認
        const connectButton = page.locator('text=ウォレット接続');
        await expect(connectButton).toBeVisible();

        // ボタンのテキストが正しいことを確認
        await expect(connectButton).toContainText('ウォレット接続');

        // aria-label属性が正しく設定されていることを確認
        await expect(connectButton).toHaveAttribute('aria-label', 'ウォレットを接続する');

        // ウォレット情報エリアが表示されないことを確認
        await expect(page.locator('.font-mono')).not.toBeVisible();

        // 切断ボタンが表示されないことを確認
        await expect(page.locator('text=切断')).not.toBeVisible();

        // 投票一覧エリアが表示されないことを確認（childrenが表示されない）
        await expect(page.locator('h2').filter({ hasText: 'Poll 一覧' })).not.toBeVisible();
        await expect(page.locator('text=新規作成')).not.toBeVisible();
    });

    test('ウォレット接続後の表示内容', async ({ page }) => {
        // 統合モックの設定
        await setupUnifiedEthersMock(page, {
            polls: [],
            walletAddress: '0x1234567890123456789012345678901234567890',
        });

        // ホームページに移動
        await page.goto('/');

        // ウォレット接続ボタンをクリック
        const connectButton = page.locator('text=ウォレット接続');
        await expect(connectButton).toBeVisible();
        await connectButton.click();

        // ウォレット接続が完了するまで待機
        await expect(page.locator('text=ウォレット接続')).not.toBeVisible();

        // メインタイトルが表示されることを確認
        await expect(page.locator('h1').first()).toContainText('SimpleVote');

        // ウォレットアドレスが表示されることを確認
        const walletAddress = page.locator('.font-mono');
        await expect(walletAddress).toBeVisible();
        await expect(walletAddress).toContainText('0x1234567890123456789012345678901234567890');

        // aria-label属性が正しく設定されていることを確認
        await expect(walletAddress).toHaveAttribute(
            'aria-label',
            '接続中のウォレットアドレス: 0x1234567890123456789012345678901234567890'
        );

        // 切断ボタンが表示されることを確認
        const disconnectButton = page.locator('text=切断');
        await expect(disconnectButton).toBeVisible();
        await expect(disconnectButton).toHaveAttribute('aria-label', 'ウォレットを切断する');

        // 投票一覧の見出しが表示されることを確認（PageHeaderコンポーネント内）
        await expect(page.locator('h1').filter({ hasText: '投票一覧' })).toBeVisible();

        // Poll 一覧の見出しが表示されることを確認（PollListコンポーネント内）
        await expect(page.locator('h2').filter({ hasText: 'Poll 一覧' })).toBeVisible();

        // 新規作成ボタンが表示されることを確認
        await expect(page.locator('text=新規作成')).toBeVisible();
    });

    test('投票一覧が表示される（データがある場合）', async ({ page }) => {
        // コンソールログ保存機能のセットアップ
        const logger = setupConsoleLogging(page, '投票一覧表示テスト（データあり）', {
            autoSave: false, // 手動で保存を制御
            saveFormat: 'both', // JSONとテキスト形式の両方で保存
        });

        try {
            // 1. 統合モックの設定（ページ読み込み前）
            await setupUnifiedEthersMock(page, {
                polls: unifiedDefaultPolls,
                walletAddress: '0x1234567890123456789012345678901234567890',
            });

            // 2. ページ読み込み
            await page.goto('/');

            // 3. ウォレット接続（シンプルなクリック）
            const connectButton = page.locator('text=ウォレット接続');
            await expect(connectButton).toBeVisible();
            await connectButton.click();

            // ウォレット接続が完了するまで待機
            await expect(page.locator('text=ウォレット接続')).not.toBeVisible();

            // 4. データ読み込み完了の待機（具体的な要素）
            await expect(page.locator('h2').filter({ hasText: 'Poll 一覧' })).toBeVisible();

            // 3つの投票ボタンが表示されるまで待機
            await expect(page.locator('ul li button')).toHaveCount(3);

            // 各投票データが正確に表示されることを確認
            const pollButtons = page.locator('ul li button');

            // 全ての投票データを確認
            for (let i = 0; i < unifiedDefaultPolls.length; i++) {
                const poll = unifiedDefaultPolls[i];
                const button = pollButtons.nth(i);

                // 要素が存在することを確認
                await expect(button).toBeVisible({ timeout: 5000 });

                // 投票タイプが正しく表示されることを確認
                await expect(button).toContainText(poll.type);

                // 投票タイトルが正しく表示されることを確認
                await expect(button).toContainText(poll.topic);

                // 投票IDが正しく表示されることを確認
                await expect(button).toContainText(poll.id.toString());
            }
        } finally {
            // テスト成功/失敗に関わらず、コンソールログを保存
            try {
                const jsonLogPath = await logger.saveLogsToFile();
                const textLogPath = await logger.saveLogsAsText();

                // コンソールに保存パスを出力（実際のテストログで確認可能）
                console.log(`Console logs saved to: ${jsonLogPath}`);
                console.log(`Console logs saved to: ${textLogPath}`);

                // エラーログのみをチェック（デバッグ用）
                const errorLogs = logger.getErrorLogs();
                if (errorLogs.length > 0) {
                    console.log('Error logs found:', errorLogs);
                    console.log(
                        'Error details:',
                        errorLogs.map((log) => ({
                            type: log.type,
                            message: log.message.substring(0, 100) + '...',
                            timestamp: log.timestamp,
                        }))
                    );
                }

                // ログの統計情報を確認
                const allLogs = logger.getLogs();
                console.log(`Total logs captured: ${allLogs.length}`);

                // テスト失敗時の詳細な情報
                const logSummary = allLogs.reduce((acc, log) => {
                    acc[log.type] = (acc[log.type] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                console.log('Log summary by type:', logSummary);
            } catch (saveError) {
                console.error('Failed to save console logs:', saveError);
            }
        }
    });

    test('投票一覧が空の場合のメッセージが表示される', async ({ page }) => {
        // 統合モックの設定（空の投票データ）
        await setupUnifiedEthersMock(page, {
            polls: [],
            walletAddress: '0x1234567890123456789012345678901234567890',
        });

        // ホームページに移動
        await page.goto('/');

        // ウォレット接続ボタンをクリック
        const connectButton = page.locator('text=ウォレット接続');
        await expect(connectButton).toBeVisible();
        await connectButton.click();

        // ウォレット接続が完了するまで待機
        await expect(page.locator('text=ウォレット接続')).not.toBeVisible();

        // データ読み込み完了を待つ
        await expect(page.locator('h2').filter({ hasText: 'Poll 一覧' })).toBeVisible();

        // 空のメッセージが表示されることを確認
        await expect(page.locator('p').filter({ hasText: '議題が存在しません' })).toContainText(
            '議題が存在しません'
        );
    });

    test('「新規作成」ボタンが機能する', async ({ page }) => {
        // 統合モックの設定（空の投票データで十分）
        await setupUnifiedEthersMock(page, {
            polls: [],
            walletAddress: '0x1234567890123456789012345678901234567890',
        });

        // ホームページに移動
        await page.goto('/');

        // ウォレット接続ボタンをクリック
        const connectButton = page.locator('text=ウォレット接続');
        await expect(connectButton).toBeVisible();
        await connectButton.click();

        // ウォレット接続が完了するまで待機
        await expect(page.locator('text=ウォレット接続')).not.toBeVisible();

        // 新規作成ボタンが表示されるまで待機
        await expect(page.locator('text=新規作成')).toBeVisible();

        // 新規作成ボタンをクリック
        await page.locator('text=新規作成').click();

        // ページの見出し「議題作成」が表示されるまで待機
        await expect(page.locator('h1').filter({ hasText: '議題作成' })).toBeVisible();

        // 作成ページに遷移することを確認
        await expect(page).toHaveURL(/\/create/);
    });

    test('投票項目をクリックすると適切なページに遷移する', async ({ page }) => {
        // 統合モックの設定
        await setupUnifiedEthersMock(page, {
            polls: unifiedDefaultPolls,
            walletAddress: '0x1234567890123456789012345678901234567890',
        });

        // ホームページに移動
        await page.goto('/');

        // ウォレット接続ボタンをクリック
        const connectButton = page.locator('text=ウォレット接続');
        await expect(connectButton).toBeVisible();
        await connectButton.click();

        // ウォレット接続が完了するまで待機
        await expect(page.locator('text=ウォレット接続')).not.toBeVisible();

        // Poll 一覧の見出しが表示されるまで待機（データ読み込み完了の指標）
        await expect(page.locator('h2').filter({ hasText: 'Poll 一覧' })).toBeVisible();

        // 最初の投票項目をクリック
        const firstPollButton = page.locator('ul li button').first();
        await expect(firstPollButton).toBeVisible();
        await firstPollButton.click();

        // 適切なページに遷移することを確認
        await expect(page).toHaveURL(
            new RegExp(`/${unifiedDefaultPolls[0].type}/${unifiedDefaultPolls[0].id}`)
        );
    });

    test('投票項目の表示形式が正しい', async ({ page }) => {
        // 統合モックの設定
        await setupUnifiedEthersMock(page, {
            polls: unifiedDefaultPolls,
            walletAddress: '0x1234567890123456789012345678901234567890',
        });

        // ホームページに移動
        await page.goto('/');

        // ウォレット接続ボタンをクリック
        const connectButton = page.locator('text=ウォレット接続');
        await expect(connectButton).toBeVisible();
        await connectButton.click();

        // ウォレット接続が完了するまで待機
        await expect(page.locator('text=ウォレット接続')).not.toBeVisible();

        // Poll 一覧の見出しが表示されるまで待機（データ読み込み完了の指標）
        await expect(page.locator('h2').filter({ hasText: 'Poll 一覧' })).toBeVisible();

        // 各投票項目の表示形式を確認
        for (let i = 0; i < unifiedDefaultPolls.length; i++) {
            const poll = unifiedDefaultPolls[i];
            const button = page.locator('ul li button').nth(i);

            // 投票タイプとタイトルが正しく表示されることを確認
            await expect(button).toContainText(`${poll.type} : ${poll.topic}`);

            // IDが表示されることを確認
            await expect(button).toContainText(`(ID: ${poll.id})`);
        }
    });

    test('レスポンシブデザインが正常に動作する', async ({ page }) => {
        // ホームページに移動
        await page.goto('/');

        // デスクトップサイズでの表示を確認
        await page.setViewportSize({ width: 1920, height: 1080 });
        await expect(page.locator('main')).toBeVisible();

        // タブレットサイズでの表示を確認
        await page.setViewportSize({ width: 768, height: 1024 });
        await expect(page.locator('main')).toBeVisible();

        // モバイルサイズでの表示を確認
        await page.setViewportSize({ width: 375, height: 667 });
        await expect(page.locator('main')).toBeVisible();
    });

    test('キーボードナビゲーションが機能する（ウォレット接続後）', async ({ page }) => {
        // 統合モックの設定（投票データは空）
        await setupUnifiedEthersMock(page, {
            polls: [],
            walletAddress: '0x1234567890123456789012345678901234567890',
        });

        // ホームページに移動
        await page.goto('/');

        // ウォレット接続ボタンをクリック
        const connectButton = page.locator('text=ウォレット接続');
        await expect(connectButton).toBeVisible();
        await connectButton.click();

        // ウォレット接続が完了するまで待機
        await expect(page.locator('text=ウォレット接続')).not.toBeVisible();

        // 新規作成ボタンが表示されるまで待機
        await expect(page.locator('text=新規作成')).toBeVisible();

        // 新規作成ボタンにフォーカスを移動
        await page.locator('text=新規作成').focus();
        await expect(page.locator('text=新規作成')).toBeFocused();

        // Enterキーで新規作成ボタンをアクティベート
        await page.keyboard.press('Enter');

        // 作成ページに遷移することを確認
        await expect(page).toHaveURL(/\/create/);
    });

    test('投票項目のキーボードナビゲーション', async ({ page }) => {
        // 統合モックの設定
        await setupUnifiedEthersMock(page, {
            polls: unifiedDefaultPolls,
            walletAddress: '0x1234567890123456789012345678901234567890',
        });

        // ホームページに移動
        await page.goto('/');

        // ウォレット接続ボタンをクリック
        const connectButton = page.locator('text=ウォレット接続');
        await expect(connectButton).toBeVisible();
        await connectButton.click();

        // ウォレット接続が完了するまで待機
        await expect(page.locator('text=ウォレット接続')).not.toBeVisible();

        // Poll 一覧の見出しが表示されるまで待機（データ読み込み完了の指標）
        await expect(page.locator('h2').filter({ hasText: 'Poll 一覧' })).toBeVisible();

        // 新規作成ボタンにフォーカスを移動
        await page.locator('text=新規作成').focus();

        // 次の要素（最初の投票）にフォーカスを移動
        await page.keyboard.press('Tab');
        await expect(page.locator('ul li button').first()).toBeFocused();

        // Enterキーで投票を選択
        await page.keyboard.press('Enter');

        // 適切なページに遷移することを確認
        await expect(page).toHaveURL(
            new RegExp(`/${unifiedDefaultPolls[0].type}/${unifiedDefaultPolls[0].id}`)
        );
    });

    test('ウォレット接続ボタンのキーボードナビゲーション（未接続時）', async ({ page }) => {
        // ホームページに移動
        await page.goto('/');

        // ウォレット接続ボタンが表示されるまで待機
        await expect(page.locator('text=ウォレット接続')).toBeVisible();

        // Tabキーでフォーカス移動
        await page.keyboard.press('Tab');

        // ウォレット接続ボタンにフォーカスが移動することを確認
        await expect(page.locator('text=ウォレット接続')).toBeFocused();

        // Enterキーでボタンアクティベート（モック環境では実際の接続は行われない）
        await page.keyboard.press('Enter');
    });

    test('ページの基本構造が正しい（ウォレット接続後）', async ({ page }) => {
        // 統合モックの設定（投票データは空）
        await setupUnifiedEthersMock(page, {
            polls: [],
            walletAddress: '0x1234567890123456789012345678901234567890',
        });

        // ホームページに移動
        await page.goto('/');

        // ウォレット接続ボタンをクリック
        const connectButton = page.locator('text=ウォレット接続');
        await expect(connectButton).toBeVisible();
        await connectButton.click();

        // ウォレット接続が完了するまで待機
        await expect(page.locator('text=ウォレット接続')).not.toBeVisible();

        // ページの基本構造を確認
        await expect(page.locator('h1').first()).toContainText('SimpleVote');
        await expect(page.locator('h1').nth(1)).toContainText('投票一覧');

        // ウォレット情報が表示されることを確認
        await expect(page.locator('.font-mono')).toBeVisible();
        await expect(page.locator('text=切断')).toBeVisible();

        // 新規作成ボタンが存在することを確認
        await expect(page.locator('text=新規作成')).toBeVisible();

        // メインコンテンツエリアが存在することを確認
        await expect(page.locator('main')).toBeVisible();
    });

    test('投票データの表示が正確', async ({ page }) => {
        // 統合モックの設定
        await setupUnifiedEthersMock(page, {
            polls: unifiedDefaultPolls,
            walletAddress: '0x1234567890123456789012345678901234567890',
        });

        // ホームページに移動
        await page.goto('/');

        // ウォレット接続ボタンをクリック
        const connectButton = page.locator('text=ウォレット接続');
        await expect(connectButton).toBeVisible();
        await connectButton.click();

        // ウォレット接続が完了するまで待機
        await expect(page.locator('text=ウォレット接続')).not.toBeVisible();

        // Poll 一覧の見出しが表示されるまで待機（データ読み込み完了の指標）
        await expect(page.locator('h2').filter({ hasText: 'Poll 一覧' })).toBeVisible();

        // 各投票データが正確に表示されることを確認
        for (let i = 0; i < unifiedDefaultPolls.length; i++) {
            const poll = unifiedDefaultPolls[i];
            const button = page.locator('ul li button').nth(i);

            // 投票タイプが正しく表示されることを確認
            await expect(button).toContainText(poll.type);

            // 投票タイトルが正しく表示されることを確認
            await expect(button).toContainText(poll.topic);

            // 投票IDが正しく表示されることを確認
            await expect(button).toContainText(poll.id.toString());
        }
    });

    test('ウォレット切断ボタンが機能する（コンソールログ保存デモ）', async ({ page }) => {
        // コンソールログ保存機能のセットアップ
        const logger = setupConsoleLogging(page, 'ウォレット切断ボタンテスト', {
            autoSave: false, // 手動で保存を制御
            saveFormat: 'both', // JSONとテキスト形式の両方で保存
        });

        try {
            // 統合モックの設定
            await setupUnifiedEthersMock(page, {
                polls: [],
                walletAddress: '0x1234567890123456789012345678901234567890',
            });

            // ホームページに移動
            await page.goto('/');

            // ウォレット接続ボタンをクリック
            const connectButton = page.locator('text=ウォレット接続');
            await expect(connectButton).toBeVisible();
            await connectButton.click();

            // ウォレット接続が完了するまで待機
            await expect(page.locator('text=ウォレット接続')).not.toBeVisible();

            // 切断ボタンが表示されることを確認
            const disconnectButton = page.locator('text=切断');
            await expect(disconnectButton).toBeVisible();

            // ボタンをクリック
            await disconnectButton.click();

            // ウォレット接続ボタンが再表示されることを確認
            await expect(page.locator('text=ウォレット接続')).toBeVisible();

            // ウォレット情報が非表示になることを確認
            await expect(page.locator('.font-mono')).not.toBeVisible();
            await expect(page.locator('text=切断')).not.toBeVisible();

            // 投票一覧が非表示になることを確認
            await expect(page.locator('text=新規作成')).not.toBeVisible();
        } finally {
            // テスト成功/失敗に関わらず、コンソールログを保存
            try {
                const jsonLogPath = await logger.saveLogsToFile();
                const textLogPath = await logger.saveLogsAsText();

                // コンソールに保存パスを出力（実際のテストログで確認可能）
                console.log(`Console logs saved to: ${jsonLogPath}`);
                console.log(`Console logs saved to: ${textLogPath}`);

                // エラーログのみをチェック（デバッグ用）
                const errorLogs = logger.getErrorLogs();
                if (errorLogs.length > 0) {
                    console.log('Error logs found:', errorLogs);
                    console.log(
                        'Error details:',
                        errorLogs.map((log) => ({
                            type: log.type,
                            message: log.message.substring(0, 100) + '...',
                            timestamp: log.timestamp,
                        }))
                    );
                }

                // ログの統計情報を確認
                const allLogs = logger.getLogs();
                console.log(`Total logs captured: ${allLogs.length}`);

                // テスト失敗時の詳細な情報
                const logSummary = allLogs.reduce((acc, log) => {
                    acc[log.type] = (acc[log.type] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                console.log('Log summary by type:', logSummary);
            } catch (saveError) {
                console.error('Failed to save console logs:', saveError);
            }
        }
    });
});
