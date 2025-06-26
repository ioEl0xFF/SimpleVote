const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('WeightedVote token deposit', function () {
    let vote;
    let token;
    let owner;
    let addr1;
    let start;
    let end;

    beforeEach(async () => {
        const Token = await ethers.getContractFactory('MockERC20');
        const Vote = await ethers.getContractFactory('WeightedVote');
        [owner, addr1] = await ethers.getSigners();
        token = await Token.deploy('Mock', 'MCK');
        await token.waitForDeployment();
        await token.mint(owner.address, ethers.parseEther('1000'));
        start = (await time.latest()) + 10;
        end = start + 3600;
        vote = await Vote.deploy('Best color', token.target, start, end);
        await vote.waitForDeployment();
        await vote.addChoice('Red');
        await vote.addChoice('Blue');
        await token.transfer(addr1.address, ethers.parseEther('100'));
        await time.increaseTo(start + 1);
    });

    it('投票時にトークンが減り、取消で戻る', async () => {
        const amount = ethers.parseEther('10');
        await token.connect(addr1).approve(vote.target, amount);
        await vote.connect(addr1).vote(1, amount);
        expect(await vote.voteCount(1)).to.equal(amount);
        expect(await vote.deposited(addr1.address)).to.equal(amount);
        expect(await token.balanceOf(addr1.address)).to.equal(
            ethers.parseEther('90')
        );
        await vote.connect(addr1).cancelVote();
        expect(await vote.voteCount(1)).to.equal(0n);
        expect(await vote.deposited(addr1.address)).to.equal(0n);
        expect(await token.balanceOf(addr1.address)).to.equal(
            ethers.parseEther('100')
        );
    });

    it('未投票でcancelVoteはrevert', async () => {
        await expect(vote.connect(addr1).cancelVote()).to.be.revertedWith(
            'No vote to cancel'
        );
    });

    it('二重投票はできない', async () => {
        const amount = ethers.parseEther('5');
        await token.connect(addr1).approve(vote.target, amount);
        await vote.connect(addr1).vote(1, amount);
        await token.connect(addr1).approve(vote.target, amount);
        await expect(
            vote.connect(addr1).vote(1, amount)
        ).to.be.revertedWith('Already voted. Cancel first');
    });

    it('開始前は投票できない', async () => {
        const Token = await ethers.getContractFactory('MockERC20');
        const Vote = await ethers.getContractFactory('WeightedVote');
        const now = await time.latest();
        const s = now + 100;
        const e = s + 3600;
        const t = await Token.deploy('Mock', 'MCK');
        await t.waitForDeployment();
        await t.mint(owner.address, ethers.parseEther('10'));
        const v = await Vote.deploy('Color', t.target, s, e);
        await v.waitForDeployment();
        await v.addChoice('Red');
        await t.transfer(addr1.address, ethers.parseEther('1'));
        await t.connect(addr1).approve(v.target, ethers.parseEther('1'));
        await expect(v.connect(addr1).vote(1, ethers.parseEther('1'))).to.be.revertedWith(
            'Voting closed'
        );
    });

    it('終了後は投票も取消もできない', async () => {
        const Token = await ethers.getContractFactory('MockERC20');
        const Vote = await ethers.getContractFactory('WeightedVote');
        const now = await time.latest();
        const s = now + 100;
        const e = s + 10;
        const t = await Token.deploy('Mock', 'MCK');
        await t.waitForDeployment();
        await t.mint(owner.address, ethers.parseEther('10'));
        const v = await Vote.deploy('Color', t.target, s, e);
        await v.waitForDeployment();
        await v.addChoice('Red');
        await time.increaseTo(s + 2);
        await t.transfer(addr1.address, ethers.parseEther('1'));
        await t.connect(addr1).approve(v.target, ethers.parseEther('1'));
        await v.connect(addr1).vote(1, ethers.parseEther('1'));
        await time.increaseTo(e + 1);
        await t.connect(addr1).approve(v.target, ethers.parseEther('1'));
        await expect(v.connect(addr1).vote(1, ethers.parseEther('1'))).to.be.revertedWith(
            'Voting closed'
        );
        await expect(v.connect(addr1).cancelVote()).to.be.revertedWith(
            'Voting closed'
        );
    });
});

