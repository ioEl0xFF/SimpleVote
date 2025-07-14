/**
 * 共通テストユーティリティ
 * テストで使用する共通機能を提供
 */

import { Page, expect } from '@playwright/test';

/**
 * ページの読み込み完了を待機
 * @param page Playwrightのpageオブジェクト
 * @param timeout タイムアウト時間（ミリ秒）
 */
export async function waitForPageLoad(page: Page, timeout: number = 10000) {
    await page.waitForLoadState('networkidle', { timeout });
}

/**
 * 要素が表示されるまで待機
 * @param page Playwrightのpageオブジェクト
 * @param selector セレクタ
 * @param timeout タイムアウト時間（ミリ秒）
 */
export async function waitForElement(page: Page, selector: string, timeout: number = 5000) {
    await page.waitForSelector(selector, { timeout });
}

/**
 * 要素が非表示になるまで待機
 * @param page Playwrightのpageオブジェクト
 * @param selector セレクタ
 * @param timeout タイムアウト時間（ミリ秒）
 */
export async function waitForElementHidden(page: Page, selector: string, timeout: number = 5000) {
    await page.waitForSelector(selector, { state: 'hidden', timeout });
}

/**
 * テキストが表示されるまで待機
 * @param page Playwrightのpageオブジェクト
 * @param text テキスト
 * @param timeout タイムアウト時間（ミリ秒）
 */
export async function waitForText(page: Page, text: string, timeout: number = 5000) {
    await page.waitForSelector(`text=${text}`, { timeout });
}

/**
 * URLが変更されるまで待機
 * @param page Playwrightのpageオブジェクト
 * @param expectedUrl 期待されるURL（正規表現可）
 * @param timeout タイムアウト時間（ミリ秒）
 */
export async function waitForUrlChange(
    page: Page,
    expectedUrl: string | RegExp,
    timeout: number = 5000
) {
    if (typeof expectedUrl === 'string') {
        await page.waitForURL(expectedUrl, { timeout });
    } else {
        await page.waitForURL(expectedUrl, { timeout });
    }
}

/**
 * スクリーンショットを撮影
 * @param page Playwrightのpageオブジェクト
 * @param name ファイル名
 */
export async function takeScreenshot(page: Page, name: string) {
    await page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
}

/**
 * コンソールログを取得
 * @param page Playwrightのpageオブジェクト
 */
export async function getConsoleLogs(page: Page): Promise<string[]> {
    const logs: string[] = [];

    page.on('console', (msg) => {
        logs.push(`${msg.type()}: ${msg.text()}`);
    });

    return logs;
}

/**
 * ネットワークエラーをシミュレート
 * @param page Playwrightのpageオブジェクト
 */
export async function simulateNetworkError(page: Page) {
    await page.addInitScript(() => {
        // fetchをオーバーライドしてエラーを発生させる
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            throw new Error('Network error');
        };
    });
}

/**
 * ネットワーク遅延をシミュレート
 * @param page Playwrightのpageオブジェクト
 * @param delayMs 遅延時間（ミリ秒）
 */
export async function simulateNetworkDelay(page: Page, delayMs: number) {
    await page.addInitScript((delay: number) => {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            await new Promise((resolve) => setTimeout(resolve, delay));
            return originalFetch(...args);
        };
    }, delayMs);
}

/**
 * ブラウザのリサイズをテスト
 * @param page Playwrightのpageオブジェクト
 * @param sizes テストする画面サイズの配列
 */
export async function testResponsiveSizes(
    page: Page,
    sizes: Array<{ width: number; height: number; name: string }>
) {
    for (const size of sizes) {
        await page.setViewportSize({ width: size.width, height: size.height });

        // 基本的な要素が表示されることを確認
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('h2')).toBeVisible();

        // 必要に応じてスクリーンショットを撮影
        await takeScreenshot(page, `responsive-${size.name}`);
    }
}

/**
 * アクセシビリティの基本チェック
 * @param page Playwrightのpageオブジェクト
 */
export async function checkBasicAccessibility(page: Page) {
    // ページタイトルが設定されていることを確認
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);

    // メインの見出しが存在することを確認
    await expect(page.locator('h1')).toBeVisible();

    // フォーカス可能な要素にaria-labelが設定されていることを確認
    const focusableElements = page.locator('button, a, input, select, textarea');
    const count = await focusableElements.count();

    for (let i = 0; i < count; i++) {
        const element = focusableElements.nth(i);
        const ariaLabel = await element.getAttribute('aria-label');
        const textContent = await element.textContent();

        // aria-labelまたはテキストコンテンツが存在することを確認
        expect(ariaLabel || textContent).toBeTruthy();
    }
}

/**
 * パフォーマンスメトリクスを取得
 * @param page Playwrightのpageオブジェクト
 */
export async function getPerformanceMetrics(page: Page) {
    const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType(
            'navigation'
        )[0] as PerformanceNavigationTiming;
        return {
            loadTime: navigation.loadEventEnd - navigation.loadEventStart,
            domContentLoaded:
                navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            firstContentfulPaint:
                performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        };
    });

    return metrics;
}

/**
 * エラーハンドリングをテスト
 * @param page Playwrightのpageオブジェクト
 * @param errorType エラータイプ
 */
export async function testErrorHandling(page: Page, errorType: 'network' | 'contract' | 'wallet') {
    switch (errorType) {
        case 'network':
            await simulateNetworkError(page);
            break;
        case 'contract':
            // コントラクトエラーは別途実装
            break;
        case 'wallet':
            // ウォレットエラーは別途実装
            break;
    }

    // エラーが発生してもページがクラッシュしないことを確認
    await expect(page.locator('body')).toBeVisible();
}

/**
 * テストデータを生成
 * @param count 生成するデータ数
 * @param type データタイプ
 */
export function generateTestData(count: number, type: 'polls' | 'users' | 'transactions') {
    switch (type) {
        case 'polls':
            return Array.from({ length: count }, (_, index) => ({
                id: index + 1,
                type: ['dynamic', 'weighted', 'simple'][index % 3],
                topic: `テスト投票 ${index + 1}`,
                owner: `0x${index.toString().padStart(40, '0')}`,
                startTime: Date.now() - 86400000,
                endTime: Date.now() + 86400000,
                choices: [
                    { name: `選択肢A-${index + 1}`, votes: Math.floor(Math.random() * 10) },
                    { name: `選択肢B-${index + 1}`, votes: Math.floor(Math.random() * 10) },
                ],
            }));
        default:
            return [];
    }
}
