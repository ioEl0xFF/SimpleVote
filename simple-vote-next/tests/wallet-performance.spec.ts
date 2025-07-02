import { test, expect } from '@playwright/test';
import { WalletHelper } from './helpers/wallet-helper';
import {
    setupEthersMock,
    simulateCompleteWalletConnection,
    simulateQuickWalletConnection,
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

test.describe('2.5 パフォーマンステスト', () => {
    let walletHelper: WalletHelper;

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        walletHelper = new WalletHelper(page);
    });

    test.describe('2.5.1 ウォレット接続の応答時間', () => {
        test('単発接続の応答時間測定', async ({ page }) => {
            const startTime = Date.now();

            // ウォレット接続を実行
            await simulateQuickWalletConnection(page);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // 応答時間が3秒以内であることを確認
            expect(responseTime).toBeLessThan(3000);

            console.log('Single connection response time:', responseTime, 'ms');

            // 接続が成功していることを確認
            await expect(page.locator('.font-mono')).toBeVisible();
        });

        test('複数回接続時の平均応答時間', async ({ page }) => {
            const connectionTimes: number[] = [];
            const testCount = 5;

            for (let i = 0; i < testCount; i++) {
                const startTime = Date.now();

                // ウォレット接続を実行
                await simulateQuickWalletConnection(page);

                const endTime = Date.now();
                connectionTimes.push(endTime - startTime);

                // 切断して次の接続の準備
                if (i < testCount - 1) {
                    await walletHelper.simulateWalletDisconnection();
                }
            }

            // 平均応答時間を計算
            const averageTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;

            // 平均応答時間が2秒以内であることを確認
            expect(averageTime).toBeLessThan(2000);

            console.log('Connection times:', connectionTimes);
            console.log(`Average connection time: ${averageTime}ms`);
        });

        test('連続接続時の応答時間安定性', async ({ page }) => {
            const connectionTimes: number[] = [];
            const testCount = 10;

            for (let i = 0; i < testCount; i++) {
                const startTime = Date.now();

                await simulateQuickWalletConnection(page);

                const endTime = Date.now();
                connectionTimes.push(endTime - startTime);

                // 切断して次の接続の準備
                if (i < testCount - 1) {
                    await walletHelper.simulateWalletDisconnection();
                }
            }

            // 最大と最小の差が1秒以内であることを確認（安定性）
            const maxTime = Math.max(...connectionTimes);
            const minTime = Math.min(...connectionTimes);
            const timeVariation = maxTime - minTime;

            expect(timeVariation).toBeLessThan(1000);

            console.log('Connection time variation:', timeVariation, 'ms');
            console.log('Connection times:', connectionTimes);
        });
    });

    test.describe('2.5.2 メモリ使用量の監視', () => {
        test('長時間使用時のメモリリーク確認', async ({ page }) => {
            const initialMemory = await page.evaluate(() => {
                return (performance as any).memory?.usedJSHeapSize || 0;
            });

            // 複数回の接続・切断を繰り返す
            for (let i = 0; i < 20; i++) {
                await simulateQuickWalletConnection(page);
                await walletHelper.simulateWalletDisconnection();
            }

            const finalMemory = await page.evaluate(() => {
                return (performance as any).memory?.usedJSHeapSize || 0;
            });

            // メモリ使用量の増加が50%以内であることを確認
            const memoryIncrease = finalMemory - initialMemory;
            const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

            expect(memoryIncreasePercent).toBeLessThan(50);

            console.log('Initial memory:', initialMemory, 'bytes');
            console.log('Final memory:', finalMemory, 'bytes');
            console.log('Memory increase:', memoryIncreasePercent, '%');
        });

        test('イベントリスナーの適切なクリーンアップ', async ({ page }) => {
            // 初期状態のイベントリスナー数を取得
            const initialListenerCount = await page.evaluate(() => {
                return (window as any).ethereum?._events?.length || 0;
            });

            // 複数回の接続・切断を実行
            for (let i = 0; i < 10; i++) {
                await simulateQuickWalletConnection(page);
                await walletHelper.simulateWalletDisconnection();
            }

            // 最終状態のイベントリスナー数を取得
            const finalListenerCount = await page.evaluate(() => {
                return (window as any).ethereum?._events?.length || 0;
            });

            // イベントリスナーが適切にクリーンアップされていることを確認
            expect(finalListenerCount).toBeLessThanOrEqual(initialListenerCount + 5);

            console.log('Initial listener count:', initialListenerCount);
            console.log('Final listener count:', finalListenerCount);
        });
    });

    test.describe('2.5.3 ページ読み込みパフォーマンス', () => {
        test('初期ページ読み込み時間', async ({ page }) => {
            const startTime = Date.now();

            // ページを読み込み
            await page.goto('/');

            const endTime = Date.now();
            const loadTime = endTime - startTime;

            // ページ読み込み時間が2秒以内であることを確認
            expect(loadTime).toBeLessThan(2000);

            console.log('Initial page load time:', loadTime, 'ms');
        });

        test('ウォレット接続後のページ読み込み時間', async ({ page }) => {
            // まずウォレット接続
            await simulateQuickWalletConnection(page);

            const startTime = Date.now();

            // ページをリロード
            await page.reload();

            const endTime = Date.now();
            const loadTime = endTime - startTime;

            // 接続後のページ読み込み時間が3秒以内であることを確認
            expect(loadTime).toBeLessThan(3000);

            console.log('Connected page load time:', loadTime, 'ms');
        });

        test('投票一覧取得時間', async ({ page }) => {
            // ウォレット接続
            await simulateQuickWalletConnection(page);

            const startTime = Date.now();

            // 投票一覧が表示されるまで待機
            await page.waitForSelector('text=投票一覧', { timeout: 5000 });

            const endTime = Date.now();
            const loadTime = endTime - startTime;

            // 投票一覧取得時間が2秒以内であることを確認
            expect(loadTime).toBeLessThan(2000);

            console.log('Poll list load time:', loadTime, 'ms');
        });
    });

    test.describe('2.5.4 UI操作の応答時間', () => {
        test('ウォレット接続ボタンのクリック応答時間', async ({ page }) => {
            const startTime = Date.now();

            // ウォレット接続ボタンをクリック
            await page.getByRole('button', { name: 'ウォレット接続' }).click();

            // 接続プロセスが開始されるまで待機
            await page.waitForTimeout(100);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // クリック応答時間が500ms以内であることを確認
            expect(responseTime).toBeLessThan(500);

            console.log('Connect button click response time:', responseTime, 'ms');
        });

        test('切断ボタンのクリック応答時間', async ({ page }) => {
            // まずウォレット接続
            await simulateQuickWalletConnection(page);

            const startTime = Date.now();

            // 切断ボタンをクリック
            await page.getByRole('button', { name: '切断' }).click();

            // 切断プロセスが開始されるまで待機
            await page.waitForTimeout(100);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // クリック応答時間が500ms以内であることを確認
            expect(responseTime).toBeLessThan(500);

            console.log('Disconnect button click response time:', responseTime, 'ms');
        });

        test('新規作成ボタンのクリック応答時間', async ({ page }) => {
            // まずウォレット接続
            await simulateQuickWalletConnection(page);

            const startTime = Date.now();

            // 新規作成ボタンをクリック
            await page.getByRole('button', { name: '新規作成' }).click();

            // ページ遷移が開始されるまで待機
            await page.waitForTimeout(100);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // クリック応答時間が500ms以内であることを確認
            expect(responseTime).toBeLessThan(500);

            console.log('Create button click response time:', responseTime, 'ms');
        });
    });

    test.describe('2.5.5 ネットワーク負荷テスト', () => {
        test('高頻度接続・切断の負荷テスト', async ({ page }) => {
            const startTime = Date.now();
            const testCount = 50;

            for (let i = 0; i < testCount; i++) {
                await simulateQuickWalletConnection(page);
                await walletHelper.simulateWalletDisconnection();
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const averageTime = totalTime / testCount;

            // 1回あたりの平均時間が200ms以内であることを確認
            expect(averageTime).toBeLessThan(200);

            console.log(`High frequency test: ${testCount} cycles in ${totalTime}ms`);
            console.log(`Average time per cycle: ${averageTime}ms`);
        });

        test('同時接続試行の負荷テスト', async ({ page, context }) => {
            const startTime = Date.now();
            const concurrentCount = 5;

            // 複数のタブで同時に接続を試行
            const promises = [];
            for (let i = 0; i < concurrentCount; i++) {
                const newPage = await context.newPage();
                await newPage.goto('/');
                await setupEthersMock(newPage);

                promises.push(simulateQuickWalletConnection(newPage).then(() => newPage.close()));
            }

            await Promise.all(promises);

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // 同時接続が5秒以内に完了することを確認
            expect(totalTime).toBeLessThan(5000);

            console.log(
                `Concurrent connection test: ${concurrentCount} connections in ${totalTime}ms`
            );
        });
    });

    test.describe('2.5.6 ブラウザリソース使用量', () => {
        test('CPU使用量の監視', async ({ page }) => {
            // 初期状態のCPU使用量を取得（概算）
            const initialCPU = await page.evaluate(() => {
                return performance.now();
            });

            // 負荷をかける操作を実行
            for (let i = 0; i < 10; i++) {
                await simulateQuickWalletConnection(page);
                await walletHelper.simulateWalletDisconnection();
            }

            const finalCPU = await page.evaluate(() => {
                return performance.now();
            });

            const cpuTime = finalCPU - initialCPU;

            // CPU使用時間が妥当な範囲内であることを確認
            expect(cpuTime).toBeLessThan(10000); // 10秒以内

            console.log('CPU usage time:', cpuTime, 'ms');
        });

        test('DOM操作の効率性', async ({ page }) => {
            // DOM操作の時間を測定
            const startTime = Date.now();

            // ウォレット接続（DOM更新が発生）
            await simulateQuickWalletConnection(page);

            const endTime = Date.now();
            const domUpdateTime = endTime - startTime;

            // DOM更新時間が1秒以内であることを確認
            expect(domUpdateTime).toBeLessThan(1000);

            console.log('DOM update time:', domUpdateTime, 'ms');
        });
    });

    test.describe('2.5.7 パフォーマンス基準の検証', () => {
        test('Core Web Vitals基準の確認', async ({ page }) => {
            // ページ読み込み時間を測定
            const navigationStart = await page.evaluate(() => {
                return performance.timing.navigationStart;
            });

            await page.goto('/');

            const domContentLoaded = await page.evaluate(() => {
                return performance.timing.domContentLoadedEventEnd;
            });

            const loadComplete = await page.evaluate(() => {
                return performance.timing.loadEventEnd;
            });

            const domContentLoadedTime = domContentLoaded - navigationStart;
            const loadCompleteTime = loadComplete - navigationStart;

            // Core Web Vitals基準を確認
            expect(domContentLoadedTime).toBeLessThan(2000); // 2秒以内
            expect(loadCompleteTime).toBeLessThan(3000); // 3秒以内

            console.log('DOM Content Loaded:', domContentLoadedTime, 'ms');
            console.log('Load Complete:', loadCompleteTime, 'ms');
        });

        test('アクセシビリティパフォーマンス', async ({ page }) => {
            // キーボードナビゲーションの応答時間を測定
            const startTime = Date.now();

            // Tabキーでフォーカス移動
            await page.keyboard.press('Tab');

            const endTime = Date.now();
            const focusTime = endTime - startTime;

            // フォーカス移動時間が100ms以内であることを確認
            expect(focusTime).toBeLessThan(100);

            console.log('Focus navigation time:', focusTime, 'ms');
        });
    });
});
