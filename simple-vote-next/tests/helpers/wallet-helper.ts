import { Page } from '@playwright/test';
import { setupEthersMock, simulateQuickWalletConnection } from './ethers-mock';

/**
 * ウォレット接続状態をシミュレートするヘルパー関数
 */
export class WalletHelper {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * ウォレット接続をシミュレート（ethers-mock使用版）
     */
    async simulateWalletConnection(
        accountAddress: string = '0x1234567890123456789012345678901234567890'
    ) {
        console.log('Simulating wallet connection with ethers-mock...');

        // ethers.jsのモックを設定
        await setupEthersMock(this.page);

        // ページをリロードしてモックを適用
        await this.page.reload();

        // ウォレット接続ボタンが表示されるまで待機
        await this.page.waitForSelector('button:has-text("ウォレット接続")', { timeout: 5000 });

        // ウォレット接続ボタンをクリック
        await this.page.getByRole('button', { name: 'ウォレット接続' }).click();

        // 接続プロセスが完了するまで待機
        await this.page.waitForTimeout(2000);

        // アカウントアドレスが表示されるまで待機
        await this.page.waitForSelector('.font-mono', { timeout: 5000 });

        console.log('Wallet connection simulation completed');
    }

    /**
     * 高速なウォレット接続をシミュレート
     */
    async simulateQuickWalletConnection() {
        await simulateQuickWalletConnection(this.page);
    }

    /**
     * ウォレット切断をシミュレート
     */
    async simulateWalletDisconnection() {
        console.log('Simulating wallet disconnection...');

        // 切断ボタンをクリック
        await this.page.getByRole('button', { name: '切断' }).click();

        // 切断プロセスが完了するまで待機
        await this.page.waitForTimeout(1000);

        console.log('Wallet disconnection simulation completed');
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
