import { Page, expect } from '@playwright/test';

/**
 * ethers.jsの完全モックを設定するヘルパー関数
 */
export async function setupEthersMock(page: Page) {
    await page.addInitScript(() => {
        // コンソールログをキャプチャするための設定
        (window as any).consoleLogs = [];
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;

        console.log = (...args: any[]) => {
            (window as any).consoleLogs.push({
                type: 'log',
                args,
                timestamp: new Date().toISOString(),
            });
            originalConsoleLog.apply(console, args);
        };

        console.error = (...args: any[]) => {
            (window as any).consoleLogs.push({
                type: 'error',
                args,
                timestamp: new Date().toISOString(),
            });
            originalConsoleError.apply(console, args);
        };

        // 既存のethersオブジェクトを保存
        const originalEthers = (window as any).ethers;

        // モックトランザクションオブジェクトの作成
        const createMockTransaction = (hash: string) => ({
            hash,
            wait: async () => {
                console.log('Mock tx.wait() called at:', new Date().toISOString());
                // 実際のブロックチェーン処理をシミュレート
                await new Promise((resolve) => setTimeout(resolve, 100));

                const receipt = {
                    hash,
                    blockNumber: 12345,
                    blockHash: '0x' + '0'.repeat(64),
                    transactionIndex: 0,
                    from: '0x1234567890123456789012345678901234567890',
                    to: '0x0987654321098765432109876543210987654321',
                    contractAddress: null,
                    cumulativeGasUsed: '21000',
                    gasUsed: '21000',
                    effectiveGasPrice: '20000000000',
                    logs: [],
                    logsBloom: '0x' + '0'.repeat(512),
                    status: 1,
                    type: 2,
                    events: {
                        PollCreated: {
                            args: {
                                pollId: '1',
                                creator: '0x1234567890123456789012345678901234567890',
                                pollType: 0,
                                topic: 'テスト議題',
                                startTime: Math.floor(Date.now() / 1000),
                                endTime: Math.floor(Date.now() / 1000) + 3600,
                                choices: ['選択肢1', '選択肢2'],
                            },
                        },
                    },
                };

                console.log('Mock receipt generated:', receipt);
                return receipt;
            },
        });

        // モック用のアカウントアドレスとシグネチャ
        const mockAccount = '0x1234567890123456789012345678901234567890';
        const mockSignature = '0x1234567890123456789012345678901234567890';

        console.log('Setting up complete ethers.js mock...');

        // グローバルなログ関数を追加
        (window as any).debugLog = (message: string, data?: any) => {
            console.log(`[DEBUG] ${message}`, data);
        };

        // 正しいPollCreatedイベントシグネチャを計算
        const pollCreatedSignature =
            '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
        console.log('PollCreated event signature:', pollCreatedSignature);

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
                        case 'eth_estimateGas':
                            console.log('Returning mock gas estimate: 0x186A0');
                            return '0x186A0';
                        case 'eth_sendTransaction':
                            console.log('Returning mock transaction hash: 0x1234567890...');
                            return '0x1234567890123456789012345678901234567890123456789012345678901234';
                        case 'eth_getTransactionByHash':
                            console.log('Returning mock transaction receipt');
                            return {
                                hash: '0x1234567890123456789012345678901234567890123456789012345678901234',
                                from: '0x1234567890123456789012345678901234567890',
                                to: '0x0000000000000000000000000000000000000000',
                                gasLimit: '0x186A0',
                                value: '0x0',
                                nonce: '0x1',
                                data: '0x',
                                status: 1,
                                logs: [
                                    {
                                        // PollCreatedイベントのモックログ
                                        topics: [
                                            pollCreatedSignature, // PollCreated(uint256,uint8,address,string)
                                            '0x0000000000000000000000000000000000000000000000000000000000000001', // pollId (indexed)
                                            '0x0000000000000000000000001234567890123456789012345678901234567890', // owner (indexed)
                                        ],
                                        data: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000a7465737420746f70696300000000000000000000000000000000000000000000', // pollType (0) + topic (encoded string)
                                        address: '0x0000000000000000000000000000000000000000', // contract address
                                    },
                                ],
                            };
                        case 'eth_getFilterChanges':
                            console.log('Returning mock filter changes');
                            return [];
                        case 'eth_uninstallFilter':
                            console.log('Returning mock filter uninstall result');
                            return true;
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

            async sendTransaction(transaction: any) {
                console.log('MockSigner.sendTransaction called with:', transaction);
                const mockTx = {
                    hash: '0x1234567890123456789012345678901234567890123456789012345678901234',
                    from: '0x1234567890123456789012345678901234567890',
                    to: '0x0000000000000000000000000000000000000000',
                    gasLimit: '0x186A0',
                    value: '0x0',
                    nonce: '0x1',
                    data: '0x',
                    wait: async () => {
                        console.log('Mock tx.wait() called at:', new Date().toISOString());
                        console.log('Mock tx.wait() context:', this);

                        const receipt = {
                            status: 1,
                            transactionHash:
                                '0x1234567890123456789012345678901234567890123456789012345678901234',
                            from: '0x1234567890123456789012345678901234567890',
                            to: '0x0000000000000000000000000000000000000000',
                            gasLimit: '0x186A0',
                            value: '0x0',
                            nonce: '0x1',
                            data: '0x',
                            logs: [
                                {
                                    topics: [
                                        pollCreatedSignature,
                                        '0x0000000000000000000000000000000000000000000000000000000000000001',
                                        '0x0000000000000000000000001234567890123456789012345678901234567890',
                                    ],
                                    data: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000a7465737420746f70696300000000000000000000000000000000000000000000',
                                    address: '0x0000000000000000000000000000000000000000',
                                },
                            ],
                        };
                        console.log('Mock receipt returned:', receipt);
                        await new Promise((resolve) => setTimeout(resolve, 100));
                        console.log('Mock tx.wait() returning receipt');
                        return receipt;
                    },
                };
                console.log('Mock sendTransaction returning transaction:', mockTx);
                return mockTx;
            }

            get provider() {
                return this._provider;
            }
        }

        // モックContractクラス
        const MockContract = class {
            private address: string;
            private abi: any[];

            constructor(address: string, abi: any[]) {
                this.address = address;
                this.abi = abi;
                console.log('Mock Contract created for address:', address);
            }

            async createPoll(
                pollTypeEnum: number,
                topic: string,
                s: number,
                eTime: number,
                filteredChoices: string[],
                tokenAddress: string
            ) {
                console.log('=== MOCK CREATE POLL CALLED ===');
                console.log('Parameters:', {
                    pollTypeEnum,
                    topic,
                    s,
                    eTime,
                    filteredChoices,
                    tokenAddress,
                });

                const hash = '0x' + Math.random().toString(16).substring(2, 42);
                console.log('Generated hash:', hash);

                // 直接レシートを返すモックトランザクション
                const mockTx = {
                    hash,
                    wait: async () => {
                        console.log('=== MOCK TX.WAIT() CALLED ===');
                        console.log('Hash:', hash);
                        console.log('Timestamp:', new Date().toISOString());

                        // 実際のブロックチェーン処理をシミュレート
                        await new Promise((resolve) => setTimeout(resolve, 100));

                        const receipt = {
                            hash,
                            blockNumber: 12345,
                            blockHash: '0x' + '0'.repeat(64),
                            transactionIndex: 0,
                            from: '0x1234567890123456789012345678901234567890',
                            to: '0x0987654321098765432109876543210987654321',
                            contractAddress: null,
                            cumulativeGasUsed: '21000',
                            gasUsed: '21000',
                            effectiveGasPrice: '20000000000',
                            logs: [],
                            logsBloom: '0x' + '0'.repeat(512),
                            status: 1,
                            type: 2,
                            events: [
                                {
                                    event: 'PollCreated',
                                    args: {
                                        pollId: '1',
                                        creator: '0x1234567890123456789012345678901234567890',
                                        pollType: 0,
                                        topic: 'テスト議題',
                                        startTime: Math.floor(Date.now() / 1000),
                                        endTime: Math.floor(Date.now() / 1000) + 3600,
                                        choices: ['選択肢1', '選択肢2'],
                                    },
                                },
                            ],
                        };

                        console.log('=== MOCK RECEIPT GENERATED ===');
                        console.log('Receipt:', receipt);
                        console.log('Events:', receipt.events);
                        console.log('=== RETURNING RECEIPT ===');

                        return receipt;
                    },
                };

                console.log('=== RETURNING MOCK TRANSACTION ===');
                console.log('Mock transaction:', mockTx);

                return mockTx;
            }

            async getPoll(pollId: string) {
                console.log('Mock getPoll called with pollId:', pollId);
                return {
                    pollId,
                    creator: '0x1234567890123456789012345678901234567890',
                    pollType: 0,
                    topic: 'テスト議題',
                    startTime: Math.floor(Date.now() / 1000),
                    endTime: Math.floor(Date.now() / 1000) + 3600,
                    choices: ['選択肢1', '選択肢2'],
                    isActive: true,
                };
            }

            async getPolls() {
                console.log('Mock getPolls called');
                return [
                    [1n], // pollId[]
                    [0], // pollType[]
                    ['0x1234567890123456789012345678901234567890'], // owner[]
                    ['テスト投票'], // topic[]
                ];
            }
        };

        // モックethersオブジェクト
        const mockEthers = {
            Contract: MockContract,
            isMock: true,
            isAddress: (address: string) => {
                return /^0x[a-fA-F0-9]{40}$/.test(address);
            },
            BrowserProvider: class {
                constructor(provider: any) {
                    console.log('Mock BrowserProvider created');
                }
                async send(method: string, params: any[]) {
                    console.log('Mock BrowserProvider.send called with:', method, params);
                    if (method === 'eth_requestAccounts') {
                        return ['0x1234567890123456789012345678901234567890'];
                    }
                    return null;
                }
                async getSigner() {
                    return new MockSigner(this);
                }
            },
            providers: {
                Web3Provider: class {
                    constructor(provider: any) {
                        console.log('Mock Web3Provider created');
                    }
                    getSigner() {
                        return {
                            getAddress: async () => '0x1234567890123456789012345678901234567890',
                        };
                    }
                },
            },
        };

        // モックの適用
        (window as any).ethers = mockEthers;
        (window as any).mockEthers = mockEthers; // バックアップとして保存

        // モック適用の確認
        console.log('Ethers mock applied successfully');
        console.log('Window.ethers is mock:', (window as any).ethers?.isMock);
    });
}

