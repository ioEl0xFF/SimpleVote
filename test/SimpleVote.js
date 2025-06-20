const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('SimpleVote', () => {
    let vote, owner, addr1, addr2;

    beforeEach(async () => {
        const Vote = await ethers.getContractFactory('SimpleVote');
        [owner, addr1, addr2] = await ethers.getSigners();
        vote = await Vote.deploy('Cats vs Dogs');
        await vote.waitForDeployment(); // ethers v6
    });

    it('初期トピックが正しいこと', async () => {
        expect(await vote.topic()).to.equal('Cats vs Dogs');
    });

    it('投票できること', async () => {
        await vote.connect(addr1).vote(true);
        const [a, b] = await vote.getVotes();
        expect(a).to.equal(1n);
        expect(b).to.equal(0n);
    });

    it('二重投票を防止すること', async () => {
        await vote.connect(addr1).vote(false);
        await expect(vote.connect(addr1).vote(true)).to.be.revertedWith('You have already voted.');
    });
});
