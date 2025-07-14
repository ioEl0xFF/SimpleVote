/**
 * ホームページテスト用のテストデータ
 * 各種テストケースで使用する投票データを定義
 */

export interface PollTestData {
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

/**
 * デフォルトの投票データ（3つの投票）
 */
export const defaultPolls: PollTestData[] = [
    {
        id: 1,
        type: 'dynamic',
        owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        topic: 'プロジェクトの方向性について',
        startTime: Date.now() - 86400000, // 1日前
        endTime: Date.now() + 86400000, // 1日後
        choices: [
            { name: 'オプションA', votes: 5 },
            { name: 'オプションB', votes: 3 },
        ],
    },
    {
        id: 2,
        type: 'weighted',
        owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        topic: '技術スタックの選択',
        startTime: Date.now() - 86400000,
        endTime: Date.now() + 86400000,
        choices: [
            { name: 'React', votes: 8 },
            { name: 'Vue', votes: 2 },
            { name: 'Angular', votes: 1 },
        ],
    },
    {
        id: 3,
        type: 'simple',
        owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        topic: 'チームリーダーの選出',
        startTime: Date.now() - 86400000,
        endTime: Date.now() + 86400000,
        choices: [
            { name: '田中さん', votes: 7 },
            { name: '佐藤さん', votes: 4 },
        ],
    },
];

/**
 * 空の投票データ
 */
export const emptyPolls: PollTestData[] = [];

/**
 * 大量の投票データ（パフォーマンステスト用）
 */
export const largePolls: PollTestData[] = Array.from({ length: 50 }, (_, index) => ({
    id: index + 1,
    type: ['dynamic', 'weighted', 'simple'][index % 3] as 'dynamic' | 'weighted' | 'simple',
    owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    topic: `テスト投票 ${index + 1}`,
    startTime: Date.now() - 86400000,
    endTime: Date.now() + 86400000,
    choices: [
        { name: `選択肢A-${index + 1}`, votes: Math.floor(Math.random() * 10) },
        { name: `選択肢B-${index + 1}`, votes: Math.floor(Math.random() * 10) },
    ],
}));

/**
 * 特定タイプの投票データ
 */
export const getPollsByType = (
    type: 'dynamic' | 'weighted' | 'simple',
    count: number = 5
): PollTestData[] => {
    return Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        type,
        owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        topic: `${type}投票 ${index + 1}`,
        startTime: Date.now() - 86400000,
        endTime: Date.now() + 86400000,
        choices: [
            { name: `選択肢A-${index + 1}`, votes: Math.floor(Math.random() * 10) },
            { name: `選択肢B-${index + 1}`, votes: Math.floor(Math.random() * 10) },
        ],
    }));
};

/**
 * 期限切れの投票データ
 */
export const expiredPolls: PollTestData[] = [
    {
        id: 1,
        type: 'simple',
        owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        topic: '期限切れの投票',
        startTime: Date.now() - 172800000, // 2日前
        endTime: Date.now() - 86400000, // 1日前（期限切れ）
        choices: [
            { name: '選択肢A', votes: 5 },
            { name: '選択肢B', votes: 3 },
        ],
    },
];

/**
 * 長いタイトルの投票データ（UI表示テスト用）
 */
export const longTitlePolls: PollTestData[] = [
    {
        id: 1,
        type: 'simple',
        owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        topic: 'これは非常に長い投票タイトルで、UIの表示が正しく行われるかをテストするためのものです。文字数制限や改行処理が適切に動作するか確認します。',
        startTime: Date.now() - 86400000,
        endTime: Date.now() + 86400000,
        choices: [
            { name: '選択肢A', votes: 5 },
            { name: '選択肢B', votes: 3 },
        ],
    },
];
