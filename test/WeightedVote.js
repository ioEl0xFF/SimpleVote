const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('WeightedVote token deposit', function () {
    let vote;
    let token;
    let owner;
    let addr1;

    beforeEach(async () => {
        const Token = await ethers.getContractFactory('MockERC20');
        const Vote = await ethers.getContractFactory('WeightedVote');
        [owner, addr1] = await ethers.getSigners();
        token = await Token.deploy('Mock', 'MCK');
        await token.waitForDeployment();
        await token.mint(owner.address, ethers.parseEther('1000'));
        vote = await Vote.deploy('Best color', token.target);
        await vote.waitForDeployment();
        await vote.addChoice('Red');
        await vote.addChoice('Blue');
        await token.transfer(addr1.address, ethers.parseEther('100'));
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
});

