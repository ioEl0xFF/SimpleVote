/**
 * ウォレット接続のモック機能
 * PlaywrightテストでMetaMaskの動作をシミュレートするためのヘルパー
 * ethers.js v6対応版
 */

export interface MockEthereumConfig {
    accounts?: string[];
    signature?: string;
    contractData?: string;
    shouldFail?: boolean;
    errorMessage?: string;
    chainId?: string;
    networkVersion?: string;
}

export interface MockSignerConfig {
    address?: string;
    signature?: string;
    shouldFail?: boolean;
    errorMessage?: string;
}

/**
 * MetaMaskのモックを設定する
 * @param page Playwrightのpageオブジェクト
 * @param config モック設定
 */
export async function setupEthereumMock(page: any, config: MockEthereumConfig = {}) {
    const {
        accounts = ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'],
        signature = '0x1234567890abcdef',
        contractData = '0x',
        shouldFail = false,
        errorMessage = 'Mock error',
        chainId = '0x1',
        networkVersion = '1',
    } = config;

    await page.addInitScript((config: MockEthereumConfig) => {
        window.ethereum = {
            // 基本的なプロパティ
            isMetaMask: true,
            isConnected: () => true,
            chainId: config.chainId,
            networkVersion: config.networkVersion,
            selectedAddress: config.accounts?.[0] || null,

            // リクエストメソッド
            request: async (args: any) => {
                if (config.shouldFail) {
                    throw new Error(config.errorMessage);
                }

                switch (args.method) {
                    case 'eth_requestAccounts':
                        return config.accounts;
                    case 'eth_accounts':
                        return config.accounts;
                    case 'personal_sign':
                        return config.signature;
                    case 'eth_sign':
                        return config.signature;
                    case 'eth_signTypedData_v4':
                        return config.signature;
                    case 'eth_call':
                        return config.contractData;
                    case 'eth_getBalance':
                        return '0x1000000000000000000'; // 1 ETH
                    case 'eth_chainId':
                        return config.chainId;
                    case 'net_version':
                        return config.networkVersion;
                    case 'wallet_switchEthereumChain':
                        return null;
                    case 'wallet_addEthereumChain':
                        return null;
                    default:
                        return null;
                }
            },

            // イベントリスナー
            on: (eventName: string, listener: Function) => {
                // イベントリスナーの登録をモック
            },
            removeListener: (eventName: string, listener: Function) => {
                // イベントリスナーの削除をモック
            },
            removeAllListeners: (eventName?: string) => {
                // すべてのイベントリスナーの削除をモック
            },

            // 自動接続のシミュレート
            enable: async () => {
                if (config.shouldFail) {
                    throw new Error(config.errorMessage);
                }
                return config.accounts;
            },
        };
    }, config);
}

/**
 * ethers.js v6のBrowserProviderとSignerをモックする
 * @param page Playwrightのpageオブジェクト
 * @param config モック設定
 */
