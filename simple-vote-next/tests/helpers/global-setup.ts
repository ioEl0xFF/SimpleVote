import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
    console.log('Starting global setup...');

    // ブラウザを起動してキャッシュをクリア
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // アプリケーションにアクセスしてキャッシュをウォームアップ
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // グローバルエラーハンドラーの追加
    await page.addInitScript(() => {
        // 未処理のPromise拒否のキャッチ
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            console.error('Promise rejection stack:', event.reason?.stack);
        });

        // グローバルエラーハンドラー
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            console.error('Error stack:', event.error?.stack);
        });
    });

    // ブラウザを閉じる
    await browser.close();

    console.log('Global setup completed');
}

export default globalSetup;
