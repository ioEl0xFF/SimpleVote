const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
    const Vote = await hre.ethers.getContractFactory('DynamicVote');
    const vote = await Vote.deploy('Cats vs Dogs');
    await vote.waitForDeployment();
    await vote.addChoice('Cats');
    await vote.addChoice('Dogs');
    console.log('DynamicVote deployed to:', vote.target);

    // フロントエンドのアドレスを書き換え
    const constantsPath = path.join(__dirname, '..', 'simple-vote-ui', 'src', 'constants.js');
    let data = fs.readFileSync(constantsPath, 'utf8');
    data = data.replace(
        /export const DYNAMIC_VOTE_ADDRESS = '0x[0-9a-fA-F]+';/,
        `export const DYNAMIC_VOTE_ADDRESS = '${vote.target}';`
    );
    fs.writeFileSync(constantsPath, data);
    console.log('Updated DYNAMIC_VOTE_ADDRESS in constants.js');

    // WeightedVote 用のトークンをデプロイ
    const Token = await hre.ethers.getContractFactory('MockERC20');
    const token = await Token.deploy('VoteToken', 'VTK');
    await token.waitForDeployment();
    const [deployer] = await hre.ethers.getSigners();
    await token.mint(deployer.address, hre.ethers.parseEther('1000'));

    const Weighted = await hre.ethers.getContractFactory('WeightedVote');
    const weighted = await Weighted.deploy('Best color', token.target);
    await weighted.waitForDeployment();
    await weighted.addChoice('Red');
    await weighted.addChoice('Blue');
    console.log('WeightedVote deployed to:', weighted.target);
    console.log('VoteToken deployed to:', token.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