export async function setupEthersMock(page: any, config: MockSignerConfig = {}) {
    const {
        address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        signature = '0x1234567890abcdef',
        shouldFail = false,
        errorMessage = 'Signer error',
    } = config;

    await page.addInitScript((config: MockSignerConfig) => {
        // ethers.js v6の構造をモック
        if (!(window as any).ethers) {
            (window as any).ethers = {};
        }

        // BrowserProviderのモック
        (window as any).ethers.BrowserProvider = class MockBrowserProvider {
            public ethereum: any;

            constructor(ethereum: any) {
                this.ethereum = ethereum;
            }

            async getSigner() {
                return new MockSigner(config);
            }

            async send(method: string, params: any[]) {
                console.log('BrowserProvider.send() called with method:', method, 'params:', params);
                if (config.shouldFail) {
                    throw new Error(config.errorMessage);
                }

                switch (method) {
                    case 'eth_requestAccounts':
                        return [config.address];
                    case 'eth_accounts':
                        return [config.address];
                    case 'personal_sign':
                        return config.signature;
                    case 'eth_call':
                        console.log('eth_call detected, params:', params);
                        // eth_callの場合、paramsの最初の要素にトランザクションデータがある
                        if (params && params[0] && params[0].data) {
                            if (params[0].data.includes('bb6e4e71')) { // getPolls()
                                console.log('Returning getPolls() mock response via eth_call');
                                return '0x0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000036120130000000000000000000000000000000000000000000000000000000000742d35cc6634c0532925a3b8d4c9db96c4b4d8b6000000000000000000000000742d35cc6634c0532925a3b8d4c9db96c4b4d8b6000000000000000000000000742d35cc6634c0532925a3b8d4c9db96c4b4d8b6';
                            }
                        }
                        return '0x0000000000000000000000000000000000000000000000000000000000000001';
                    case 'eth_getBlockNumber':
                        return '0xbc614e'; // 12345678 in hex
                    default:
                        return null;
                }
            }

            async getNetwork() {
                return {
                    chainId: BigInt(1),
                    name: 'mainnet',
                };
            }

            async getBalance(address: string) {
                return BigInt('1000000000000000000'); // 1 ETH
            }

            async getBlockNumber() {
                return 12345678; // モック用のブロック番号
            }

            async call(transaction: any) {
                console.log('BrowserProvider.call() invoked with:', transaction);
                if (config.shouldFail) {
                    throw new Error(config.errorMessage);
                }

                // getPolls() 呼び出しの場合の擬似応答を返す
                if (transaction && transaction.data) {
                    // getPolls関数シグネチャを検出した場合
                    if (transaction.data.includes('bb6e4e71')) {
                        // getPolls()の関数シグネチャ
                        console.log('Detected getPolls() call, returning mock data');
                        // 3つの投票のモックデータを返す
                        return '0x0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000036120130000000000000000000000000000000000000000000000000000000000742d35cc6634c0532925a3b8d4c9db96c4b4d8b6000000000000000000000000742d35cc6634c0532925a3b8d4c9db96c4b4d8b6000000000000000000000000742d35cc6634c0532925a3b8d4c9db96c4b4d8b6';
                    }
                }

                // その他のコントラクト呼び出しのデフォルト応答
                return '0x0000000000000000000000000000000000000000000000000000000000000001';
            }

            async getCode(address: string) {
                return '0x608060405234801561001057600080fd5b50'; // モック用のコントラクトコード
            }

            async getLogs(filter: any) {
                return []; // 空のログ配列
            }
        };

        // Signerクラスのモック
        class MockSigner {
            private config: MockSignerConfig;
            public provider: any;

            constructor(config: MockSignerConfig) {
                this.config = config;
                this.provider = {
                    getNetwork: async () => ({ chainId: BigInt(1), name: 'mainnet' }),
                    getBalance: async () => BigInt('1000000000000000000'),
                };
            }

            async getAddress() {
                if (this.config.shouldFail) {
                    throw new Error(this.config.errorMessage);
                }
                return this.config.address;
            }

            async signMessage(message: string) {
                if (this.config.shouldFail) {
                    throw new Error(this.config.errorMessage);
                }
                return this.config.signature;
            }

            async signTransaction(transaction: any) {
                if (this.config.shouldFail) {
                    throw new Error(this.config.errorMessage);
                }
                return this.config.signature;
            }

            async signTypedData(domain: any, types: any, value: any) {
                if (this.config.shouldFail) {
                    throw new Error(this.config.errorMessage);
                }
                return this.config.signature;
            }

            async connect(provider: any) {
                return this;
            }

            async getNonce(blockTag?: any) {
                return 0;
            }

            async getBalance(blockTag?: any) {
                return BigInt('1000000000000000000');
            }

            async getChainId() {
                return 1;
            }

            async isContract(address: string) {
                return false;
            }

            async estimateGas(transaction: any) {
                return BigInt(21000);
            }

            async call(transaction: any, blockTag?: any) {
                return '0x';
            }

            async sendTransaction(transaction: any) {
                if (this.config.shouldFail) {
                    throw new Error(this.config.errorMessage);
                }
                return {
                    hash: '0x1234567890abcdef',
                    wait: async () => ({
                        hash: '0x1234567890abcdef',
                        blockNumber: 12345,
                        confirmations: 1,
                    }),
                };
            }

            async populateTransaction(transaction: any) {
                return {
                    to: transaction.to,
                    data: transaction.data || '0x',
                    value: transaction.value || BigInt(0),
                    gasLimit: BigInt(21000),
                };
            }

            async checkTransaction(transaction: any) {
                return transaction;
            }

            async resolveName(name: string) {
                return null;
            }

            async lookupAddress(address: string) {
                return null;
            }
        }

        // Contractクラスのモック
        (window as any).ethers.Contract = class MockContract {
            public address: string;
            public abi: any;
            public signer: any;

            constructor(address: string, abi: any, signer: any) {
                this.address = address;
                this.abi = abi;
                this.signer = signer;
            }

            async getPolls() {
                return [
                    [BigInt(1), BigInt(2), BigInt(3)],
                    [BigInt(0), BigInt(1), BigInt(2)],
                    ['0x123', '0x456', '0x789'],
                    ['Poll 1', 'Poll 2', 'Poll 3'],
                ];
            }

            async getPoll(pollId: number) {
                return [
                    BigInt(pollId),
                    BigInt(0),
                    '0x123',
                    'Test Poll',
                    BigInt(1234567890),
                    BigInt(1234567890 + 86400),
                    ['Option 1', 'Option 2'],
                    [BigInt(10), BigInt(5)],
                ];
            }

            on(event: string, callback: Function) {
                return this;
            }

            off(event: string, callback: Function) {
                return this;
            }

            removeAllListeners(event?: string) {
                return this;
            }
        };

        // その他のethers.js v6のユーティリティ
        if (!(window as any).ethers.parseEther) {
            (window as any).ethers.parseEther = (value: string) => BigInt(value) * BigInt(10 ** 18);
        }

        if (!(window as any).ethers.formatEther) {
            (window as any).ethers.formatEther = (value: bigint) =>
                (Number(value) / 10 ** 18).toString();
        }

        if (!(window as any).ethers.parseUnits) {
            (window as any).ethers.parseUnits = (value: string, unit: string) => {
                const decimals =
                    unit === 'wei' ? 0 : unit === 'kwei' ? 3 : unit === 'mwei' ? 6 : 18;
                return BigInt(value) * BigInt(10 ** decimals);
            };
        }

        if (!(window as any).ethers.formatUnits) {
            (window as any).ethers.formatUnits = (value: bigint, unit: string) => {
                const decimals =
                    unit === 'wei' ? 0 : unit === 'kwei' ? 3 : unit === 'mwei' ? 6 : 18;
                return (Number(value) / 10 ** decimals).toString();
            };
        }
    }, config);
}

