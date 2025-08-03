/**
 * 共通テストユーティリティ
 * テストで使用する共通機能を提供
 */

import { Page, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

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
 * コンソールログの収集と保存用クラス
 */
export class ConsoleLogger {
    private logs: Array<{
        timestamp: string;
        type: string;
        message: string;
        url?: string;
        location?: string;
    }> = [];
    private page: Page;
    private testName: string;

    constructor(page: Page, testName: string) {
        this.page = page;
        this.testName = testName;
        this.setupConsoleListener();
    }

    /**
     * コンソールリスナーを設定
     */
    private setupConsoleListener() {
        this.page.on('console', (msg) => {
            const location = msg.location();
            this.logs.push({
                timestamp: new Date().toISOString(),
                type: msg.type(),
                message: msg.text(),
                url: location?.url,
                location: location
                    ? `${location.url}:${location.lineNumber}:${location.columnNumber}`
                    : undefined,
            });
        });

        // ページエラーもキャプチャ
        this.page.on('pageerror', (error) => {
            this.logs.push({
                timestamp: new Date().toISOString(),
                type: 'error',
                message: `Page Error: ${error.message}`,
                location: error.stack,
            });
        });

        // リクエストエラーもキャプチャ
        this.page.on('requestfailed', (request) => {
            this.logs.push({
                timestamp: new Date().toISOString(),
                type: 'network-error',
                message: `Request Failed: ${request.url()} - ${request.failure()?.errorText}`,
            });
        });
    }

    /**
     * ログを取得
     */
    getLogs() {
        return [...this.logs];
    }

    /**
     * ログをファイルに保存
     * @param filePath 保存先ファイルパス（省略時は自動生成）
     */
    async saveLogsToFile(filePath?: string) {
        if (!filePath) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const sanitizedTestName = this.testName.replace(/[^a-zA-Z0-9]/g, '_');
            filePath = path.join(
                'test-results',
                'console-logs',
                `${sanitizedTestName}_${timestamp}.json`
            );
        }

        // ディレクトリが存在しない場合は作成
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        const logData = {
            testName: this.testName,
            timestamp: new Date().toISOString(),
            url: this.page.url(),
            logs: this.logs,
            summary: {
                total: this.logs.length,
                byType: this.logs.reduce((acc, log) => {
                    acc[log.type] = (acc[log.type] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
            },
        };

        await fs.writeFile(filePath, JSON.stringify(logData, null, 2), 'utf-8');
        return filePath;
    }

    /**
     * ログをテキスト形式で保存
     * @param filePath 保存先ファイルパス（省略時は自動生成）
     */
    async saveLogsAsText(filePath?: string) {
        if (!filePath) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const sanitizedTestName = this.testName.replace(/[^a-zA-Z0-9]/g, '_');
            filePath = path.join(
                'test-results',
                'console-logs',
                `${sanitizedTestName}_${timestamp}.txt`
            );
        }

        // ディレクトリが存在しない場合は作成
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        const logText = [
            `Test: ${this.testName}`,
            `URL: ${this.page.url()}`,
            `Timestamp: ${new Date().toISOString()}`,
            `Total Logs: ${this.logs.length}`,
            '',
            '=== Console Logs ===',
            '',
            ...this.logs.map((log) => {
                const location = log.location ? ` (${log.location})` : '';
                return `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}${location}`;
            }),
        ].join('\n');

        await fs.writeFile(filePath, logText, 'utf-8');
        return filePath;
    }

    /**
     * エラーログのみを取得
     */
    getErrorLogs() {
        return this.logs.filter(
            (log) => log.type === 'error' || log.type === 'network-error' || log.type === 'warning'
        );
    }

    /**
     * 特定タイプのログを取得
     * @param types フィルタするログタイプ
     */
    getLogsByType(types: string[]) {
        return this.logs.filter((log) => types.includes(log.type));
    }

    /**
     * ログをクリア
     */
    clear() {
        this.logs = [];
    }
}

/**
 * コンソールログを取得（既存関数を互換性のために保持）
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
 * テスト用コンソールログセットアップ
 * @param page Playwrightのpageオブジェクト
 * @param testName テスト名
 * @param options オプション設定
 */
export function setupConsoleLogging(
    page: Page,
    testName: string,
    options: {
        autoSave?: boolean;
        saveFormat?: 'json' | 'text' | 'both';
        filterTypes?: string[];
    } = {}
) {
    const logger = new ConsoleLogger(page, testName);

    if (options.autoSave) {
        // テスト終了時に自動保存
        page.on('close', async () => {
            try {
                if (options.saveFormat === 'text') {
                    await logger.saveLogsAsText();
                } else if (options.saveFormat === 'both') {
                    await logger.saveLogsToFile();
                    await logger.saveLogsAsText();
                } else {
                    await logger.saveLogsToFile();
                }
            } catch (error) {
                console.error('Failed to save console logs:', error);
            }
        });
    }

    return logger;
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

/**
 * テスト失敗時でもコンソールログを保存するヘルパー関数
 * @param page Playwrightのpageオブジェクト
 * @param testName テスト名
 * @param testFunction テスト関数
 * @param options オプション設定
 */
export async function withConsoleLogging<T>(
    page: Page,
    testName: string,
    testFunction: (logger: ConsoleLogger) => Promise<T>,
    options: {
        saveFormat?: 'json' | 'text' | 'both';
        enableDetailedErrorLogging?: boolean;
    } = {}
): Promise<T> {
    const logger = setupConsoleLogging(page, testName, {
        autoSave: false,
        saveFormat: options.saveFormat || 'both',
    });

    try {
        return await testFunction(logger);
    } finally {
        // テスト成功/失敗に関わらず、コンソールログを保存
        try {
            const jsonLogPath = await logger.saveLogsToFile();
            const textLogPath = await logger.saveLogsAsText();

            console.log(`Console logs saved to: ${jsonLogPath}`);
            console.log(`Console logs saved to: ${textLogPath}`);

            // エラーログの確認
            const errorLogs = logger.getErrorLogs();
            if (errorLogs.length > 0) {
                console.log('Error logs found:', errorLogs.length);

                if (options.enableDetailedErrorLogging) {
                    console.log(
                        'Error details:',
                        errorLogs.map((log) => ({
                            type: log.type,
                            message:
                                log.message.substring(0, 200) +
                                (log.message.length > 200 ? '...' : ''),
                            timestamp: log.timestamp,
                            location: log.location,
                        }))
                    );
                }
            }

            // ログの統計情報
            const allLogs = logger.getLogs();
            const logSummary = allLogs.reduce((acc, log) => {
                acc[log.type] = (acc[log.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            console.log(`Total logs captured: ${allLogs.length}`);
            console.log('Log summary by type:', logSummary);
        } catch (saveError) {
            console.error('Failed to save console logs:', saveError);
        }
    }
}

/**
 * 自動コンソールログ保存付きテスト実行
 * @param testName テスト名
 * @param testFn テスト関数
 * @param options オプション設定
 */
export function testWithConsoleLogging(
    testName: string,
    testFn: (page: Page, logger: ConsoleLogger) => Promise<void>,
    options: {
        saveFormat?: 'json' | 'text' | 'both';
        enableDetailedErrorLogging?: boolean;
        timeout?: number;
    } = {}
) {
    return async ({ page }: { page: Page }) => {
        await withConsoleLogging(page, testName, (logger) => testFn(page, logger), options);
    };
}
