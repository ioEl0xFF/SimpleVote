const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('DynamicVote cancel/revote', function () {
    let vote;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async () => {
        const Vote = await ethers.getContractFactory('DynamicVote');
        [owner, addr1, addr2] = await ethers.getSigners();
        const now = await time.latest();
        const start = Number(now) + 10;
        const end = start + 1000;
        vote = await Vote.deploy('Favorite fruit', start, end);
        await vote.waitForDeployment();
        await vote.addChoice('Apple');
        await vote.addChoice('Orange');
        await time.increaseTo(start);
    });

    it('初期トピックが正しい', async () => {
        expect(await vote.topic()).to.equal('Favorite fruit');
    });

    it('取消前後でvoteCountが変化する', async () => {
        await vote.connect(addr1).vote(1);
        expect(await vote.voteCount(1)).to.equal(1n);
        await vote.connect(addr1).cancelVote();
        expect(await vote.voteCount(1)).to.equal(0n);
    });

    it('取消後に再度voteできる', async () => {
        await vote.connect(addr1).vote(1);
        await vote.connect(addr1).cancelVote();
        await vote.connect(addr1).vote(2);
        expect(await vote.voteCount(1)).to.equal(0n);
        expect(await vote.voteCount(2)).to.equal(1n);
    });

    it('未投票でcancelVoteはrevert', async () => {
        await expect(vote.connect(addr2).cancelVote()).to.be.revertedWith(
            'No vote to cancel'
        );
    });

    it('取消後すぐ他の選択肢に投票できる', async () => {
        await vote.connect(addr1).vote(2);
        await vote.connect(addr1).cancelVote();
        await vote.connect(addr1).vote(1);
        expect(await vote.voteCount(1)).to.equal(1n);
    });

    it('二重投票はできない', async () => {
        await vote.connect(addr1).vote(1);
        await expect(vote.connect(addr1).vote(1)).to.be.revertedWith(
            'Already voted. Cancel first'
        );
    });

    it('開始前は投票できない', async () => {
        const Vote = await ethers.getContractFactory('DynamicVote');
        const now = await time.latest();
        const start = Number(now) + 100;
        const end = start + 1000;
        const newVote = await Vote.deploy('Temp', start, end);
        await newVote.waitForDeployment();
        await newVote.addChoice('A');
        await expect(newVote.connect(addr1).vote(1)).to.be.revertedWith(
            'voting closed'
        );
    });

    it('終了後は投票できない', async () => {
        const period = await vote.getPeriod();
        const end = Number(period[1]);
        await time.increaseTo(end + 1);
        await expect(vote.connect(addr1).vote(1)).to.be.revertedWith(
            'voting closed'
        );
    });
});