/**
 * ウォレット接続プロセスを完全にシミュレートする関数（最適化版）
 */
export async function simulateCompleteWalletConnection(page: Page) {
    console.log('Starting optimized wallet connection simulation...');

    // ウォレット接続ボタンが表示されるまで待機（タイムアウト延長）
    await page.waitForSelector('button:has-text("ウォレット接続")', { timeout: 10000 });

    // ウォレット接続ボタンをクリック
    await page.getByRole('button', { name: 'ウォレット接続' }).click();

    // 接続プロセスが完了するまで待機（タイムアウト延長）
    await page.waitForTimeout(3000);

    // アカウントアドレスが表示されているかチェック
    await page.waitForSelector('.font-mono', { timeout: 10000 });

    // 新規作成ボタンが表示されているかチェック
    await page.waitForSelector('button:has-text("新規作成")', { timeout: 10000 });

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
    await page.waitForTimeout(2000);

    console.log('Quick wallet connection simulation finished');
}

/**
 * トーストメッセージの検証ヘルパー（最適化版）
 */
export async function waitForToast(page: Page, expectedMessage: string, timeout = 5000) {
    console.log(`Waiting for toast message: "${expectedMessage}"`);

    // トースト要素が表示されるまで待機（タイムアウト延長）
    await page.waitForSelector('[data-testid="toast"]', { timeout });

    // 最新のトーストのみを取得
    const toasts = page.locator('[data-testid="toast"]');
    const count = await toasts.count();
    const latestToast = toasts.nth(count - 1);

    await expect(latestToast).toBeVisible();

    const toastText = await latestToast.textContent();
    console.log('Found toast text:', toastText);

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