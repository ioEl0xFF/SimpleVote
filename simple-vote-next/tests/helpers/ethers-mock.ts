import { Page, expect } from '@playwright/test';

/**
 * ethers.jsの完全モックを設定するヘルパー関数
 */
export async function setupEthersMock(page: Page) {
    await page.addInitScript(() => {
        // モック用のアカウントアドレスとシグネチャ
        const mockAccount = '0x1234567890123456789012345678901234567890';
        const mockSignature = '0x1234567890123456789012345678901234567890';

        console.log('Setting up complete ethers.js mock...');

        // イベントリスナー管理用
        const eventListeners: { [key: string]: any[] } = {};

        // window.ethereumの完全なモック
        Object.defineProperty(window, 'ethereum', {
            value: {
                request: async (args: any) => {
                    console.log('Mock ethereum.request called with:', args);
                    switch (args.method) {
                        case 'eth_requestAccounts':
                            console.log('Returning mock accounts:', [mockAccount]);
                            return [mockAccount];
                        case 'eth_accounts':
                            console.log('Returning mock accounts:', [mockAccount]);
                            return [mockAccount];
                        case 'eth_chainId':
                            console.log('Returning mock chainId: 0x1');
                            return '0x1';
                        case 'net_version':
                            console.log('Returning mock network version: 1');
                            return '1';
                        case 'personal_sign':
                            console.log('Returning mock signature:', mockSignature);
                            return mockSignature;
                        case 'eth_newFilter':
                            console.log('Returning mock filter ID: 0x1');
                            return '0x1';
                        case 'eth_call':
                            console.log('Mock eth_call with params:', args.params);
                            return '0x0000000000000000000000000000000000000000000000000000000000000000';
                        case 'eth_blockNumber':
                            console.log('Returning mock block number: 0x123456');
                            return '0x123456';
                        default:
                            console.log('Unknown method:', args.method);
                            return null;
                    }
                },
                on: (eventName: string, callback: any) => {
                    console.log('Mock ethereum.on called with:', eventName);
                    if (!eventListeners[eventName]) {
                        eventListeners[eventName] = [];
                    }
                    eventListeners[eventName].push(callback);
                },
                removeListener: (eventName: string, callback: any) => {
                    console.log('Mock ethereum.removeListener called with:', eventName);
                    if (eventListeners[eventName]) {
                        const index = eventListeners[eventName].indexOf(callback);
                        if (index > -1) {
                            eventListeners[eventName].splice(index, 1);
                        }
                    }
                },
                emit: (eventName: string, data: any) => {
                    console.log('Mock ethereum.emit called with:', eventName, data);
                    if (eventListeners[eventName]) {
                        eventListeners[eventName].forEach((callback) => {
                            try {
                                callback(data);
                            } catch (error) {
                                console.error('Error in event listener:', error);
                            }
                        });
                    }
                },
                isMetaMask: true,
                selectedAddress: mockAccount,
                networkVersion: '1',
                chainId: '0x1',
                autoRefreshOnNetworkChange: false,
            },
            writable: true,
            configurable: true,
        });

        // MockSignerクラス
        class MockSigner {
            private _provider: any;

            constructor(provider: any) {
                this._provider = provider;
                console.log('MockSigner created');
            }

            async getAddress() {
                console.log('MockSigner.getAddress called');
                return mockAccount;
            }

            async signMessage(message: string) {
                console.log('MockSigner.signMessage called with:', message);
                return mockSignature;
            }

            get provider() {
                return this._provider;
            }
        }

        // ethers.jsのモジュールレベルモック
        const mockEthers = {
            BrowserProvider: class MockBrowserProvider {
                private ethereum: any;
                private _signer: any;

                constructor(ethereum: any) {
                    this.ethereum = ethereum;
                    console.log('MockBrowserProvider created with ethereum:', ethereum);
                }

                async send(method: string, params: any[]) {
                    console.log('MockBrowserProvider.send called with:', method, params);
                    return await this.ethereum.request({ method, params });
                }

                async getSigner() {
                    console.log('MockBrowserProvider.getSigner called');
                    if (!this._signer) {
                        this._signer = new MockSigner(this);
                    }
                    return this._signer;
                }

                async getNetwork() {
                    console.log('MockBrowserProvider.getNetwork called');
                    return { chainId: 1n, name: 'mainnet' };
                }
            },
            Contract: class MockContract {
                private address: string;
                private abi: any;
                private signer: any;

                constructor(address: string, abi: any, signer: any) {
                    this.address = address;
                    this.abi = abi;
                    this.signer = signer;
                    console.log('MockContract created with address:', address);
                }

                async getPolls() {
                    console.log('MockContract.getPolls called');
                    return [[], [], [], []]; // 空の投票一覧を返す
                }

                async getPoll(pollId: number) {
                    console.log('MockContract.getPoll called with:', pollId);
                    return [0, 0, 0, 0, 0, 0, [], []];
                }

                on(event: string, callback: any) {
                    console.log('MockContract.on called with:', event);
                }

                off(event: string, callback: any) {
                    console.log('MockContract.off called with:', event);
                }
            },
        };

        // グローバルなethersオブジェクトを設定
        (window as any).ethers = mockEthers;

        // モジュールキャッシュをクリアしてモックを強制適用
        if ((window as any).__webpack_require__) {
            const originalRequire = (window as any).__webpack_require__;
            (window as any).__webpack_require__ = function (moduleId: string) {
                // ethersモジュールの場合はモックを返す
                if (moduleId.includes('ethers') || moduleId.includes('node_modules/ethers')) {
                    console.log('Mock ethers module requested via webpack:', moduleId);
                    return mockEthers;
                }
                return originalRequire.apply(this, arguments);
            };
        }

        // ES6モジュールのモック
        const originalImport = (window as any).import;
        (window as any).import = function (moduleName: string) {
            if (moduleName === 'ethers' || moduleName.includes('ethers')) {
                console.log('Mock ethers ES6 import requested:', moduleName);
                return Promise.resolve(mockEthers);
            }
            if (originalImport) {
                return originalImport.apply(this, arguments);
            }
            throw new Error(`Module ${moduleName} not found`);
        };

        // 動的インポートのモック
        (window as any).dynamicImport = function (moduleName: string) {
            if (moduleName === 'ethers' || moduleName.includes('ethers')) {
                console.log('Mock ethers dynamic import requested:', moduleName);
                return Promise.resolve(mockEthers);
            }
            throw new Error(`Module ${moduleName} not found`);
        };

        console.log('Complete ethers mock initialized successfully');
    });
}

