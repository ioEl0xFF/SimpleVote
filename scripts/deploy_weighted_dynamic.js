require('dotenv').config();
const hre = require('hardhat');

async function main() {
    const topic = process.env.TOPIC || 'Sample Vote';
    const choices = (process.env.CHOICES || 'A,B').split(',');
    const token = process.env.TOKEN_ADDRESS;
    const mode = Number(process.env.WEIGHT_MODE || 0);

    if (!token) {
        throw new Error('TOKEN_ADDRESS env var required');
    }

    const Vote = await hre.ethers.getContractFactory('WeightedDynamicVote');
    const vote = await Vote.deploy(topic, token, mode);
    await vote.waitForDeployment();

    for (const name of choices) {
        if (name) {
            await vote.addChoice(name);
        }
    }

    console.log('WeightedDynamicVote deployed to:', vote.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
