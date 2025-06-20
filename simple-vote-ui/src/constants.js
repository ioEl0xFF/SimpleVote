export const DYNAMIC_VOTE_ABI = [
    {
        inputs: [{ internalType: 'string', name: '_topic', type: 'string' }],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: 'uint256', name: 'id', type: 'uint256' },
            { indexed: false, internalType: 'string', name: 'name', type: 'string' },
        ],
        name: 'ChoiceAdded',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: 'address', name: 'voter', type: 'address' },
            { indexed: false, internalType: 'uint256', name: 'choiceId', type: 'uint256' },
        ],
        name: 'VoteCast',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: 'address', name: 'voter', type: 'address' },
            { indexed: false, internalType: 'uint256', name: 'choiceId', type: 'uint256' },
        ],
        name: 'VoteCancelled',
        type: 'event',
    },
    {
        inputs: [{ internalType: 'string', name: 'name', type: 'string' }],
        name: 'addChoice',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        name: 'choice',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'choiceCount',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getChoices',
        outputs: [{ internalType: 'string[]', name: 'names', type: 'string[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'votedChoiceId',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
        inputs: [{ internalType: 'uint256', name: 'choiceId', type: 'uint256' }],
        name: 'vote',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'cancelVote',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        name: 'voteCount',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
];

export const DYNAMIC_VOTE_ADDRESS = '0x35f844585f06c8c3461956DD69f9886cB4F86F77';
