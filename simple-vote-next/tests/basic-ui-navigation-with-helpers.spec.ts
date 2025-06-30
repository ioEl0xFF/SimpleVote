import { test, expect } from '@playwright/test';
import { WalletHelper, PollHelper, LoadingHelper } from './helpers/wallet-helper';

// ethersモジュールの直接モック
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        // ethersモジュールのモック
        const mockAccount = '0x1234567890123456789012345678901234567890';
        const mockSignature = '0x1234567890123456789012345678901234567890';

        // window.ethereumのモック
        Object.defineProperty(window, 'ethereum', {
            value: {
                request: async (args: any) => {
                    console.log('Mock ethereum.request:', args.method);
                    switch (args.method) {
                        case 'eth_requestAccounts':
                        case 'eth_accounts':
                            return [mockAccount];
                        case 'eth_chainId':
                            return '0x1';
                        case 'net_version':
                            return '1';
                        case 'personal_sign':
                            return mockSignature;
                        default:
                            return null;
                    }
                },
                isMetaMask: true,
                selectedAddress: mockAccount,
                networkVersion: '1',
                chainId: '0x1',
            },
            writable: true,
            configurable: true,
        });

        // ethersのモック
        const mockEthers = {
            BrowserProvider: class {
                constructor(ethereum: any) {
                    console.log('Mock BrowserProvider created');
                }
                async send(method: string, params: any[]) {
                    return await window.ethereum.request({ method, params });
                }
                async getSigner() {
                    return {
                        getAddress: async () => mockAccount,
                        signMessage: async (message: string) => mockSignature,
                    };
                }
            },
        };

        // グローバルにethersを設定
        (window as any).ethers = mockEthers;
    });
});

