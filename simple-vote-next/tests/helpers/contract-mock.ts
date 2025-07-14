/**
 * スマートコントラクトのモック機能
 * PollRegistryコントラクトの呼び出しをシミュレートするためのヘルパー
 * ethers.js v6対応版
 */

export interface MockPollData {
    id: number;
    type: 'dynamic' | 'weighted' | 'simple';
    owner: string;
    topic: string;
    startTime: number;
    endTime: number;
    choices: Array<{
        name: string;
        votes: number;
    }>;
}

export interface ContractMockConfig {
    polls?: MockPollData[];
    shouldFail?: boolean;
    errorMessage?: string;
}

/**
 * ethers.js v6のContractクラスをモックする
 * @param page Playwrightのpageオブジェクト
 * @param config モック設定
 */
export async function setupContractMock(page: any, config: ContractMockConfig = {}) {
    const { polls = [], shouldFail = false, errorMessage = 'Contract call failed' } = config;

    await page.addInitScript((config: ContractMockConfig) => {
        // ethers.js v6の構造に合わせたモック
        if (!(window as any).ethers) {
            (window as any).ethers = {};
        }

        // Contractクラスをモック（既存のモックがある場合は上書き）
        (window as any).ethers.Contract = class MockContract {
            public address: string;
            public abi: any;
            public signer: any;
            private _polls: MockPollData[];
            private _shouldFail: boolean;
            private _errorMessage: string;

            constructor(address: string, abi: any, signer: any) {
                this.address = address;
                this.abi = abi;
                this.signer = signer;
                this._polls = config.polls || [];
                this._shouldFail = config.shouldFail || false;
                this._errorMessage = config.errorMessage || 'Contract call failed';
            }

            async getPolls() {
                if (this._shouldFail) {
                    throw new Error(this._errorMessage);
                }

                const pollIds = this._polls.map((p) => BigInt(p.id));
                const pollTypes = this._polls.map((p) => {
                    switch (p.type) {
                        case 'dynamic':
                            return 0n;
                        case 'weighted':
                            return 1n;
                        case 'simple':
                            return 2n;
                        default:
                            return 0n;
                    }
                });
                const owners = this._polls.map((p) => p.owner);
                const topics = this._polls.map((p) => p.topic);

                return [pollIds, pollTypes, owners, topics];
            }

            async getPoll(pollId: number) {
                if (this._shouldFail) {
                    throw new Error(this._errorMessage);
                }

                const poll = this._polls.find((p) => p.id === pollId);
                if (!poll) {
                    throw new Error('Poll not found');
                }

                return [
                    pollId, // pollId
                    poll.type === 'dynamic' ? 0n : poll.type === 'weighted' ? 1n : 2n, // pollType
                    poll.owner, // owner
                    poll.topic, // topic
                    BigInt(poll.startTime), // startTime
                    BigInt(poll.endTime), // endTime
                    poll.choices.map((c) => c.name), // choiceNames
                    poll.choices.map((c) => BigInt(c.votes)), // voteCounts
                ];
            }

            on(event: string, callback: Function) {
                // イベントリスナーのモック
                // ethers.js v6ではイベントリスナーは自動的に管理される
                return this;
            }

            off(event: string, callback: Function) {
                // イベントリスナーの削除モック
                return this;
            }

            // ethers.js v6の追加メソッド
            removeAllListeners(event?: string) {
                return this;
            }

            listenerCount(event: string) {
                return 0;
            }

            listeners(event: string) {
                return [];
            }

            // プロバイダー関連のメソッド
            get provider() {
                return this.signer?.provider || null;
            }

            get interface() {
                return {
                    parseLog: () => ({}),
                    parseTransaction: () => ({}),
                    encodeFunctionData: () => '0x',
                    decodeFunctionResult: () => [],
                };
            }
        };

        // ethers.js v6の他のクラスもモック（既存のモックがある場合は上書きしない）
        if (!(window as any).ethers.BrowserProvider) {
            (window as any).ethers.BrowserProvider = class MockBrowserProvider {
                public ethereum: any;

                constructor(ethereum: any) {
                    this.ethereum = ethereum;
                }

                async getSigner() {
                    return {
                        getAddress: async () => '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                        signMessage: async () => '0x1234567890abcdef',
                        provider: this,
                    };
                }

                async send(method: string, params: any[]) {
                    switch (method) {
                        case 'eth_requestAccounts':
                            return ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'];
                        case 'eth_call':
                            // コントラクト呼び出しのモック
                            return '0x';
                        default:
                            return null;
                    }
                }
            };
        }

        // JsonRpcProviderのモック（既存のモックがある場合は上書きしない）
        if (!(window as any).ethers.JsonRpcProvider) {
            (window as any).ethers.JsonRpcProvider = class MockJsonRpcProvider {
                public url: string;

                constructor(url: string) {
                    this.url = url;
                }

                async getSigner() {
                    return {
                        getAddress: async () => '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                        signMessage: async () => '0x1234567890abcdef',
                        provider: this,
                    };
                }
            };
        }

        // その他のethers.js v6のユーティリティ（既存のモックがある場合は上書きしない）
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
 * 空の投票データをモックする
 * @param page Playwrightのpageオブジェクト
 */
export async function mockEmptyPolls(page: any) {
    await setupContractMock(page, { polls: [] });
}

/**
 * テスト用の投票データをモックする
 * @param page Playwrightのpageオブジェクト
 * @param polls 投票データの配列
 */
export async function mockPolls(page: any, polls: MockPollData[]) {
    await setupContractMock(page, { polls });
}

/**
 * デフォルトのテスト投票データをモックする
 * @param page Playwrightのpageオブジェクト
 */
export async function mockDefaultPolls(page: any) {
    const defaultPolls: MockPollData[] = [
        {
            id: 1,
            type: 'dynamic',
            owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            topic: 'テスト投票1',
            startTime: Math.floor(Date.now() / 1000),
            endTime: Math.floor(Date.now() / 1000) + 86400,
            choices: [
                { name: '選択肢1', votes: 5 },
                { name: '選択肢2', votes: 3 },
            ],
        },
        {
            id: 2,
            type: 'weighted',
            owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            topic: 'テスト投票2',
            startTime: Math.floor(Date.now() / 1000),
            endTime: Math.floor(Date.now() / 1000) + 86400,
            choices: [
                { name: '選択肢A', votes: 10 },
                { name: '選択肢B', votes: 7 },
            ],
        },
        {
            id: 3,
            type: 'simple',
            owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            topic: 'テスト投票3',
            startTime: Math.floor(Date.now() / 1000),
            endTime: Math.floor(Date.now() / 1000) + 86400,
            choices: [
                { name: 'はい', votes: 15 },
                { name: 'いいえ', votes: 8 },
            ],
        },
    ];

    await mockPolls(page, defaultPolls);
}

/**
 * 大量の投票データをモックする
 * @param page Playwrightのpageオブジェクト
 * @param count データ件数
 */
export async function mockLargePolls(page: any, count: number = 100) {
    const polls: MockPollData[] = Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        type: ['dynamic', 'weighted', 'simple'][i % 3] as 'dynamic' | 'weighted' | 'simple',
        owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        topic: `テスト投票${i + 1}`,
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 86400,
        choices: [
            { name: `選択肢1-${i + 1}`, votes: Math.floor(Math.random() * 10) + 1 },
            { name: `選択肢2-${i + 1}`, votes: Math.floor(Math.random() * 10) + 1 },
        ],
    }));

    await mockPolls(page, polls);
}

