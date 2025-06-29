# Step 4: simple-vote-ui/src/constants.js の更新

このステップでは、`simple-vote-ui/src/constants.js` ファイルを更新し、新しい `PollRegistry` コントラクトのアドレスとABIを設定します。また、不要になる既存のコントラクトのABIとアドレスを削除またはコメントアウトします。

## 4.1. 変更内容

`simple-vote-ui/src/constants.js` を開き、以下の変更を行います。

1.  `POLL_MANAGER_ADDRESS` を `PollRegistry` コントラクトのアドレスに更新します。デプロイ後にこのアドレスを反映する必要があります。
2.  `POLL_MANAGER_ABI` を新しい `PollRegistry` のABIに更新します。
3.  `DYNAMIC_VOTE_ABI`, `WEIGHTED_VOTE_ABI`, `DYNAMIC_VOTE_ADDRESS`, `WEIGHTED_VOTE_ADDRESS` は不要になるため、削除またはコメントアウトします。

```javascript
// simple-vote-ui/src/constants.js

// PollRegistry の ABI をここに貼り付けます
export const POLL_REGISTRY_ABI = [
    // PollRegistry.sol の ABI をここに記述
    // 例: {
    //     "inputs": [],
    //     "stateMutability": "nonpayable",
    //     "type": "constructor"
    // },
    // ...
];

// PollRegistry のデプロイアドレスをここに設定します
export const POLL_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000000'; // デプロイ後に更新

export const ERC20_ABI = [
    // MockERC20.sol の ABI をここに記述
    // 例: {
    //     "inputs": [
    //         { "internalType": "string", "name": "name", "type": "string" },
    //         { "internalType": "string", "name": "symbol", "type": "string" }
    //     ],
    //     "stateMutability": "nonpayable",
    //     "type": "constructor"
    // },
    // ...
];

export const MOCK_ERC20_ADDRESS = '0x0000000000000000000000000000000000000000'; // デプロイ後に更新

// 以下の定数は不要になるため、削除またはコメントアウトします
// export const DYNAMIC_VOTE_ABI = [...];
// export const DYNAMIC_VOTE_ADDRESS = '0x...';
// export const WEIGHTED_VOTE_ABI = [...];
// export const WEIGHTED_VOTE_ADDRESS = '0x...';
// export const POLL_MANAGER_ABI = [...];
// export const POLL_MANAGER_ADDRESS = '0x...';
```

## 4.2. 補足

`POLL_REGISTRY_ABI` と `ERC20_ABI` は、`npm run compile` を実行した後に `artifacts/contracts/PollRegistry.sol/PollRegistry.json` および `artifacts/contracts/MockERC20.sol/MockERC20.json` から取得できます。`scripts/deploy.js` を修正して、これらのABIとアドレスを自動的に `constants.js` に書き込むようにすることも検討してください。