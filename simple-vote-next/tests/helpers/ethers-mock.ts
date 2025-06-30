import { Page } from '@playwright/test';

/**
 * ethers.jsの完全モックを設定するヘルパー関数
 */
export async function setupEthersMock(page: Page) {
    await page.addInitScript(() => {
        // モック用のアカウントアドレスとシグネチャ
        const mockAccount = '0x1234567890123456789012345678901234567890';
        const mockSignature = '0x1234567890123456789012345678901234567890';

        console.log('Setting up complete ethers.js mock...');

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
                        default:
                            console.log('Unknown method:', args.method);
                            return null;
                    }
                },
                on: (eventName: string, callback: any) => {
                    console.log('Mock ethereum.on called with:', eventName);
                },
                removeListener: (eventName: string, callback: any) => {
                    console.log('Mock ethereum.removeListener called with:', eventName);
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
 * ウォレット接続プロセスを完全にシミュレートする関数
 */
export async function simulateCompleteWalletConnection(page: Page) {
    console.log('Starting complete wallet connection simulation...');

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

    // ページをリロードしてモックを適用
    console.log('Reloading page to apply mock...');
    await page.reload();

    // ウォレット接続ボタンが表示されるまで待機
    console.log('Waiting for wallet connect button...');
    await page.waitForSelector('button:has-text("ウォレット接続")', { timeout: 10000 });

    // ウォレット接続ボタンをクリック
    console.log('Clicking wallet connect button...');
    await page.getByRole('button', { name: 'ウォレット接続' }).click();

    // 接続プロセスが完了するまで待機
    console.log('Waiting for connection process to complete...');
    await page.waitForTimeout(3000);

    // ページの状態を確認
    console.log('Checking page state after connection...');
    const pageContent = await page.content();
    console.log('Page content length:', pageContent.length);

    // アカウントアドレスが表示されているかチェック
    const accountElement = await page.locator('.font-mono').count();
    console.log('Account elements found:', accountElement);

    console.log('Complete wallet connection simulation finished');
}

/**
 * ウォレット接続状態を検証する関数
 */
export async function verifyWalletConnectionState(page: Page) {
    console.log('Starting wallet connection state verification...');

    // アカウントアドレスが表示されることを確認
    console.log('Waiting for account address to be visible...');
    await page.waitForSelector('.font-mono', { timeout: 10000 });

    // 切断ボタンが表示されることを確認
    console.log('Waiting for disconnect button to be visible...');
    await page.waitForSelector('button:has-text("切断")', { timeout: 10000 });

    // 新規作成ボタンが表示されることを確認
    console.log('Waiting for create button to be visible...');
    await page.waitForSelector('button:has-text("新規作成")', { timeout: 10000 });

    // 投票一覧が表示されることを確認
    console.log('Waiting for poll list to be visible...');
    await page.waitForSelector('text=投票一覧', { timeout: 10000 });

    console.log('Wallet connection state verified successfully');
}
