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
        console.log(`Error getting ABI for ${contractName}:`, e);
        return []; // エラー時は空の配列を返す
    }
};

async function main() {
    const Manager = await hre.ethers.getContractFactory('PollManager');
    const Token = await hre.ethers.getContractFactory('MockERC20');

    // PollManager のデプロイ
    const manager = await Manager.deploy();
    await manager.waitForDeployment();
    console.log('PollManager deployed to:', manager.target);

    // WeightedVote 用のトークンをデプロイ
    const token = await Token.deploy('VoteToken', 'VTK');
    await token.waitForDeployment();
    const [deployer] = await hre.ethers.getSigners();
    await token.mint(deployer.address, hre.ethers.parseEther('1000'));
    console.log('VoteToken deployed to:', token.target);

    // フロントエンドの constants.js のパス
    const constantsPath = path.join(
        __dirname,
        '..',
        'simple-vote-ui',
        'src',
        'constants.js'
    );

    // constants.js の内容を生成
    // 既存の constants.js の構造を維持し、必要な部分のみ更新する
    const constantsContent = `
export const DYNAMIC_VOTE_ABI = ${JSON.stringify(getAbi('DynamicVote'), null, 4)};

export const WEIGHTED_VOTE_ABI = ${JSON.stringify(getAbi('WeightedVote'), null, 4)};

export const POLL_MANAGER_ABI = ${JSON.stringify(getAbi('PollManager'), null, 4)};

export const ERC20_ABI = ${JSON.stringify(getAbi('MockERC20'), null, 4)};

export const POLL_MANAGER_ADDRESS = '${manager.target}';

export const MOCK_ERC20_ADDRESS = '${token.target}';

// These addresses are not updated by deploy.js as they are dynamically created by PollManager
export const DYNAMIC_VOTE_ADDRESS = '0x0000000000000000000000000000000000000000';
export const WEIGHTED_VOTE_ADDRESS = '0x0000000000000000000000000000000000000000';
`;

    fs.writeFileSync(constantsPath, constantsContent);
    console.log('Updated constants.js with new addresses and ABIs.');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});