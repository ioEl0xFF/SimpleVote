/**
 * 統合ethersモック設定 (Phase 3: Contract呼び出しインターセプト戦略)
 * webpackレベルでethersモジュールを完全にモック + Contract呼び出しインターセプト
 * 実際のNext.jsアプリ内でのContract呼び出しを直接インターセプト
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

export interface UnifiedMockConfig {
    polls?: MockPollData[];
    walletAddress?: string;
    shouldFail?: boolean;
    errorMessage?: string;
}

/**
 * 統合ethersモックを設定する (Phase 3強化版)
 * @param page Playwrightのpageオブジェクト
 * @param config モック設定
 */
export async function setupUnifiedEthersMock(page: any, config: UnifiedMockConfig = {}) {
    const {
        polls = [],
        walletAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        shouldFail = false,
        errorMessage = 'Mock error',
    } = config;

    await page.addInitScript((config: UnifiedMockConfig) => {
        console.log('Phase 3 unified ethers mock initialization starting...');
        console.log('Config:', {
            pollsCount: config.polls?.length || 0,
            walletAddress: config.walletAddress,
            shouldFail: config.shouldFail,
        });

        // Phase 3: Contract呼び出しインターセプト戦略
        let mockDataStore = {
            polls: config.polls || [],
            walletAddress: config.walletAddress,
            shouldFail: config.shouldFail,
            errorMessage: config.errorMessage,
        };

        // 統合されたBrowserProviderクラス (Phase 3強化版)
        class MockBrowserProvider {
            public ethereum: any;

            constructor(ethereum: any) {
                this.ethereum = ethereum;
                console.log('MockBrowserProvider initialized (Phase 3)');
            }

            async getSigner() {
                console.log('MockBrowserProvider.getSigner() called');
                return new MockSigner(config);
            }

            async getBlockNumber() {
                console.log('MockBrowserProvider.getBlockNumber() called');
                const blockNumber = 12345678;
                console.log('Returning block number:', blockNumber);
                return Promise.resolve(blockNumber);
            }

            async call(transaction: any) {
                console.log('MockBrowserProvider.call() called with:', transaction);

                if (config.shouldFail) {
                    throw new Error(config.errorMessage);
                }

                // Phase 3: より詳細なContract呼び出し分析
                if (!transaction || !transaction.data) {
                    const defaultResult =
                        '0x0000000000000000000000000000000000000000000000000000000000000000';
                    console.log('No transaction data, returning default:', defaultResult);
                    return defaultResult;
                }

                console.log('Transaction data:', transaction.data);

                // getPolls呼び出しを検出 (120fe89b = getPolls()のfunction selector)
                if (transaction.data.includes('120fe89b')) {
                    console.log('Detected getPolls() call - returning mock data');
                    const result = this.mockGetPollsResponse();
                    console.log('Returning getPolls response:', result);
                    return result;
                }

                // getPoll呼び出しを検出 (例: a9a2ed4e = getPoll(uint256)のfunction selector)
                if (transaction.data.includes('a9a2ed4e')) {
                    console.log('Detected getPoll() call - returning mock data');
                    const result = this.mockGetPollResponse();
                    console.log('Returning getPoll response:', result);
                    return result;
                }

                const defaultResult =
                    '0x0000000000000000000000000000000000000000000000000000000000000001';
                console.log('Returning default call result:', defaultResult);
                return defaultResult;
            }

            mockGetPollsResponse() {
                if (!mockDataStore.polls || mockDataStore.polls.length === 0) {
                    // 空の配列の場合のABIエンコード結果
                    console.log('Returning empty polls response');
                    return '0x00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
                }

                // デバッグ: 1つの投票データでテスト
                // 最終的解決策: ethers.jsのAbiCoderを使用
                console.log('Returning mock data for', mockDataStore.polls.length, 'polls');
                console.log('FINAL SOLUTION: Using ethers AbiCoder');

                // ethers.jsの標準AbiCoderで正確なエンコーディング
                try {
                    const pollIds = mockDataStore.polls.map((p) => BigInt(p.id));
                    const pollTypes = mockDataStore.polls.map((p) => this.getTypeNumber(p.type));
                    const owners = mockDataStore.polls.map((p) => p.owner);
                    const topics = mockDataStore.polls.map((p) => p.topic);

                    // ethers.js v6の正しいAbiCoder初期化方法を使用
                    const ethers = (window as any).ethers;
                    if (ethers && ethers.AbiCoder && ethers.AbiCoder.defaultAbiCoder) {
                        const abiCoder = ethers.AbiCoder.defaultAbiCoder();
                        const result = abiCoder.encode(
                            ['uint256[]', 'uint8[]', 'address[]', 'string[]'],
                            [pollIds, pollTypes, owners, topics]
                        );
                        console.log('AbiCoder result:', result);
                        return result;
                    } else {
                        console.log('AbiCoder not available, falling back to manual encoding');
                        throw new Error('AbiCoder not available');
                    }
                } catch (e) {
                    console.log('AbiCoder fallback to manual encoding:', e);
                    const singlePoll = mockDataStore.polls.slice(0, 1);
                    return this.encodeGetPollsResponse(singlePoll);
                }
            }

            encodeGetPollsResponse(polls: any[]): string {
                // ethers.js v6対応の正確なABIエンコーディング
                // 戻り値: (uint256[] pollIds, PollType[] pollTypes, address[] owners, string[] topics)

                console.log('Encoding ABI response for', polls.length, 'polls:', polls);

                if (polls.length === 0) {
                    // 空の配列の場合
                    return '0x00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
                }

                // 動的な投票データエンコーディング
                const pollIds = polls.map((p) => p.id);
                const pollTypes = polls.map((p) => this.getTypeNumber(p.type));
                const owners = polls.map((p) => p.owner);
                const topics = polls.map((p) => p.topic);
                const count = polls.length;

                console.log('Encoding', count, 'polls with IDs:', pollIds);

                // ブラウザ互換のUTF-8エンコーディング関数
                function encodeStringToHex(str: string): { length: string; data: string } {
                    const encoder = new TextEncoder();
                    const bytes = encoder.encode(str);
                    const length = bytes.length.toString(16).padStart(64, '0');
                    const data = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
                        .join('')
                        .padEnd(64, '0');
                    return { length, data };
                }

                // ABI仕様: 固定サイズと動的サイズのデータ
                let result = '';

                // 1. Header: 4つの配列のオフセット（動的計算）
                const baseOffset = 128; // 4 * 32 bytes for header
                const pollIdsOffset = baseOffset;
                const pollTypesOffset = pollIdsOffset + 32 + count * 32; // 32 for length + count * 32 for data
                const ownersOffset = pollTypesOffset + 32 + count * 32;
                const topicsOffset = ownersOffset + 32 + count * 32;

                result += pollIdsOffset.toString(16).padStart(64, '0');
                result += pollTypesOffset.toString(16).padStart(64, '0');
                result += ownersOffset.toString(16).padStart(64, '0');
                result += topicsOffset.toString(16).padStart(64, '0');

                // 2. pollIds配列 (uint256[])
                result += count.toString(16).padStart(64, '0'); // length
                for (const id of pollIds) {
                    result += id.toString(16).padStart(64, '0');
                }

                // 3. pollTypes配列 (uint8[])
                result += count.toString(16).padStart(64, '0'); // length
                for (const type of pollTypes) {
                    result += type.toString(16).padStart(64, '0');
                }

                // 4. owners配列 (address[])
                result += count.toString(16).padStart(64, '0'); // length
                for (const owner of owners) {
                    const cleanAddress = owner.replace('0x', '').toLowerCase();
                    result += cleanAddress.padStart(64, '0');
                }

                // 5. topics配列 (string[]) - より簡単な実装
                result += count.toString(16).padStart(64, '0'); // length

                // 各トピックのオフセット（簡易版：固定位置）
                let topicDataOffset = 32 + count * 32; // オフセット領域の後
                for (let i = 0; i < count; i++) {
                    result += topicDataOffset.toString(16).padStart(64, '0');
                    topicDataOffset += 64; // 固定64バイト間隔
                }

                // 各トピックのデータ
                for (const topic of topics) {
                    const encoded = encodeStringToHex(topic);
                    result += encoded.length + encoded.data;
                }

                const finalResult = '0x' + result;
                console.log('Generated ABI encoded response:', finalResult);
                console.log('ABI response length:', finalResult.length, 'characters');
                console.log('ABI response preview:', finalResult.substring(0, 100) + '...');
                return finalResult;
            }

            getTypeNumber(type: string): number {
                // PollType enum: DYNAMIC_VOTE=0, WEIGHTED_VOTE=1, SIMPLE_VOTE=2
                switch (type) {
                    case 'dynamic':
                        return 0;
                    case 'weighted':
                        return 1;
                    case 'simple':
                        return 2;
                    default:
                        return 0;
                }
            }

            mockGetPollResponse() {
                // getPoll()の単一投票レスポンス
                console.log('Returning getPoll mock response');
                return '0x0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000742d35cc6634c0532925a3b8d4c9db96c4b4d8b6000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000065b1e000000000000000000000000000000000000000000000000000000000000065c8a4000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000000b74657374656420706f6c6c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000a63686f696365206f6e6500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a63686f6963652074776f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000003';
            }

            async send(method: string, params: any[]) {
                console.log('MockBrowserProvider.send() called with method:', method);

                if (config.shouldFail) {
                    throw new Error(config.errorMessage);
                }

                // 全てのメソッドで有効な値を保証
                switch (method) {
                    case 'eth_call':
                        console.log('Processing eth_call via send()');
                        return this.call(params[0]);
                    case 'eth_getBlockNumber':
                        const hexBlockNumber = '0xbc614e'; // 12345678 in hex
                        console.log('Returning hex block number:', hexBlockNumber);
                        return hexBlockNumber;
                    case 'eth_requestAccounts':
                        return [config.walletAddress];
                    case 'eth_accounts':
                        return [config.walletAddress];
                    default:
                        console.log('Unknown method, returning null');
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
        }

        // 統合されたSignerクラス
        class MockSigner {
            private config: UnifiedMockConfig;
            public provider: any;

            constructor(config: UnifiedMockConfig) {
                this.config = config;
                this.provider = new MockBrowserProvider(null);
                console.log('MockSigner initialized');
            }

            async getAddress() {
                console.log('MockSigner.getAddress() called');
                if (this.config.shouldFail) {
                    throw new Error(this.config.errorMessage);
                }
                return this.config.walletAddress;
            }

            async signMessage(message: string) {
                if (this.config.shouldFail) {
                    throw new Error(this.config.errorMessage);
                }
                return '0x1234567890abcdef';
            }

            async signTransaction(transaction: any) {
                if (this.config.shouldFail) {
                    throw new Error(this.config.errorMessage);
                }
                return '0x1234567890abcdef';
            }
        }

        // 統合されたContractクラス (Phase 3 超強化版)
        class MockContract {
            public address: string;
            public abi: any;
            public provider: any;
            private _mockData: MockPollData[];
            public getPolls: () => Promise<any>;
            public getPoll: (pollId: number) => Promise<any>;

            constructor(address: string, abi: any, provider: any) {
                this.address = address;
                this.abi = abi;
                this.provider = provider;
                this._mockData = mockDataStore.polls || [];
                console.log(
                    'MockContract initialized (Phase 3) with address:',
                    address,
                    'polls count:',
                    this._mockData.length
                );

                // Phase 3: 実際のContract呼び出しを完全にオーバーライド
                this.setupContractMethods();
            }

            setupContractMethods() {
                console.log('Setting up contract methods with intercepted calls');

                // getPolls メソッドの完全オーバーライド
                this.getPolls = async () => {
                    console.log('MockContract.getPolls() called (Phase 3 - Direct Override)');

                    if (mockDataStore.shouldFail) {
                        console.log(
                            'MockContract.getPolls() failing with error:',
                            mockDataStore.errorMessage
                        );
                        throw new Error(mockDataStore.errorMessage);
                    }

                    // 直接的にモックデータを返す（フロントエンドとの互換性のためnumberを使用）
                    const pollIds = this._mockData.map((p) => p.id); // BigIntではなくnumberを使用
                    const pollTypes = this._mockData.map((p) => this.getTypeNumber(p.type));
                    const owners = this._mockData.map((p) => p.owner);
                    const topics = this._mockData.map((p) => p.topic);

                    const result = [pollIds, pollTypes, owners, topics];
                    console.log('MockContract.getPolls() returning (Phase 3):', {
                        pollIds: pollIds,
                        pollTypes: pollTypes.map((type) => type.toString()),
                        owners,
                        topics,
                    });
                    return result;
                };

                // getPoll メソッドの完全オーバーライド
                this.getPoll = async (pollId: number) => {
                    console.log('MockContract.getPoll() called (Phase 3) with:', pollId);

                    if (mockDataStore.shouldFail) {
                        throw new Error(mockDataStore.errorMessage);
                    }

                    const poll = this._mockData.find((p) => p.id === pollId);
                    if (!poll) {
                        throw new Error('Poll not found');
                    }

                    const result = [
                        pollId,
                        this.getTypeNumber(poll.type),
                        poll.owner,
                        poll.topic,
                        BigInt(poll.startTime),
                        BigInt(poll.endTime),
                        poll.choices.map((c) => c.name),
                        poll.choices.map((c) => BigInt(c.votes)),
                    ];

                    console.log('MockContract.getPoll() returning (Phase 3):', result);
                    return result;
                };
            }

            getTypeNumber(type: string) {
                switch (type) {
                    case 'dynamic':
                        return 0n;
                    case 'weighted':
                        return 1n;
                    case 'simple':
                        return 2n;
                    default:
                        return 0n;
                }
            }

            on(event: string, callback: Function) {
                console.log('MockContract.on() called for event:', event);
                return this;
            }

            off(event: string, callback: Function) {
                console.log('MockContract.off() called for event:', event);
                return this;
            }

            removeAllListeners(event?: string) {
                console.log('MockContract.removeAllListeners() called');
                return this;
            }
        }

        // Phase 3: より強力なモジュールレベル上書き戦略
        const ethersModule = {
            BrowserProvider: MockBrowserProvider,
            Contract: MockContract,
            AbiCoder: {
                defaultAbiCoder: () => ({
                    encode: (types: string[], values: any[]) => {
                        console.log(
                            'Mock AbiCoder.encode() called with types:',
                            types,
                            'values:',
                            values
                        );
                        // 簡易的なABIエンコーディング（テスト用）
                        const encoded = values
                            .map((val, idx) => {
                                if (types[idx].includes('[]')) {
                                    // 配列の場合
                                    if (Array.isArray(val)) {
                                        return val
                                            .map((v) =>
                                                typeof v === 'bigint'
                                                    ? v.toString(16).padStart(64, '0')
                                                    : typeof v === 'string'
                                                    ? Buffer.from(v, 'utf8')
                                                          .toString('hex')
                                                          .padStart(64, '0')
                                                    : v.toString(16).padStart(64, '0')
                                            )
                                            .join('');
                                    }
                                }
                                return typeof val === 'bigint'
                                    ? val.toString(16).padStart(64, '0')
                                    : typeof val === 'string'
                                    ? Buffer.from(val, 'utf8').toString('hex').padStart(64, '0')
                                    : val.toString(16).padStart(64, '0');
                            })
                            .join('');
                        return '0x' + encoded;
                    },
                    decode: (types: string[], data: string) => {
                        console.log(
                            'Mock AbiCoder.decode() called with types:',
                            types,
                            'data:',
                            data
                        );
                        // デコーディング実装（必要に応じて実装）
                        return [];
                    },
                }),
            },
            parseEther: (value: string) => BigInt(value) * BigInt(10 ** 18),
            formatEther: (value: bigint) => (Number(value) / 10 ** 18).toString(),
            parseUnits: (value: string, unit: string) => {
                const decimals =
                    unit === 'wei' ? 0 : unit === 'kwei' ? 3 : unit === 'mwei' ? 6 : 18;
                return BigInt(value) * BigInt(10 ** decimals);
            },
            formatUnits: (value: bigint, unit: string) => {
                const decimals =
                    unit === 'wei' ? 0 : unit === 'kwei' ? 3 : unit === 'mwei' ? 6 : 18;
                return (Number(value) / 10 ** decimals).toString();
            },
        };

        // 1. window.ethersに統合モックを設定
        (window as any).ethers = ethersModule;

        // 2. グローバルスコープでのethers設定
        (globalThis as any).ethers = ethersModule;

        // 3. より強力なグローバル上書き - すべての可能な参照を上書き
        Object.defineProperty(window, 'ethers', {
            value: ethersModule,
            writable: true,
            configurable: true,
            enumerable: true,
        });

        Object.defineProperty(globalThis, 'ethers', {
            value: ethersModule,
            writable: true,
            configurable: true,
            enumerable: true,
        });

        // 4. プロトタイプチェーンレベルでの強制設定
        if (typeof global !== 'undefined') {
            (global as any).ethers = ethersModule;
        }

        // Phase 3: ページレベルでのfetch/network呼び出しインターセプト
        const originalFetch = window.fetch;
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            console.log('Fetch intercepted:', input);

            // JSON-RPC呼び出しの検出
            if (
                typeof input === 'string' &&
                (input.includes('localhost') || input.includes('127.0.0.1'))
            ) {
                console.log('Local RPC call detected, checking for eth_call...');

                if (init && init.body) {
                    try {
                        const body = JSON.parse(init.body as string);
                        if (body.method === 'eth_call') {
                            console.log('eth_call intercepted via fetch:', body);

                            const transaction = body.params[0];
                            if (
                                transaction &&
                                transaction.data &&
                                transaction.data.includes('bb6e4e71')
                            ) {
                                console.log(
                                    'getPolls() detected in fetch - returning mock response'
                                );

                                const mockProvider = new MockBrowserProvider(null);
                                const result = await mockProvider.call(transaction);

                                return Promise.resolve(
                                    new Response(
                                        JSON.stringify({
                                            jsonrpc: '2.0',
                                            id: body.id,
                                            result: result,
                                        }),
                                        {
                                            status: 200,
                                            headers: { 'Content-Type': 'application/json' },
                                        }
                                    )
                                );
                            }
                        }
                    } catch (e) {
                        console.log('Failed to parse fetch body:', e);
                    }
                }
            }

            return originalFetch(input, init);
        };

        // 3. webpackモジュールシステムへの深層介入 (継続)
        const originalDefine = Object.defineProperty;
        Object.defineProperty = function (obj: any, prop: string, descriptor: PropertyDescriptor) {
            if (prop === 'ethers' || (typeof prop === 'string' && prop.includes('ethers'))) {
                console.log('Intercepting ethers property definition:', prop);
                // accessor descriptor と data descriptor の競合を避ける
                const newDescriptor: PropertyDescriptor = {
                    value: ethersModule,
                    writable: true,
                    configurable: true,
                    enumerable: true,
                };
                return originalDefine.call(this, obj, prop, newDescriptor);
            }
            return originalDefine.call(this, obj, prop, descriptor);
        };

        // 4. モジュール読み込み完了後の強制上書き (継続)
        const checkAndOverride = () => {
            let attempts = 0;
            const maxAttempts = 50;

            const override = () => {
                attempts++;
                console.log(`Phase 3 Ethers override attempt ${attempts}/${maxAttempts}`);

                // window.ethersの確認と上書き
                if ((window as any).ethers && (window as any).ethers !== ethersModule) {
                    console.log('Found different ethers in window, overriding...');
                    (window as any).ethers = ethersModule;
                }

                // requireモジュールキャッシュの上書き試行
                if (typeof require !== 'undefined' && (require as any).cache) {
                    console.log('Attempting to override require cache...');
                    const cache = (require as any).cache;
                    for (const key in cache) {
                        if (key.includes('ethers') && cache[key] && cache[key].exports) {
                            console.log('Overriding ethers in require cache:', key);
                            cache[key].exports = ethersModule;
                        }
                    }
                }

                // webpack require の上書き試行 (強化版)
                if ((window as any).__webpack_require__) {
                    console.log('Webpack environment detected, attempting deeper override...');
                    const webpackRequire = (window as any).__webpack_require__;

                    if (webpackRequire.cache) {
                        const modules = webpackRequire.cache;
                        for (const key in modules) {
                            if (key.includes('ethers') && modules[key] && modules[key].exports) {
                                console.log('Overriding ethers in webpack module:', key);

                                // 完全な置き換え
                                modules[key].exports = ethersModule;

                                // 個別エクスポートも置き換え
                                if (modules[key].exports.ethers) {
                                    modules[key].exports.ethers = ethersModule;
                                }
                                if (modules[key].exports.Contract) {
                                    modules[key].exports.Contract = MockContract;
                                }
                                if (modules[key].exports.BrowserProvider) {
                                    modules[key].exports.BrowserProvider = MockBrowserProvider;
                                }

                                // デフォルトエクスポートも置き換え
                                if (modules[key].exports.default) {
                                    modules[key].exports.default = ethersModule;
                                }
                            }
                        }
                    }

                    // webpackRequire自体も拡張
                    const originalRequire = webpackRequire;
                    (window as any).__webpack_require__ = function (moduleId: any) {
                        const result = originalRequire(moduleId);
                        if (typeof moduleId === 'string' && moduleId.includes('ethers')) {
                            console.log(
                                'Intercepting webpack require for ethers module:',
                                moduleId
                            );
                            return ethersModule;
                        }
                        return result;
                    };
                }

                if (attempts < maxAttempts) {
                    setTimeout(override, 100);
                } else {
                    console.log('Phase 3 Ethers override attempts completed');
                }
            };

            override();
        };

        // 5. window.ethereumも設定
        (window as any).ethereum = {
            isMetaMask: true,
            isConnected: () => true,
            chainId: '0x1',
            networkVersion: '1',
            selectedAddress: config.walletAddress || null,

            request: async (args: any) => {
                console.log('window.ethereum.request() called with:', args);

                if (config.shouldFail) {
                    throw new Error(config.errorMessage);
                }

                switch (args.method) {
                    case 'eth_requestAccounts':
                        return [config.walletAddress];
                    case 'eth_accounts':
                        return [config.walletAddress];
                    case 'personal_sign':
                        return '0x1234567890abcdef';
                    case 'eth_sign':
                        return '0x1234567890abcdef';
                    case 'eth_getBalance':
                        return '0x1000000000000000000'; // 1 ETH
                    case 'eth_chainId':
                        return '0x1';
                    case 'net_version':
                        return '1';
                    case 'eth_blockNumber':
                        return '0xbc614e'; // 12345678 in hex
                    case 'eth_call':
                        console.log('eth_call via ethereum.request:', args.params);
                        const mockProvider = new MockBrowserProvider(null);
                        return await mockProvider.call(args.params[0]);
                    default:
                        return null;
                }
            },

            on: (eventName: string, listener: Function) => {
                // イベントリスナーの登録をモック
            },
            removeListener: (eventName: string, listener: Function) => {
                // イベントリスナーの削除をモック
            },
            removeAllListeners: (eventName?: string) => {
                // すべてのイベントリスナーの削除をモック
            },

            enable: async () => {
                if (config.shouldFail) {
                    throw new Error(config.errorMessage);
                }
                return [config.walletAddress];
            },
        };

        // 6. Constructor レベルでの完全インターセプト
        const originalObjectCreate = Object.create;
        Object.create = function (proto: any, descriptors?: any) {
            const result = originalObjectCreate.call(this, proto, descriptors);
            if (proto && proto.constructor && proto.constructor.name === 'Contract') {
                console.log('Object.create intercepted for Contract');
                return new MockContract('', [], null);
            }
            return result;
        };

        // 7. Function.prototype.bind インターセプト
        const originalBind = Function.prototype.bind;
        Function.prototype.bind = function (thisArg: any, ...args: any[]) {
            if (
                this.name === 'Contract' ||
                (this.constructor && this.constructor.name === 'Contract')
            ) {
                console.log('Function.bind intercepted for Contract');
                return MockContract.bind(thisArg, ...args);
            }
            return originalBind.call(this, thisArg, ...args);
        };

        // 8. DOMContentLoaded後とタイマーでの強制上書き
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkAndOverride);
        } else {
            checkAndOverride();
        }

        // 9. より直接的なコンストラクタ上書き - 最後の手段
        setTimeout(() => {
            console.log('Final constructor override attempt...');

            // すべてのグローバル参照を強制上書き
            ['window', 'globalThis', 'global', 'self'].forEach((globalName) => {
                try {
                    const globalObj = eval(globalName);
                    if (globalObj && globalObj.ethers) {
                        globalObj.ethers.Contract = MockContract;
                        console.log(`Successfully overrode ethers.Contract in ${globalName}`);
                    }
                } catch (e) {
                    // グローバルオブジェクトが存在しない場合は無視
                }
            });
        }, 1000); // 1秒後に実行

        console.log('Phase 3 unified ethers mock setup completed');
    }, config);
}

/**
 * デフォルトのテスト投票データ
 */
export const defaultPolls: MockPollData[] = [
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

/**
 * 統合モックでデフォルト投票データを設定
 */
export async function setupDefaultPolls(page: any) {
    await setupUnifiedEthersMock(page, {
        polls: defaultPolls,
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    });
}

/**
 * 統合モックで空の投票データを設定
 */
export async function setupEmptyPolls(page: any) {
    await setupUnifiedEthersMock(page, {
        polls: [],
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    });
}

/**
 * 統合モックでエラー状態を設定
 */
export async function setupMockError(page: any, errorMessage = 'Contract call failed') {
    await setupUnifiedEthersMock(page, {
        polls: [],
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        shouldFail: true,
        errorMessage,
    });
}
