# Step 5: scripts/deploy.js の変更

このステップでは、`scripts/deploy.js` ファイルを変更し、新しい `PollRegistry.sol` コントラクトをデプロイするようにします。また、デプロイされた `PollRegistry` コントラクトのアドレスとABIを `simple-vote-ui/src/constants.js` に自動的に書き込むように更新します。

## 5.1. 変更内容

`scripts/deploy.js` を開き、以下の変更を行います。

1.  `PollManager` のデプロイ部分を `PollRegistry` のデプロイに置き換えます。
2.  `constants.js` を更新する関数 `updateConstant` と `updateAbi` を使用して、`POLL_REGISTRY_ADDRESS` と `POLL_REGISTRY_ABI` を書き込むように変更します。
3.  `MockERC20` のデプロイと `MOCK_ERC20_ADDRESS` の更新はそのまま残します。
4.  `DYNAMIC_VOTE_ABI`, `WEIGHTED_VOTE_ABI`, `POLL_MANAGER_ABI` の更新は不要になるため、削除します。

```javascript
// scripts/deploy.js

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

// ABI を取得してファイルパスを返す
const getAbi = (contractName) => {
    try {
        const dir = path.resolve(
            __dirname,
            `../artifacts/contracts/${contractName}.sol`
        );
        const file = fs.readFileSync(path.join(dir, `${contractName}.json`));
        const json = JSON.parse(file);
        return json.abi;
    } catch (e) {
        console.log(`e`, e);
    }
};

async function main() {
    // PollRegistry のコントラクトファクトリを取得
    const Registry = await hre.ethers.getContractFactory('PollRegistry');
    const Token = await hre.ethers.getContractFactory('MockERC20');

    // PollRegistry のデプロイ
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    console.log('PollRegistry deployed to:', registry.target);

    // フロントエンドの constants.js ファイルパス
    const constantsPath = path.join(
        __dirname,
        '..',
        'simple-vote-ui',
        'src',
        'constants.js'
    );

    // ファイルを読み込み後でアドレスを書き換える関数
    const updateConstant = (content, key, value) => {
        const regex = new RegExp(`export const ${key} = ('|")[^'"]*('|");`);
        return content.replace(regex, `export const ${key} = '${value}';`);
    };

    // ABI を書き換える関数
    const updateAbi = (content, key, abi) => {
        const abiString = JSON.stringify(abi, null, 4);
        const regex = new RegExp(`export const ${key} = \[\s\S*\];`, 's');
        return content.replace(regex, `export const ${key} = ${abiString};`);
    };

    let data = fs.readFileSync(constantsPath, 'utf8');
    data = updateConstant(data, 'POLL_REGISTRY_ADDRESS', registry.target);
    fs.writeFileSync(constantsPath, data);
    console.log('Updated POLL_REGISTRY_ADDRESS in constants.js');

    // WeightedVote 用のトークンをデプロイ
    const token = await Token.deploy('VoteToken', 'VTK');
    await token.waitForDeployment();
    const [deployer] = await hre.ethers.getSigners();
    await token.mint(deployer.address, hre.ethers.parseEther('1000'));

    console.log('VoteToken deployed to:', token.target);

    // 生成したアドレスをフロントエンドに反映
    data = fs.readFileSync(constantsPath, 'utf8');
    data = updateConstant(data, 'MOCK_ERC20_ADDRESS', token.target);

    // ABI を反映
    data = updateAbi(data, 'POLL_REGISTRY_ABI', getAbi('PollRegistry'));
    data = updateAbi(data, 'ERC20_ABI', getAbi('MockERC20'));

    fs.writeFileSync(constantsPath, data);
    console.log('Updated vote addresses and ABIs in constants.js');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```
