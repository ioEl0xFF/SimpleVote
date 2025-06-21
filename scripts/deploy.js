const hre = require('hardhat');

async function main() {
    const Vote = await hre.ethers.getContractFactory('WeightedDynamicVote');
    const vote = await Vote.deploy('Cats vs Dogs');
    await vote.waitForDeployment();
    await vote.addChoice('Cats');
    await vote.addChoice('Dogs');
    console.log('WeightedDynamicVote deployed to:', vote.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