/**
 * ウォレット接続の成功をシミュレートする
 * @param page Playwrightのpageオブジェクト
 */
export async function mockSuccessfulWalletConnection(page: any) {
    await setupEthereumMock(page, {
        accounts: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'],
        signature: '0x1234567890abcdef',
    });
    await setupEthersMock(page, {
        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        signature: '0x1234567890abcdef',
    });
}

/**
 * ウォレット接続の失敗をシミュレートする
 * @param page Playwrightのpageオブジェクト
 * @param errorMessage エラーメッセージ
 */
export async function mockFailedWalletConnection(page: any, errorMessage = 'Connection failed') {
    await setupEthereumMock(page, {
        shouldFail: true,
        errorMessage,
    });
    await setupEthersMock(page, {
        shouldFail: true,
        errorMessage,
    });
}

/**
 * MetaMaskが存在しない状態をシミュレートする
 * @param page Playwrightのpageオブジェクト
 */
export async function mockNoWallet(page: any) {
    await page.addInitScript(() => {
        window.ethereum = undefined;
    });
}

/**
 * 特定のネットワークに接続された状態をシミュレートする
 * @param page Playwrightのpageオブジェクト
 * @param chainId チェーンID
 * @param networkName ネットワーク名
 */
export async function mockNetworkConnection(
    page: any,
    chainId: string = '0x1',
    networkName: string = 'mainnet'
) {
    await setupEthereumMock(page, {
        accounts: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'],
        signature: '0x1234567890abcdef',
        chainId,
        networkVersion: parseInt(chainId, 16).toString(),
    });
}

