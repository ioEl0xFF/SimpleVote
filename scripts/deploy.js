const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
    // DynamicVote のデプロイ
    const Vote = await hre.ethers.getContractFactory('DynamicVote');
    const vote = await Vote.deploy('Cats vs Dogs');
    await vote.waitForDeployment();
    await vote.addChoice('Cats');
    await vote.addChoice('Dogs');
    console.log('DynamicVote deployed to:', vote.target);

    // WeightedToken のデプロイ
    const Token = await hre.ethers.getContractFactory('WeightedToken');
    const token = await Token.deploy();
    await token.waitForDeployment();
    console.log('WeightedToken deployed to:', token.target);

    // WeightedVote のデプロイ
    const Weighted = await hre.ethers.getContractFactory('WeightedVote');
    const weighted = await Weighted.deploy('Cats vs Dogs', token.target);
    await weighted.waitForDeployment();
    console.log('WeightedVote deployed to:', weighted.target);

    // フロントエンド用定数ファイルを書き出し
    const dynamicAbi = (await hre.artifacts.readArtifact('DynamicVote')).abi;
    const weightedAbi = (await hre.artifacts.readArtifact('WeightedVote')).abi;

    const outPath = path.join(__dirname, '..', 'simple-vote-ui', 'src', 'constants.js');
    const content = `export const DYNAMIC_VOTE_ABI = ${JSON.stringify(dynamicAbi, null, 4)};
export const DYNAMIC_VOTE_ADDRESS = '${vote.target}';
export const WEIGHTED_VOTE_ABI = ${JSON.stringify(weightedAbi, null, 4)};
export const WEIGHTED_VOTE_ADDRESS = '${weighted.target}';
export const WEIGHTED_TOKEN_ADDRESS = '${token.target}';
export const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
];
`;
    fs.writeFileSync(outPath, content);
    console.log('constants.js updated');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
