import { Page } from '@playwright/test';

/**
 * ウォレット接続状態をシミュレートするヘルパー関数
 */
export class WalletHelper {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * ウォレット接続をシミュレート
     */
    async simulateWalletConnection(
        accountAddress: string = '0x1234567890123456789012345678901234567890'
    ) {
        // ウォレット接続ボタンをクリック
        await this.page.getByRole('button', { name: 'ウォレット接続' }).click();

        // ウォレット接続後の状態をシミュレート
        await this.page.evaluate((address) => {
            // localStorageにウォレット接続状態を保存
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('accountAddress', address);

            // カスタムイベントを発火してコンポーネントに通知
            window.dispatchEvent(
                new CustomEvent('walletConnected', {
                    detail: { address },
                })
            );
        }, accountAddress);
    }

    /**
     * ウォレット切断をシミュレート
     */
    async simulateWalletDisconnection() {
        // 切断ボタンをクリック
        await this.page.getByRole('button', { name: '切断' }).click();

        // ウォレット切断後の状態をシミュレート
        await this.page.evaluate(() => {
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('accountAddress');

            // カスタムイベントを発火してコンポーネントに通知
            window.dispatchEvent(new CustomEvent('walletDisconnected'));
        });
    }

    /**
     * ウォレット接続状態を確認
     */
    async isWalletConnected(): Promise<boolean> {
        return await this.page.locator('.font-mono').isVisible();
    }

    /**
     * アカウントアドレスを取得
     */
    async getAccountAddress(): Promise<string> {
        return (await this.page.locator('.font-mono').textContent()) || '';
    }

    /**
     * ウォレット接続ボタンが表示されているか確認
     */
    async isConnectButtonVisible(): Promise<boolean> {
        return await this.page.getByRole('button', { name: 'ウォレット接続' }).isVisible();
    }

    /**
     * 切断ボタンが表示されているか確認
     */
    async isDisconnectButtonVisible(): Promise<boolean> {
        return await this.page.getByRole('button', { name: '切断' }).isVisible();
    }
}

/**
 * 投票データをシミュレートするヘルパー関数
 */
export class PollHelper {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * テスト用の投票データをシミュレート
     */
    async simulatePollData(
        polls: Array<{
            id: number;
            type: string;
            topic: string;
            choices: Array<{ name: string; votes: number }>;
        }>
    ) {
        await this.page.evaluate((pollData) => {
            // モックデータをlocalStorageに保存
            localStorage.setItem('mockPolls', JSON.stringify(pollData));

            // カスタムイベントを発火
            window.dispatchEvent(
                new CustomEvent('pollsUpdated', {
                    detail: { polls: pollData },
                })
            );
        }, polls);
    }

    /**
     * 投票一覧が表示されているか確認
     */
    async isPollListVisible(): Promise<boolean> {
        return await this.page.locator('text=Poll 一覧').isVisible();
    }

    /**
     * 投票項目の数を取得
     */
    async getPollCount(): Promise<number> {
        return await this.page.locator('button:has-text(":")').count();
    }

    /**
     * 特定の投票項目をクリック
     */
    async clickPollItem(pollId: number) {
        await this.page.locator(`button:has-text("ID: ${pollId}")`).click();
    }
}

/**
 * ローディング状態をシミュレートするヘルパー関数
 */
export class LoadingHelper {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * ローディングスピナーが表示されているか確認
     */
    async isSpinnerVisible(): Promise<boolean> {
        return await this.page.locator('.animate-spin').isVisible();
    }

    /**
     * ローディングメッセージが表示されているか確認
     */
    async isLoadingMessageVisible(): Promise<boolean> {
        return await this.page.locator('text=投票一覧を読み込み中...').isVisible();
    }

    /**
     * ローディング状態をシミュレート
     */
    async simulateLoading() {
        await this.page.evaluate(() => {
            // ローディング状態をシミュレート
            window.dispatchEvent(new CustomEvent('loadingStarted'));
        });
    }

    /**
     * ローディング完了をシミュレート
     */
    async simulateLoadingComplete() {
        await this.page.evaluate(() => {
            // ローディング完了をシミュレート
            window.dispatchEvent(new CustomEvent('loadingComplete'));
        });
    }
}
