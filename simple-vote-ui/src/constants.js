// Hardhat artifacts から ABI をコピペ
export const SIMPLE_VOTE_ABI = [
    {
        inputs: [{ internalType: 'string', name: '_topic', type: 'string' }],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [],
        name: 'getVotes',
        outputs: [
            { internalType: 'uint256', name: '', type: 'uint256' },
            { internalType: 'uint256', name: '', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'topic',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'bool', name: '_voteForA', type: 'bool' }],
        name: 'vote',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
];

// デプロイ時に表示されたアドレスを貼る
export const SIMPLE_VOTE_ADDRESS = '0x64B218549cc553756fA97b7120d02682Ae696f82';
