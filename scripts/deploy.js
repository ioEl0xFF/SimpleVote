const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
    const Manager = await hre.ethers.getContractFactory('PollManager');
    const Token = await hre.ethers.getContractFactory('MockERC20');

    // PollManager のデプロイ
    const manager = await Manager.deploy();
    await manager.waitForDeployment();
    console.log('PollManager deployed to:', manager.target);

    // フロントエンドのアドレス書き換え設定
    const constantsPath = path.join(__dirname, '..', 'simple-vote-ui', 'src', 'constants.js');
    let data = fs.readFileSync(constantsPath, 'utf8');
    data = data.replace(
        /export const POLL_MANAGER_ADDRESS = '0x[0-9a-fA-F]+';/,
        `export const POLL_MANAGER_ADDRESS = '${manager.target}';`
    );
    fs.writeFileSync(constantsPath, data);
    console.log('Updated POLL_MANAGER_ADDRESS in constants.js');

    // WeightedVote 用のトークンをデプロイ
    const token = await Token.deploy('VoteToken', 'VTK');
    await token.waitForDeployment();
    const [deployer] = await hre.ethers.getSigners();
    await token.mint(deployer.address, hre.ethers.parseEther('1000'));

    const now = Math.floor(Date.now() / 1000);
    const start = now + 60;
    const end = start + 3600;
    const tx1 = await manager.createDynamicVote('Cats vs Dogs', start, end);
    await tx1.wait();

    const wStart = now + 120;
    const wEnd = wStart + 3600;
    const tx2 = await manager.createWeightedVote('Best color', token.target, wStart, wEnd);
    await tx2.wait();

    const polls = await manager.getPolls();
    const dynamicAddr = polls[0];
    const weightedAddr = polls[1];

    const Vote = await hre.ethers.getContractFactory('DynamicVote');
    const Weighted = await hre.ethers.getContractFactory('WeightedVote');
    const dynamic = Vote.attach(dynamicAddr);
    const weighted = Weighted.attach(weightedAddr);
    await dynamic.addChoice('Cats');
    await dynamic.addChoice('Dogs');
    await weighted.addChoice('Red');
    await weighted.addChoice('Blue');

    console.log('DynamicVote deployed to:', dynamic.target);
    console.log('WeightedVote deployed to:', weighted.target);
    console.log('VoteToken deployed to:', token.target);

    // 生成したアドレスをフロントエンドに反映
    data = fs.readFileSync(constantsPath, 'utf8');
    data = data.replace(
        /export const DYNAMIC_VOTE_ADDRESS = '0x[0-9a-fA-F]+';/,
        `export const DYNAMIC_VOTE_ADDRESS = '${dynamic.target}';`
    );
    data = data.replace(
        /export const WEIGHTED_VOTE_ADDRESS = '0x[0-9a-fA-F]+';/,
        `export const WEIGHTED_VOTE_ADDRESS = '${weighted.target}';`
    );
    fs.writeFileSync(constantsPath, data);
    console.log('Updated vote addresses in constants.js');

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