/**
 * コントラクトエラーをモックする
 * @param page Playwrightのpageオブジェクト
 * @param errorMessage エラーメッセージ
 */
export async function mockContractError(page: any, errorMessage = 'Contract call failed') {
    await setupContractMock(page, { shouldFail: true, errorMessage });
}

/**
 * 特定の投票タイプのみをモックする
 * @param page Playwrightのpageオブジェクト
 * @param type 投票タイプ
 * @param count データ件数
 */
export async function mockPollsByType(
    page: any,
    type: 'dynamic' | 'weighted' | 'simple',
    count: number = 5
) {
    const polls: MockPollData[] = Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        type: type,
        owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        topic: `${type}投票${i + 1}`,
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 86400,
        choices: [
            { name: `選択肢1-${i + 1}`, votes: Math.floor(Math.random() * 10) + 1 },
            { name: `選択肢2-${i + 1}`, votes: Math.floor(Math.random() * 10) + 1 },
        ],
    }));

    await mockPolls(page, polls);
}

/**
 * ネットワークエラーをシミュレートする
 * @param page Playwrightのpageオブジェクト
 */
export async function mockNetworkError(page: any) {
    await page.addInitScript(() => {
        // ネットワークリクエストを失敗させる
        const originalFetch = window.fetch;
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            if (typeof input === 'string' && input.includes('eth_call')) {
                throw new Error('Network error');
            }
            return originalFetch(input, init);
        };
    });
}

/**
 * 遅延をシミュレートする
 * @param page Playwrightのpageオブジェクト
 * @param delayMs 遅延時間（ミリ秒）
 */
export async function mockSlowNetwork(page: any, delayMs: number = 2000) {
    await page.addInitScript((delay: number) => {
        const originalFetch = window.fetch;
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            if (typeof input === 'string' && input.includes('eth_call')) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
            return originalFetch(input, init);
        };
    }, delayMs);
}
