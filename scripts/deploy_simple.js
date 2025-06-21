const hre = require('hardhat');

async function main() {
    const topic = process.env.TOPIC || 'Sample Vote';
    const Vote = await hre.ethers.getContractFactory('SimpleVote');
    const vote = await Vote.deploy(topic);
    await vote.waitForDeployment();

    console.log('SimpleVote deployed to:', vote.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
