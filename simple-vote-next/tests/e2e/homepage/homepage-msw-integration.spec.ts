/**
 * ホームページ MSW 段階的統合テスト
 * 既存のテストと並行してMSWの動作を確認
 */

import { test, expect } from '@playwright/test';
import { server } from '../../mocks/server';
import { setupMSWForTest, cleanupMSWForTest, MSWTestConfig } from '../../helpers/msw-integration-helper';

test.describe('ホームページ MSW 段階的統合', () => {
    // MSW サーバーの基本セットアップ
    test.beforeAll(() => {
        server.listen({ onUnhandledRequest: 'bypass' });
        console.log('[Integration Test] MSW server started');
    });

    test.afterEach(() => {
        cleanupMSWForTest();
        console.log('[Integration Test] Test cleanup completed');
    });

    test.afterAll(() => {
        server.close();
        console.log('[Integration Test] MSW server closed');
    });

    test('MSW統合 - 基本動作確認', async ({ page }) => {
        console.log('[Integration Test] Starting MSW integration test');
        
        // MSW を有効にしてテストセットアップ
        await setupMSWForTest(page, {
            useMSW: true,
            polls: [{
                id: 1,
                pollType: 0, // DYNAMIC_VOTE
                topic: 'MSWテスト投票',
                owner: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
            }]
        });

        // ページに移動
        await page.goto('/');
        console.log('[Integration Test] Navigated to homepage');

        // 基本的な要素の確認
        await expect(page.locator('h1')).toBeVisible();
        const title = await page.locator('h1').first().textContent();
        expect(title).toContain('SimpleVote');
        console.log('[Integration Test] Basic page verification passed');

        // MSW フラグがページに設定されているか確認
        const mswEnabled = await page.evaluate(() => (window as any).__MSW_ENABLED__);
        expect(mswEnabled).toBe(true);
        console.log('[Integration Test] MSW flag verification passed');
    });

    test('MSW統合 - ネットワークリクエスト確認', async ({ page }) => {
        console.log('[Integration Test] Starting network request test');
        
        // リクエストのキャプチャ
        const capturedRequests: string[] = [];
        page.on('request', request => {
            const url = request.url();
            if (url.includes('localhost:8545') || url.includes('127.0.0.1')) {
                capturedRequests.push(`${request.method()} ${url}`);
                console.log('[Integration Test] Captured RPC request:', request.method(), url);
            }
        });

        // MSW セットアップ
        await setupMSWForTest(page, {
            useMSW: true,
            polls: []
        });

        // ページアクセス
        await page.goto('/');
        
        // 基本動作確認
        await expect(page.locator('h1')).toBeVisible();
        console.log('[Integration Test] Page loaded successfully');
        
        // キャプチャされたリクエストの確認
        console.log('[Integration Test] Total captured requests:', capturedRequests.length);
        capturedRequests.forEach(req => console.log('[Integration Test] -', req));
    });

    test('MSW統合 - 無効化テスト', async ({ page }) => {
        console.log('[Integration Test] Starting MSW disabled test');
        
        // MSW を無効にしてテスト
        await setupMSWForTest(page, {
            useMSW: false
        });

        await page.goto('/');
        
        // 基本動作は維持されることを確認
        await expect(page.locator('h1')).toBeVisible();
        const title = await page.locator('h1').first().textContent();
        expect(title).toContain('SimpleVote');
        
        // MSW フラグが設定されていないことを確認
        const mswEnabled = await page.evaluate(() => (window as any).__MSW_ENABLED__);
        expect(mswEnabled).toBeUndefined();
        console.log('[Integration Test] MSW disabled test passed');
    });
});