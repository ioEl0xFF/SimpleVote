# Step 2: hardhat.config.js の変更

このステップでは、Hardhatの設定ファイル `hardhat.config.js` を変更し、新しい `PollRegistry.sol` コントラクトがコンパイルされるようにします。また、不要になる既存のコントラクトの参照を削除します。

## 2.1. ファイルの変更

`hardhat.config.js` を開き、`solidity` の設定を確認します。通常、特別な設定は不要ですが、もし特定のコントラクトのみをコンパイルする設定がある場合は、`PollRegistry.sol` を含めるように変更します。このプロジェクトでは、`solidity: '0.8.30'` のようにバージョン指定のみなので、変更は不要です。

ただし、将来的に古いコントラクトを削除する場合に備え、`contracts` ディレクトリから `Lock.sol` 以外のコントラクトを削除する準備をしておきます。

## 2.2. 変更内容

`hardhat.config.js` の `solidity` 設定は以下のようになります。変更はありません。

```javascript
require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

module.exports = {
    solidity: '0.8.30',
    networks: {
        amoy: {
            url: process.env.API_URL,
            accounts: [process.env.PRIVATE_KEY],
            chainId: 80002,
        },
    },
    mocha: { timeout: 40000 },
};
```

**注意:** このステップでは `hardhat.config.js` 自体のコード変更は発生しませんが、新しいコントラクトがコンパイル対象となることを確認する意味合いがあります。次のステップで古いコントラクトファイルを削除する際に、この設定が適切であることを確認します。
