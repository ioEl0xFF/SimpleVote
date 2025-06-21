require('dotenv').config();
const hre = require('hardhat');

async function main() {
    const topic = process.env.TOPIC || 'Sample Vote';
    const choices = (process.env.CHOICES || 'A,B').split(',');

    const Vote = await hre.ethers.getContractFactory('DynamicVote');
    const vote = await Vote.deploy(topic);
    await vote.waitForDeployment();

    for (const name of choices) {
        if (name) {
            await vote.addChoice(name);
        }
    }

    console.log('DynamicVote deployed to:', vote.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
