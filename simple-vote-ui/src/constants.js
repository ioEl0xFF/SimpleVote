export const DYNAMIC_VOTE_ABI = [
    {
        inputs: [
            { internalType: 'string', name: '_topic', type: 'string' },
            { internalType: 'uint256', name: '_startTime', type: 'uint256' },
            { internalType: 'uint256', name: '_endTime', type: 'uint256' },
        ],
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
    {
        inputs: [],
        name: 'startTime',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'endTime',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
];

export const DYNAMIC_VOTE_ADDRESS = '0x411c389393F214233204bB8d6f5861e112579155';

export const WEIGHTED_VOTE_ABI = [
    {
        inputs: [
            { internalType: 'string', name: '_topic', type: 'string' },
            { internalType: 'address', name: '_token', type: 'address' },
            { internalType: 'uint256', name: '_startTime', type: 'uint256' },
            { internalType: 'uint256', name: '_endTime', type: 'uint256' },
        ],
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
            { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'VoteCast',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: 'address', name: 'voter', type: 'address' },
            { indexed: false, internalType: 'uint256', name: 'choiceId', type: 'uint256' },
            { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
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
        inputs: [
            { internalType: 'uint256', name: 'choiceId', type: 'uint256' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
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
    {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'deposited',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'token',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'startTime',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'endTime',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
];

export const WEIGHTED_VOTE_ADDRESS = '0xb9E63030f78f159aEf062e1D70325f542EC38Eaa';

export const POLL_MANAGER_ADDRESS = '0x33cEaC19e383081ECb993EaA4a8e235749Ae72e9';

export const POLL_MANAGER_ABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "poll",
                "type": "address"
            }
        ],
        "name": "DynamicCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "poll",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "token",
                "type": "address"
            }
        ],
        "name": "WeightedCreated",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "topic",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
            },
            {
                "internalType": "string[]",
                "name": "choices",
                "type": "string[]"
            }
        ],
        "name": "createDynamicVote",
        "outputs": [
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "topic",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "token",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
            },
            {
                "internalType": "string[]",
                "name": "choices",
                "type": "string[]"
            }
        ],
        "name": "createWeightedVote",
        "outputs": [
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getPolls",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "list",
                "type": "address[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

export const ERC20_ABI = [];

export const MOCK_ERC20_ADDRESS = '0x5C9C499a665023945e1a5c80ae81aB4DF5614982';
