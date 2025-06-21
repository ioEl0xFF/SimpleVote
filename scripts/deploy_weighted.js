require('dotenv').config();
const hre = require('hardhat');

async function main() {
    const token = process.env.TOKEN_ADDRESS;
    const mode = Number(process.env.WEIGHT_MODE || 0);

    if (!token) {
        throw new Error('TOKEN_ADDRESS env var required');
    }

    const Vote = await hre.ethers.getContractFactory('WeightedSimpleVote');
    const vote = await Vote.deploy(token, mode);
    await vote.waitForDeployment();

    console.log('WeightedSimpleVote deployed to:', vote.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
