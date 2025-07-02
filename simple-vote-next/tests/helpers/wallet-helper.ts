import { Page } from '@playwright/test';
import { setupEthersMock, simulateQuickWalletConnection } from './ethers-mock';

/**
 * Toast要素の待機と確認を行うヘルパー関数
 */
export const waitForToast = async (page: Page, message: string, timeout = 10000): Promise<boolean> => {
    try {
        // 動的な待機条件を使用
        await page.waitForFunction(
            (msg) => {
                const toastElements = document.querySelectorAll('[role="alert"], .toast, [data-testid="toast"]');
                return Array.from(toastElements).some(el => 
                    el.textContent?.includes(msg) && el.textContent.trim() !== ''
                );
            },
            message,
            { timeout }
        );
        console.log(`Toast found with message: ${message}`);
        return true;
    } catch (error) {
        console.log(`Toast with message "${message}" not found`);
        return false;
    }
};

/**
 * ウォレット接続状態の待機を行うヘルパー関数
 */
export const waitForWalletConnection = async (page: Page, timeout = 10000): Promise<boolean> => {
    try {
        // アカウントアドレス表示の待機
        const addressSelectors = [
            '.font-mono',
            '[data-testid="account-address"]',
            '.account-address'
        ];

        for (const selector of addressSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: timeout / 3 });
                console.log(`Wallet connected, address found with selector: ${selector}`);
                return true;
            } catch (error) {
                console.log(`Selector ${selector} not found, trying next...`);
            }
        }

        console.log('Wallet connection not detected');
        return false;
    } catch (error) {
        console.log(`ウォレット接続待機エラー: ${error}`);
        return false;
    }
};

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

    /**
     * アカウント切り替えをシミュレート
     */
    async simulateAccountSwitch() {
        console.log('Simulating account switch...');

        // 新しいアカウントアドレスをシミュレート
        const newAccount = '0x9876543210987654321098765432109876543210';

        // ethereumオブジェクトのアカウント変更イベントを発火
        await this.page.evaluate((account) => {
            if ((window as any).ethereum) {
                (window as any).ethereum.emit('accountsChanged', [account]);
            }
        }, newAccount);

        // アカウント切り替えの処理が完了するまで待機
        await this.page.waitForTimeout(1000);

        console.log('Account switch simulation completed');
    }

    /**
     * ネットワーク切り替えをシミュレート
     */
    async simulateNetworkSwitch() {
        console.log('Simulating network switch...');

        // 新しいネットワークIDをシミュレート
        const newNetworkId = '0x5'; // Goerli

        // ethereumオブジェクトのネットワーク変更イベントを発火
        await this.page.evaluate((networkId) => {
            if ((window as any).ethereum) {
                (window as any).ethereum.emit('chainChanged', networkId);
            }
        }, newNetworkId);

        // ネットワーク切り替えの処理が完了するまで待機
        await this.page.waitForTimeout(1000);

        console.log('Network switch simulation completed');
    }

    /**
     * 無効なネットワークへの切り替えをシミュレート
     */
    async simulateInvalidNetworkSwitch() {
        console.log('Simulating invalid network switch...');

        // 無効なネットワークIDをシミュレート
        const invalidNetworkId = '0x999'; // 無効なネットワーク

        // ethereumオブジェクトのネットワーク変更イベントを発火
        await this.page.evaluate((networkId) => {
            if ((window as any).ethereum) {
                (window as any).ethereum.emit('chainChanged', networkId);
            }
        }, invalidNetworkId);

        // エラーハンドリングの処理が完了するまで待機
        await this.page.waitForTimeout(1000);

        console.log('Invalid network switch simulation completed');
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
