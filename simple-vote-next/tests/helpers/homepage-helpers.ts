/**
 * ホームページテスト専用ヘルパー関数
 * ホームページのテストで使用する共通機能を提供
 */

import { Page, expect } from '@playwright/test';
import { PollTestData } from '../e2e/fixtures/homepage-fixtures';

export interface HomePageTestConfig {
    polls?: PollTestData[];
    shouldFail?: boolean;
    errorMessage?: string;
    loadingDelay?: number;
}

/**
 * ホームページテスト用の共通セットアップ
 * @param page Playwrightのpageオブジェクト
 * @param config テスト設定
 */
export async function setupHomePageTest(page: Page, config: HomePageTestConfig = {}) {
    const {
        polls = [],
        shouldFail = false,
        errorMessage = 'Test error',
        loadingDelay = 0,
    } = config;

    // ページに移動
    await page.goto('/');

    // 必要に応じてモック設定を追加
    if (loadingDelay > 0) {
        await page.addInitScript((delay: number) => {
            // ネットワーク遅延をシミュレート
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                await new Promise((resolve) => setTimeout(resolve, delay));
                return originalFetch(...args);
            };
        }, loadingDelay);
    }
}

/**
 * 投票一覧の表示を検証する
 * @param page Playwrightのpageオブジェクト
 * @param expectedPolls 期待される投票データ
 */
export async function verifyPollList(page: Page, expectedPolls: PollTestData[]) {
    // 投票一覧のタイトルが表示されることを確認
    await expect(page.locator('h2')).toContainText('Poll 一覧');

    if (expectedPolls.length === 0) {
        // 空の場合はメッセージが表示されることを確認
        await expect(page.locator('p')).toContainText('議題が存在しません');
        return;
    }

    // 投票項目の数が正しいことを確認
    const pollButtons = page.locator('ul li button');
    await expect(pollButtons).toHaveCount(expectedPolls.length);

    // 各投票項目の内容を確認
    for (let i = 0; i < expectedPolls.length; i++) {
        const poll = expectedPolls[i];
        const button = pollButtons.nth(i);

        // 投票タイプとタイトルが正しく表示されることを確認
        await expect(button).toContainText(`${poll.type} : ${poll.topic}`);

        // IDが表示されることを確認
        await expect(button).toContainText(`(ID: ${poll.id})`);

        // aria-label属性が正しく設定されていることを確認
        await expect(button).toHaveAttribute(
            'aria-label',
            `${poll.type}投票「${poll.topic}」を選択する`
        );
    }
}

/**
 * 投票項目をクリックしてナビゲーションを検証する
 * @param page Playwrightのpageオブジェクト
 * @param poll クリックする投票データ
 */
export async function clickPollAndVerifyNavigation(page: Page, poll: PollTestData) {
    // 投票ボタンが存在することを確認
    const targetButton = page.locator('ul li button').first();
    await expect(targetButton).toBeVisible();

    // 投票をクリック
    await targetButton.click();

    // 適切なページに遷移することを確認
    await expect(page).toHaveURL(new RegExp(`/${poll.type}/${poll.id}`));
}

/**
 * 新規作成ボタンの機能をテストする
 * @param page Playwrightのpageオブジェクト
 */
export async function testCreateButton(page: Page) {
    // 新規作成ボタンを取得
    const createButton = page.locator('text=新規作成');

    // ボタンが表示されることを確認
    await expect(createButton).toBeVisible();

    // aria-label属性が正しく設定されていることを確認
    await expect(createButton).toHaveAttribute('aria-label', '新しい投票を作成する');

    // ボタンをクリック
    await createButton.click();

    // 作成ページに遷移することを確認
    await expect(page).toHaveURL(/\/create/);
}

/**
 * ローディング状態を検証
 * @param page Playwrightのpageオブジェクト
 */
export async function verifyLoadingState(page: Page) {
    // ローディングスピナーが表示されることを確認
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // ローディングメッセージが表示されることを確認
    await expect(page.locator('text=投票一覧を読み込み中...')).toBeVisible();
}

/**
 * ローディング完了状態を検証
 * @param page Playwrightのpageオブジェクト
 */
export async function verifyLoadingComplete(page: Page) {
    // ローディングスピナーが非表示になることを確認
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();

    // ローディングメッセージが非表示になることを確認
    await expect(page.locator('text=投票一覧を読み込み中...')).not.toBeVisible();
}

/**
 * キーボードナビゲーションをテストする
 * @param page Playwrightのpageオブジェクト
 */
export async function testKeyboardNavigation(page: Page) {
    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab');

    // 新規作成ボタンにフォーカスが移動することを確認
    await expect(page.locator('text=新規作成')).toBeFocused();

    // Enterキーでボタンアクティベート
    await page.keyboard.press('Enter');

    // 作成ページに遷移することを確認
    await expect(page).toHaveURL(/\/create/);
}

/**
 * アクセシビリティをテストする
 * @param page Playwrightのpageオブジェクト
 */
export async function testAccessibility(page: Page) {
    // ページの基本構造を確認
    await expect(page.locator('h1').first()).toContainText('SimpleVote');

    // 投票一覧の見出しが表示されることを確認（PageHeader内のh1）
    // PageHeaderコンポーネント内のh1を特定するため、より具体的なセレクターを使用
    await expect(page.locator('h1').filter({ hasText: '投票一覧' })).toBeVisible();

    // 新規作成ボタンが存在することを確認
    await expect(page.locator('text=新規作成')).toBeVisible();

    // メインコンテンツエリアが存在することを確認
    await expect(page.locator('main')).toBeVisible();
}

/**
 * レスポンシブデザインをテストする
 * @param page Playwrightのpageオブジェクト
 */
export async function testResponsiveDesign(page: Page) {
    // デスクトップサイズでの表示を確認
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('main')).toBeVisible();

    // タブレットサイズでの表示を確認
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('main')).toBeVisible();

    // モバイルサイズでの表示を確認
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('main')).toBeVisible();
}

/**
 * エラー状態を検証
 * @param page Playwrightのpageオブジェクト
 */
export async function verifyErrorState(page: Page) {
    // エラーが発生しても空の配列が設定されることを確認
    await expect(page.locator('p')).toContainText('議題が存在しません');

    // エラーメッセージがコンソールに出力されることを確認（オプション）
    // 実際のテストでは、ページのコンソールログを確認することも可能
}

/**
 * パフォーマンスをテスト
 * @param page Playwrightのpageオブジェクト
 * @param maxLoadTime 最大読み込み時間（ミリ秒）
 */
export async function testPerformance(page: Page, maxLoadTime: number = 3000) {
    const startTime = Date.now();

    // ページの読み込み完了を待機
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // 読み込み時間が指定された時間以内であることを確認
    expect(loadTime).toBeLessThan(maxLoadTime);
}

/**
 * 投票データの表示精度をテストする
 * @param page Playwrightのpageオブジェクト
 * @param expectedPolls 期待される投票データ
 */
export async function testPollDataAccuracy(page: Page, expectedPolls: PollTestData[]) {
    // 各投票データが正確に表示されることを確認
    for (let i = 0; i < expectedPolls.length; i++) {
        const poll = expectedPolls[i];
        const button = page.locator('ul li button').nth(i);

        // 投票タイプが正しく表示されることを確認
        await expect(button).toContainText(poll.type);

        // 投票タイトルが正しく表示されることを確認
        await expect(button).toContainText(poll.topic);

        // 投票IDが正しく表示されることを確認
        await expect(button).toContainText(poll.id.toString());
    }
}
