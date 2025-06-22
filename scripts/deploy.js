const hre = require('hardhat');


async function main() {
    const Vote = await hre.ethers.getContractFactory('DynamicVoteUpgradeable');
    const vote = await hre.upgrades.deployProxy(Vote, ['Cats vs Dogs'], {
        initializer: 'initialize',
    });
    await vote.waitForDeployment();
    await vote.addChoice('Cats');
    await vote.addChoice('Dogs');
    console.log('DynamicVote deployed to:', vote.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
