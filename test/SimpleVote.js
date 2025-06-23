const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('SimpleVote cancel/revote', function () {
    let vote;
    let owner;
    let addr1;
    let start;
    let end;

    beforeEach(async () => {
        const Vote = await ethers.getContractFactory('SimpleVote');
        [owner, addr1] = await ethers.getSigners();
        start = (await time.latest()) + 10;
        end = start + 3600;
        vote = await Vote.deploy('Cats vs Dogs', start, end);
        await vote.waitForDeployment();
        await time.increaseTo(start + 1);
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

    it('開始前は投票できない', async () => {
        const Vote = await ethers.getContractFactory('SimpleVote');
        const now = await time.latest();
        const s = now + 100;
        const e = s + 3600;
        const v = await Vote.deploy('Cats vs Dogs', s, e);
        await v.waitForDeployment();
        await expect(v.connect(addr1).vote(true)).to.be.revertedWith('Voting closed');
    });

    it('終了後は投票も取消もできない', async () => {
        const Vote = await ethers.getContractFactory('SimpleVote');
        const now = await time.latest();
        const s = now + 1;
        const e = s + 10;
        const v = await Vote.deploy('Cats vs Dogs', s, e);
        await v.waitForDeployment();
        await time.increaseTo(s + 1);
        await v.connect(addr1).vote(true);
        await time.increaseTo(e + 1);
        await expect(v.connect(addr1).vote(true)).to.be.revertedWith('Voting closed');
        await expect(v.connect(addr1).cancelVote()).to.be.revertedWith('Voting closed');
    });
});
