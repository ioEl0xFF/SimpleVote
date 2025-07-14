/**
 * ホームページ基本機能テスト
 * ホームページの主要機能をテストする
 * ウォレット接続前後の表示の違いを正確にテスト
 */

import { test, expect } from '@playwright/test';
import { setupContractMock, mockDefaultPolls, mockEmptyPolls } from '../../helpers/contract-mock';
import { setupEthereumMock, setupEthersMock } from '../../helpers/wallet-mock';
import { defaultPolls, emptyPolls } from '../fixtures/homepage-fixtures';
import {
    setupHomePageTest,
    verifyPollList,
    clickPollAndVerifyNavigation,
    testCreateButton,
    testAccessibility,
    testResponsiveDesign,
} from '../../helpers/homepage-helpers';

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
        // ウォレット接続のモックを設定（ページ読み込み前）
        await setupEthersMock(page, {
            address: '0x1234567890123456789012345678901234567890',
        });
        await setupEthereumMock(page, {
            accounts: ['0x1234567890123456789012345678901234567890'],
            chainId: '0x1',
            networkVersion: '1',
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
        // ウォレット接続のモックを設定（ページ読み込み前）
        await setupEthersMock(page, {
            address: '0x1234567890123456789012345678901234567890',
        });
        await setupEthereumMock(page, {
            accounts: ['0x1234567890123456789012345678901234567890'],
            chainId: '0x1',
            networkVersion: '1',
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

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
        for (let i = 0; i < defaultPolls.length; i++) {
            const poll = defaultPolls[i];
            const button = page.locator('ul li button').nth(i);

            // 投票タイプが正しく表示されることを確認
            await expect(button).toContainText(poll.type);

            // 投票タイトルが正しく表示されることを確認
            await expect(button).toContainText(poll.topic);

            // 投票IDが正しく表示されることを確認
            await expect(button).toContainText(poll.id.toString());
        }
    });

    test('投票一覧が空の場合のメッセージが表示される', async ({ page }) => {
        // ウォレット接続のモックを設定（ページ読み込み前）
        await setupEthersMock(page, {
            address: '0x1234567890123456789012345678901234567890',
        });
        await setupEthereumMock(page, {
            accounts: ['0x1234567890123456789012345678901234567890'],
            chainId: '0x1',
            networkVersion: '1',
        });

        // 空の投票データをモック
        await setupContractMock(page, { polls: emptyPolls });

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
        // ウォレット接続のモックを設定（ページ読み込み前）
        await setupEthersMock(page, {
            address: '0x1234567890123456789012345678901234567890',
        });
        await setupEthereumMock(page, {
            accounts: ['0x1234567890123456789012345678901234567890'],
            chainId: '0x1',
            networkVersion: '1',
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
        // ウォレット接続のモックを設定（ページ読み込み前）
        await setupEthersMock(page, {
            address: '0x1234567890123456789012345678901234567890',
        });
        await setupEthereumMock(page, {
            accounts: ['0x1234567890123456789012345678901234567890'],
            chainId: '0x1',
            networkVersion: '1',
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

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
        await expect(page).toHaveURL(new RegExp(`/${defaultPolls[0].type}/${defaultPolls[0].id}`));
    });

    test('投票項目の表示形式が正しい', async ({ page }) => {
        // ウォレット接続のモックを設定（ページ読み込み前）
        await setupEthersMock(page, {
            address: '0x1234567890123456789012345678901234567890',
        });
        await setupEthereumMock(page, {
            accounts: ['0x1234567890123456789012345678901234567890'],
            chainId: '0x1',
            networkVersion: '1',
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

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
        for (let i = 0; i < defaultPolls.length; i++) {
            const poll = defaultPolls[i];
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
        // ウォレット接続のモックを設定（ページ読み込み前）
        await setupEthersMock(page, {
            address: '0x1234567890123456789012345678901234567890',
        });
        await setupEthereumMock(page, {
            accounts: ['0x1234567890123456789012345678901234567890'],
            chainId: '0x1',
            networkVersion: '1',
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

        // 次の要素（最初の投票）にフォーカスを移動
        await page.keyboard.press('Tab');
        await expect(page.locator('ul li button').first()).toBeFocused();

        // Enterキーでボタンアクティベート
        await page.keyboard.press('Enter');

        // 作成ページに遷移することを確認
        await expect(page).toHaveURL(/\/create/);
    });

    test('投票項目のキーボードナビゲーション', async ({ page }) => {
        // ウォレット接続のモックを設定（ページ読み込み前）
        await setupEthersMock(page, {
            address: '0x1234567890123456789012345678901234567890',
        });
        await setupEthereumMock(page, {
            accounts: ['0x1234567890123456789012345678901234567890'],
            chainId: '0x1',
            networkVersion: '1',
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

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
        await expect(page).toHaveURL(new RegExp(`/${defaultPolls[0].type}/${defaultPolls[0].id}`));
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
        // ウォレット接続のモックを設定（ページ読み込み前）
        await setupEthersMock(page, {
            address: '0x1234567890123456789012345678901234567890',
        });
        await setupEthereumMock(page, {
            accounts: ['0x1234567890123456789012345678901234567890'],
            chainId: '0x1',
            networkVersion: '1',
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
        // ウォレット接続のモックを設定（ページ読み込み前）
        await setupEthersMock(page, {
            address: '0x1234567890123456789012345678901234567890',
        });
        await setupEthereumMock(page, {
            accounts: ['0x1234567890123456789012345678901234567890'],
            chainId: '0x1',
            networkVersion: '1',
        });

        // 投票データをモック
        await setupContractMock(page, { polls: defaultPolls });

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
        for (let i = 0; i < defaultPolls.length; i++) {
            const poll = defaultPolls[i];
            const button = page.locator('ul li button').nth(i);

            // 投票タイプが正しく表示されることを確認
            await expect(button).toContainText(poll.type);

            // 投票タイトルが正しく表示されることを確認
            await expect(button).toContainText(poll.topic);

            // 投票IDが正しく表示されることを確認
            await expect(button).toContainText(poll.id.toString());
        }
    });

    test('ウォレット切断ボタンが機能する', async ({ page }) => {
        // ウォレット接続のモックを設定（ページ読み込み前）
        await setupEthersMock(page, {
            address: '0x1234567890123456789012345678901234567890',
        });
        await setupEthereumMock(page, {
            accounts: ['0x1234567890123456789012345678901234567890'],
            chainId: '0x1',
            networkVersion: '1',
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
    });
});

// MSWベースのテスト（実験的）
test.describe('ホームページ基本機能 - MSWバージョン', () => {

    test('投票一覧が表示される（MSW版）', async ({ page }) => {
        console.log('[Test] MSWを使用したテストを開始');

        // 包括的なethereumプロバイダーをモック
        await page.addInitScript(() => {
            // Mock poll data to return
            const mockPollData = '0x' +
                '0000000000000000000000000000000000000000000000000000000000000080' +
                '00000000000000000000000000000000000000000000000000000000000000c0' +
                '0000000000000000000000000000000000000000000000000000000000000100' +
                '0000000000000000000000000000000000000000000000000000000000000140' +
                '0000000000000000000000000000000000000000000000000000000000000003' + // pollIds.length = 3
                '0000000000000000000000000000000000000000000000000000000000000001' + // pollId: 1
                '0000000000000000000000000000000000000000000000000000000000000002' + // pollId: 2
                '0000000000000000000000000000000000000000000000000000000000000003' + // pollId: 3
                '0000000000000000000000000000000000000000000000000000000000000003' + // pollTypes.length = 3
                '0000000000000000000000000000000000000000000000000000000000000000' + // type: 0
                '0000000000000000000000000000000000000000000000000000000000000001' + // type: 1
                '0000000000000000000000000000000000000000000000000000000000000002' + // type: 2
                '0000000000000000000000000000000000000000000000000000000000000003' + // owners.length = 3
                '000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266' + // owner
                '000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266' + // owner
                '000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266' + // owner
                '0000000000000000000000000000000000000000000000000000000000000003' + // topics.length = 3
                '0000000000000000000000000000000000000000000000000000000000000060' + // topic 1 offset
                '00000000000000000000000000000000000000000000000000000000000000a0' + // topic 2 offset
                '00000000000000000000000000000000000000000000000000000000000000e0' + // topic 3 offset
                '000000000000000000000000000000000000000000000000000000000000001b' + // topic 1 length
                'e38397e383ade382b8e382a7e382afe38388e381aee696b9e59091e680a7e381ab000000000000' + // "プロジェクトの方向性"
                '0000000000000000000000000000000000000000000000000000000000000018' + // topic 2 length
                'e68a80e8a193e382b9e382bfe38383e382afe381aee981b8e68a9e0000000000' + // "技術スタックの選択"
                '0000000000000000000000000000000000000000000000000000000000000018' + // topic 3 length
                'e38381e383bce383a0e383aae383bce38380e383bce381aee981b8e587ba000000'; // "チームリーダーの選出"

            (window as any).ethereum = {
                request: async ({ method, params }: { method: string, params?: any[] }) => {
                    console.log(`[Mock] ethereum.request: ${method}`, params);
                    
                    switch (method) {
                        case 'eth_requestAccounts':
                            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
                        case 'eth_chainId':
                            return '0x7a69'; // Hardhat chain ID
                        case 'eth_call':
                            // getPolls() method signature detection
                            if (params && params[0] && params[0].data && params[0].data.startsWith('0x5c01f867')) {
                                console.log('[Mock] getPolls() detected, returning mock data');
                                return mockPollData;
                            }
                            return '0x';
                        case 'eth_blockNumber':
                            return '0x1';
                        case 'eth_accounts':
                            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
                        case 'eth_getBalance':
                            return '0x21e19e0c9bab2400000';
                        case 'net_version':
                            return '31337';
                        default:
                            console.log(`[Mock] Unhandled method: ${method}`);
                            return null;
                    }
                },
                on: () => {},
                removeListener: () => {},
                isMetaMask: true,
            };
        });

        // ページに移動（MSWが自動的にRPCコールをモック）
        await page.goto('/');

        // ウォレット接続ボタンをクリック
        const connectButton = page.locator('text=ウォレット接続');
        await expect(connectButton).toBeVisible();
        await connectButton.click();

        console.log('[Test] ウォレット接続ボタンをクリックしました');

        // ウォレット接続が完了するまで待機
        await expect(page.locator('text=ウォレット接続')).not.toBeVisible({
            timeout: 10000
        });

        console.log('[Test] ウォレット接続が完了しました');

        // Poll 一覧の見出しが表示されるまで待機
        await expect(page.locator('h2').filter({ hasText: 'Poll 一覧' })).toBeVisible({
            timeout: 15000
        });

        console.log('[Test] Poll一覧が表示されました');

        // 投票データが表示されることを確認（日本語文字が正しく表示されるかテスト）
        await expect(page.locator('text=プロジェクトの方向性')).toBeVisible();
        await expect(page.locator('text=技術スタック')).toBeVisible();
        await expect(page.locator('text=チームリーダー')).toBeVisible();

        console.log('[Test] 投票データの表示を確認しました');

        // 新規作成ボタンが表示されることを確認
        await expect(page.locator('text=新規作成')).toBeVisible();

        console.log('[Test] MSWテストが正常に完了しました');
    });
});
