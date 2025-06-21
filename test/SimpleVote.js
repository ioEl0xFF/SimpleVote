const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('SimpleVote cancel/revote', function () {
    let vote;
    let owner;
    let addr1;

    beforeEach(async () => {
        const Vote = await ethers.getContractFactory('SimpleVote');
        [owner, addr1] = await ethers.getSigners();
        vote = await Vote.deploy('Cats vs Dogs');
        await vote.waitForDeployment();
    });

    it('初期トピックが正しい', async () => {
        expect(await vote.topic()).to.equal('Cats vs Dogs');
    });

    it('取消前後で票数が増減する', async () => {
        await vote.connect(addr1).vote(true);
        let [agree] = await vote.getVotes();
        expect(agree).to.equal(1n);
        await vote.connect(addr1).cancelVote();
        [agree] = await vote.getVotes();
        expect(agree).to.equal(0n);
    });

    it('取消後に別の票へ再投票できる', async () => {
        await vote.connect(addr1).vote(true);
        await vote.connect(addr1).cancelVote();
        await vote.connect(addr1).vote(false);
        const [agree, disagree] = await vote.getVotes();
        expect(agree).to.equal(0n);
        expect(disagree).to.equal(1n);
    });

    it('未投票でcancelVoteはrevertする', async () => {
        await expect(vote.connect(addr1).cancelVote()).to.be.revertedWith(
            'No vote to cancel'
        );
    });

    it('取消後すぐ再投票可能', async () => {
        await vote.connect(addr1).vote(false);
        await vote.connect(addr1).cancelVote();
        await vote.connect(addr1).vote(true);
        const [agree, disagree] = await vote.getVotes();
        expect(agree).to.equal(1n);
        expect(disagree).to.equal(0n);
    });
});
