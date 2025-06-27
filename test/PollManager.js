const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

// PollManager から DynamicVote と WeightedVote を作成できるか検証

describe('PollManager integration', function () {
    let manager;
    let token;
    let owner;
    let addr1;
    let start;
    let end;

    beforeEach(async () => {
        const Manager = await ethers.getContractFactory('PollManager');
        const Token = await ethers.getContractFactory('MockERC20');
        [owner, addr1] = await ethers.getSigners();
        manager = await Manager.deploy();
        await manager.waitForDeployment();
        token = await Token.deploy('Mock', 'MCK');
        await token.waitForDeployment();
        await token.mint(owner.address, ethers.parseEther('1000'));
        await token.transfer(addr1.address, ethers.parseEther('100'));
        start = (await time.latest()) + 10;
        end = start + 3600;
    });

    it('DynamicVote を生成して投票できる', async () => {
        const tx = await manager
            .connect(addr1)
            .createDynamicVote('Food', start, end);
        await tx.wait();
        const polls = await manager.getPolls();
        expect(polls.length).to.equal(1);
        const voteAddr = polls[0];
        const Vote = await ethers.getContractFactory('DynamicVote');
        const vote = Vote.attach(voteAddr);
        expect(await vote.owner()).to.equal(addr1.address);
        await vote.connect(addr1).addChoice('Sushi');
        await vote.connect(addr1).addChoice('Pizza');
        await time.increaseTo(start + 1);
        await vote.connect(addr1).vote(1);
        expect(await vote.voteCount(1)).to.equal(1n);
    });

    it('WeightedVote を生成して投票できる', async () => {
        const tx = await manager
            .connect(addr1)
            .createWeightedVote('Color', token.target, start, end);
        await tx.wait();
        const polls = await manager.getPolls();
        const voteAddr = polls[polls.length - 1];
        const Vote = await ethers.getContractFactory('WeightedVote');
        const vote = Vote.attach(voteAddr);
        expect(await vote.owner()).to.equal(addr1.address);
        await vote.connect(addr1).addChoice('Red');
        await vote.connect(addr1).addChoice('Blue');
        const amount = ethers.parseEther('10');
        await token.connect(addr1).approve(voteAddr, amount);
        await time.increaseTo(start + 1);
        await vote.connect(addr1).vote(1, amount);
        expect(await vote.voteCount(1)).to.equal(amount);
        const pollsAfter = await manager.getPolls();
        expect(pollsAfter.length).to.equal(1);
    });
});

