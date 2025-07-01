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

    // ブラウザを閉じる
    await browser.close();

    console.log('Global setup completed');
}

export default globalSetup;
