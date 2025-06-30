import { test, expect } from '@playwright/test';
import { setupEthersMock } from './helpers/ethers-mock';

test.describe('ウォレット接続デバッグテスト', () => {
    test('基本的なウォレット接続テスト', async ({ page }) => {
        console.log('Starting basic wallet connection test...');

        // コンソールログを監視
        page.on('console', (msg) => {
            console.log('Browser console:', msg.text());
        });

        // エラーを監視
        page.on('pageerror', (error) => {
            console.log('Page error:', error.message);
        });

        // ethers.jsのモックを設定
        await setupEthersMock(page);

        // ページに移動
        await page.goto('/');
        console.log('Page loaded');

        // 初期状態を確認
        await expect(page.locator('h1').first()).toHaveText('SimpleVote');
        await expect(page.getByRole('button', { name: 'ウォレット接続' })).toBeVisible();

        // ウォレット接続ボタンをクリック
        console.log('Clicking wallet connect button...');
        await page.getByRole('button', { name: 'ウォレット接続' }).click();

        // 少し待機
        await page.waitForTimeout(5000);

        // ページの状態を確認
        const pageContent = await page.content();
        console.log('Page content length:', pageContent.length);

        // アカウントアドレスが表示されているかチェック
        const accountElements = await page.locator('.font-mono').count();
        console.log('Account elements found:', accountElements);

        // 切断ボタンが表示されているかチェック
        const disconnectElements = await page.locator('button:has-text("切断")').count();
        console.log('Disconnect elements found:', disconnectElements);

        // 現在のページのHTMLを出力（より詳細に）
        const html = await page.content();
        const bodyContent = html.substring(html.indexOf('<body'), html.indexOf('</body>') + 7);
        console.log('Current page body content:', bodyContent);

        // テスト結果を確認
        expect(accountElements).toBeGreaterThan(0);
        expect(disconnectElements).toBeGreaterThan(0);
    });
});