test.describe('基本UI・ナビゲーションテスト（ヘルパー関数使用）', () => {
    let walletHelper: WalletHelper;
    let pollHelper: PollHelper;
    let loadingHelper: LoadingHelper;

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        walletHelper = new WalletHelper(page);
        pollHelper = new PollHelper(page);
        loadingHelper = new LoadingHelper(page);
    });

    test.describe('1.1 ホームページ（/）', () => {
        test('ページタイトル「SimpleVote」が表示される', async ({ page }) => {
            await expect(page.locator('h1').first()).toHaveText('SimpleVote');
        });

        test('ウォレット未接続時の初期状態', async ({ page }) => {
            // ウォレット接続ボタンが表示される
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).toBeVisible();

            // アカウントアドレスが表示されない
            await expect(page.locator('.font-mono')).not.toBeVisible();

            // 切断ボタンが表示されない
            await expect(page.getByRole('button', { name: '切断' })).not.toBeVisible();

            // 新規作成ボタンが表示されない
            await expect(page.getByRole('button', { name: '新規作成' })).not.toBeVisible();

            // 投票一覧セクションが表示されない
            await expect(page.locator('text=Poll 一覧')).not.toBeVisible();
        });

        test('ウォレット接続後の状態変化', async ({ page }) => {
            // コンソールログを監視
            page.on('console', (msg) => {
                console.log('Browser console:', msg.text());
            });

            // エラーを監視
            page.on('pageerror', (error) => {
                console.log('Page error:', error.message);
            });

            // ウォレット接続をシミュレート
            await walletHelper.simulateWalletConnection();

            // ページの状態をデバッグ
            console.log('Checking page state after connection...');
            const pageContent = await page.content();
            console.log('Page content length:', pageContent.length);

            // 各要素の存在を確認
            const connectButton = await page.getByRole('button', { name: 'ウォレット接続' }).count();
            const accountElement = await page.locator('.font-mono').count();
            const disconnectButton = await page.getByRole('button', { name: '切断' }).count();
            const createButton = await page.getByRole('button', { name: '新規作成' }).count();
            const pollList = await page.locator('text=投票一覧').count();

            console.log('Element counts:', {
                connectButton,
                accountElement,
                disconnectButton,
                createButton,
                pollList
            });

            // 接続ボタンが非表示になる
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).not.toBeVisible();

            // アカウントアドレスが表示される
            await expect(page.locator('.font-mono')).toBeVisible();

            // 切断ボタンが表示される
            await expect(page.getByRole('button', { name: '切断' })).toBeVisible();

            // 新規作成ボタンが表示される
            await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();

            // 投票一覧セクションが表示される
            await expect(page.locator('text=投票一覧')).toBeVisible();
        });

        test('ウォレット切断後の状態変化', async ({ page }) => {
            // まずウォレット接続
            await walletHelper.simulateWalletConnection();

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
            await expect(page.locator('text=Poll 一覧')).not.toBeVisible();
        });

        test('投票が存在しない場合の表示', async ({ page }) => {
            // ウォレット接続
            await walletHelper.simulateWalletConnection();

            // 「議題が存在しません」が表示される
            await expect(page.locator('text=議題が存在しません')).toBeVisible();
        });

        test('投票データがある場合の表示', async ({ page }) => {
            // ウォレット接続
            await walletHelper.simulateWalletConnection();

            // テスト用の投票データをシミュレート
            const testPolls = [
                {
                    id: 1,
                    type: 'dynamic',
                    topic: 'テスト投票1',
                    choices: [
                        { name: '選択肢1', votes: 5 },
                        { name: '選択肢2', votes: 3 },
                    ],
                },
                {
                    id: 2,
                    type: 'weighted',
                    topic: 'テスト投票2',
                    choices: [
                        { name: '賛成', votes: 10 },
                        { name: '反対', votes: 2 },
                    ],
                },
            ];

            await pollHelper.simulatePollData(testPolls);

            // 投票一覧が表示される
            await expect(page.locator('text=Poll 一覧')).toBeVisible();

            // 投票項目が正しく表示される
            await expect(
                page.locator('button:has-text("dynamic : テスト投票1 (ID: 1)")')
            ).toBeVisible();
            await expect(
                page.locator('button:has-text("weighted : テスト投票2 (ID: 2)")')
            ).toBeVisible();
        });

        test('投票項目クリック時の遷移', async ({ page }) => {
            // ウォレット接続
            await walletHelper.simulateWalletConnection();

            // テスト用の投票データをシミュレート
            const testPolls = [
                {
                    id: 1,
                    type: 'dynamic',
                    topic: 'テスト投票1',
                    choices: [
                        { name: '選択肢1', votes: 5 },
                        { name: '選択肢2', votes: 3 },
                    ],
                },
            ];

            await pollHelper.simulatePollData(testPolls);

            // 投票項目をクリック
            await pollHelper.clickPollItem(1);

            // 対応する投票ページに遷移することを確認
            await expect(page).toHaveURL(/\/dynamic\/1/);
        });
    });

    test.describe('1.2 ページヘッダー・ナビゲーション', () => {
        test('ホームページでのページタイトル表示', async ({ page }) => {
            await expect(page.locator('h1').first()).toHaveText('SimpleVote');
            await expect(page.locator('text=投票一覧')).toBeVisible();
        });

        test('新規作成ページへの遷移', async ({ page }) => {
            // ウォレット接続
            await walletHelper.simulateWalletConnection();

            // 新規作成ボタンをクリック
            await page.getByRole('button', { name: '新規作成' }).click();

            // 新規作成ページに遷移することを確認
            await expect(page).toHaveURL('/create');
        });

        test('ホームボタンの機能', async ({ page }) => {
            // 新規作成ページに移動
            await page.goto('/create');

            // ホームボタンが表示されることを確認
            await expect(page.locator('[data-testid="home-button"]')).toBeVisible();

            // ホームボタンをクリック
            await page.locator('[data-testid="home-button"]').click();

            // ホームページに戻ることを確認
            await expect(page).toHaveURL('/');
        });
    });

    test.describe('1.3 ローディング状態', () => {
        test('データ読み込み中の表示', async ({ page }) => {
            // ウォレット接続
            await walletHelper.simulateWalletConnection();

            // ローディング状態をシミュレート
            await loadingHelper.simulateLoading();

            // ローディングスピナーが表示される
            await expect(page.locator('.animate-spin')).toBeVisible();

            // ローディングメッセージが表示される
            await expect(page.locator('text=投票一覧を読み込み中...')).toBeVisible();
        });

        test('読み込み完了後の表示', async ({ page }) => {
            // ウォレット接続
            await walletHelper.simulateWalletConnection();

            // ローディング完了をシミュレート
            await loadingHelper.simulateLoadingComplete();

            // ローディングスピナーが非表示になる
            await expect(page.locator('.animate-spin')).not.toBeVisible();

            // ローディングメッセージが非表示になる
            await expect(page.locator('text=投票一覧を読み込み中...')).not.toBeVisible();
        });
    });

    test.describe('1.4 エラーハンドリング', () => {
        test('無効なPoll IDでのアクセス', async ({ page }) => {
            // 存在しない投票IDにアクセス
            await page.goto('/dynamic/999999');

            // 404エラーページが表示される
            await expect(page.locator('text=404')).toBeVisible();
        });

        test('無効なURLでのアクセス', async ({ page }) => {
            // 存在しないページにアクセス
            await page.goto('/invalid-page');

            // 404エラーページが表示される
            await expect(page.locator('text=404')).toBeVisible();
        });
    });

    test.describe('レスポンシブデザイン', () => {
        test('デスクトップ表示（1920x1080）', async ({ page }) => {
            await page.setViewportSize({ width: 1920, height: 1080 });

            // メインタイトルが表示される
            await expect(page.locator('h1').first()).toBeVisible();

            // ウォレット接続ボタンが表示される
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).toBeVisible();

            // レイアウトが崩れていないことを確認
            await expect(page.locator('main')).toBeVisible();
        });

        test('タブレット表示（768x1024）', async ({ page }) => {
            await page.setViewportSize({ width: 768, height: 1024 });

            // メインタイトルが表示される
            await expect(page.locator('h1').first()).toBeVisible();

            // ウォレット接続ボタンが表示される
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).toBeVisible();

            // レイアウトが崩れていないことを確認
            await expect(page.locator('main')).toBeVisible();
        });

        test('モバイル表示（375x667）', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });

            // メインタイトルが表示される
            await expect(page.locator('h1').first()).toBeVisible();

            // ウォレット接続ボタンが表示される
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).toBeVisible();

            // レイアウトが崩れていないことを確認
            await expect(page.locator('main')).toBeVisible();
        });
    });

    test.describe('アクセシビリティ', () => {
        test('適切なHTMLセマンティクス', async ({ page }) => {
            // メインタイトルがh1タグで表示されている
            await expect(page.locator('h1').first()).toHaveText('SimpleVote');

            // ボタンが適切なrole属性を持っている
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).toBeVisible();

            // メインコンテンツがmainタグで囲まれている
            await expect(page.locator('main')).toBeVisible();
        });

        test('キーボードナビゲーション', async ({ page }) => {
            // Tabキーでフォーカス移動が可能
            await page.keyboard.press('Tab');
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).toBeFocused();

            // Enterキーでボタンがクリック可能
            await page.keyboard.press('Enter');

            // フォーカスが適切に管理されている
            await expect(page.getByRole('button', { name: 'ウォレット接続' })).toBeFocused();
        });

        test('スクリーンリーダー対応', async ({ page }) => {
            // ボタンに適切なaria-labelが設定されているか確認
            const connectButton = page.getByRole('button', { name: 'ウォレット接続' });
            await expect(connectButton).toBeVisible();

            // ページタイトルが適切に設定されている
            await expect(page).toHaveTitle(/SimpleVote/);
        });
    });

    test.describe('パフォーマンス', () => {
        test('ページの初期読み込み時間', async ({ page }) => {
            const startTime = Date.now();
            await page.goto('/');
            const loadTime = Date.now() - startTime;

            // 3秒以内に読み込みが完了することを確認
            expect(loadTime).toBeLessThan(3000);
        });

        test('メインコンテンツの表示時間', async ({ page }) => {
            await page.goto('/');

            // メインタイトルが1秒以内に表示されることを確認
            await expect(page.locator('h1').first()).toBeVisible({ timeout: 1000 });
        });

        test('ウォレット接続後のレスポンス時間', async ({ page }) => {
            await page.goto('/');

            // ウォレット接続をシミュレート
            const startTime = Date.now();
            await walletHelper.simulateWalletConnection();
            const responseTime = Date.now() - startTime;

            // 1秒以内にレスポンスがあることを確認
            expect(responseTime).toBeLessThan(1000);
        });
    });
});
