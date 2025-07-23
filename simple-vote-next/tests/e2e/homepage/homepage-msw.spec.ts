/**
 * ホームページ MSW 統合テスト
 * MSW (Mock Service Worker) を使用したネットワークレベルモック
 * 段階的な統合のための実験的テストファイル
 */

import { test, expect } from '@playwright/test';
import { server } from '../../mocks/server';

test.describe('ホームページ MSW 統合テスト', () => {
    // MSW サーバーのセットアップ
    test.beforeAll(() => {
        server.listen({ onUnhandledRequest: 'bypass' });
        console.log('[Test] MSW server started');
    });

    test.afterEach(() => {
        server.resetHandlers();
        console.log('[Test] MSW handlers reset');
    });

    test.afterAll(() => {
        server.close();
        console.log('[Test] MSW server closed');
    });

    test('MSW 動作確認 - 基本表示', async ({ page }) => {
        console.log('[Test] Starting MSW integration test');
        
        // ページに移動
        await page.goto('/');
        console.log('[Test] Navigated to homepage');

        // 基本的な要素が表示されることを確認
        await expect(page.locator('h1')).toBeVisible();
        console.log('[Test] Main title is visible');

        // SimpleVoteテキストが含まれることを確認
        const title = await page.locator('h1').first().textContent();
        console.log('[Test] Title content:', title);
        
        expect(title).toContain('SimpleVote');
        console.log('[Test] Title verification passed');
    });
});