/**
 * 複数のアカウントを持つ状態をシミュレートする
 * @param page Playwrightのpageオブジェクト
 * @param accounts アカウントアドレスの配列
 */
export async function mockMultipleAccounts(
    page: any,
    accounts: string[] = [
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    ]
) {
    await setupEthereumMock(page, {
        accounts,
        signature: '0x1234567890abcdef',
    });
}

/**
 * 署名の失敗をシミュレートする
 * @param page Playwrightのpageオブジェクト
 * @param errorMessage エラーメッセージ
 */
export async function mockSignatureFailure(page: any, errorMessage = 'User rejected signature') {
    await setupEthersMock(page, {
        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        shouldFail: true,
        errorMessage,
    });
}

/**
 * ネットワーク切り替えの失敗をシミュレートする
 * @param page Playwrightのpageオブジェクト
 * @param errorMessage エラーメッセージ
 */
export async function mockNetworkSwitchFailure(
    page: any,
    errorMessage = 'User rejected network switch'
) {
    await page.addInitScript((errorMessage: string) => {
        if (window.ethereum) {
            const originalRequest = window.ethereum.request;
            window.ethereum.request = async (args: any) => {
                if (args.method === 'wallet_switchEthereumChain') {
                    throw new Error(errorMessage);
                }
                return originalRequest(args);
            };
        }
    }, errorMessage);
}

/**
 * 遅延のあるウォレット接続をシミュレートする
 * @param page Playwrightのpageオブジェクト
 * @param delayMs 遅延時間（ミリ秒）
 */
export async function mockSlowWalletConnection(page: any, delayMs: number = 2000) {
    await page.addInitScript((delay: number) => {
        if (window.ethereum) {
            const originalRequest = window.ethereum.request;
            window.ethereum.request = async (args: any) => {
                await new Promise((resolve) => setTimeout(resolve, delay));
                return originalRequest(args);
            };
        }
    }, delayMs);
}

/**
 * 投票データのモックを設定する（レガシー関数 - contract-mock.tsを使用することを推奨）
 * @param page Playwrightのpageオブジェクト
 * @param pollData 投票データの配列
 * @deprecated contract-mock.tsのmockPolls()を使用してください
 */
export async function mockPollData(page: any, pollData: any[] = []) {
    console.warn('mockPollData is deprecated. Use contract-mock.ts mockPolls() instead.');
    await setupEthereumMock(page, {
        accounts: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'],
        signature: '0x1234567890abcdef',
        contractData: pollData.length > 0 ? '0x' + '0'.repeat(64 * pollData.length) : '0x',
    });
}

/**
 * 大量の投票データをモックする（レガシー関数 - contract-mock.tsを使用することを推奨）
 * @param page Playwrightのpageオブジェクト
 * @param count データ件数
 * @deprecated contract-mock.tsのmockLargePolls()を使用してください
 */
export async function mockLargePollData(page: any, count: number = 100) {
    console.warn('mockLargePollData is deprecated. Use contract-mock.ts mockLargePolls() instead.');
    await mockPollData(page, Array(count).fill({}));
}