/**
 * ウォレット接続プロセスを完全にシミュレートする関数（最適化版）
 */
export async function simulateCompleteWalletConnection(page: Page) {
    console.log('Starting optimized wallet connection simulation...');

    // ethers.jsのモックを設定
    await setupEthersMock(page);

    // ページをリロードしてモックを適用
    await page.reload();

    // ウォレット接続ボタンが表示されるまで待機（タイムアウト短縮）
    await page.waitForSelector('button:has-text("ウォレット接続")', { timeout: 5000 });

    // ウォレット接続ボタンをクリック
    await page.getByRole('button', { name: 'ウォレット接続' }).click();

    // 接続プロセスが完了するまで待機（タイムアウト短縮）
    await page.waitForTimeout(2000);

    // アカウントアドレスが表示されているかチェック
    await page.waitForSelector('.font-mono', { timeout: 5000 });

    console.log('Optimized wallet connection simulation finished');
}

/**
 * 高速なウォレット接続シミュレーション（最小限の検証）
 */
export async function simulateQuickWalletConnection(page: Page) {
    console.log('Starting quick wallet connection simulation...');

    // ethers.jsのモックを設定
    await setupEthersMock(page);

    // ページをリロードしてモックを適用
    await page.reload();

    // ウォレット接続ボタンをクリック
    await page.getByRole('button', { name: 'ウォレット接続' }).click();

    // 最小限の待機時間
    await page.waitForTimeout(1000);

    console.log('Quick wallet connection simulation finished');
}

/**
 * トーストメッセージの検証ヘルパー（最適化版）
 */
export async function waitForToast(page: Page, expectedMessage: string, timeout = 3000) {
    await page.waitForSelector('[data-testid="toast"]', { timeout });
    const toast = page.locator('[data-testid="toast"]');
    await expect(toast).toBeVisible();

    const toastText = await toast.textContent();
    expect(toastText).toContain(expectedMessage);

    console.log('Toast message verified:', toastText);
}

/**
 * ウォレット接続状態を検証する関数（最適化版）
 */
export async function verifyWalletConnectionState(page: Page) {
    console.log('Starting optimized wallet connection state verification...');

    // 並列で要素を待機
    await Promise.all([
        page.waitForSelector('.font-mono', { timeout: 5000 }),
        page.waitForSelector('button:has-text("切断")', { timeout: 5000 }),
        page.waitForSelector('button:has-text("新規作成")', { timeout: 5000 }),
        page.waitForSelector('text=投票一覧', { timeout: 5000 }),
    ]);

    console.log('Optimized wallet connection state verified successfully');
}
