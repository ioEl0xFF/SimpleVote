const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('PollRegistry WeightedVote logic', function () {
    let registry; // vote から registry に変更
    let token;
    let owner;
    let addr1;
    let start;
    let end;
    let pollId; // 新しく pollId を追加

    beforeEach(async () => {
        const Token = await ethers.getContractFactory('MockERC20');
        const Registry = await ethers.getContractFactory('PollRegistry'); // WeightedVote から PollRegistry に変更
        [owner, addr1] = await ethers.getSigners();
        token = await Token.deploy('Mock', 'MCK');
        await token.waitForDeployment();
        await token.mint(owner.address, ethers.parseEther('1000'));
        start = (await time.latest()) + 10;
        end = start + 3600;

        registry = await Registry.deploy(); // vote から registry に変更
        await registry.waitForDeployment();

        // WeightedVote を PollRegistry 経由で作成
        const tx = await registry.createPoll(1, 'Best color', start, end, ['Red', 'Blue'], token.target);
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => registry.interface.parseLog(log)?.name === 'PollCreated');
        pollId = event.args.pollId;

        await token.transfer(addr1.address, ethers.parseEther('100'));
        await time.increaseTo(start + 1);
    });

    it('投票時にトークンが減り、取消で戻る', async () => {
        const amount = ethers.parseEther('10');
        await token.connect(addr1).approve(registry.target, amount); // vote.target から registry.target に変更
        await registry.connect(addr1).vote(pollId, 1, amount); // vote 関数に pollId を追加

        let [, , , , , , , voteCounts, tokenAddress, depositedAmount] = await registry.connect(addr1).getPoll(pollId);
        expect(voteCounts[0]).to.equal(amount);
        expect(depositedAmount).to.equal(amount); // depositedAmount は getPoll の戻り値の9番目
        expect(await token.balanceOf(addr1.address)).to.equal(
            ethers.parseEther('90')
        );

        await registry.connect(addr1).cancelVote(pollId); // cancelVote 関数に pollId を追加
        [, , , , , , , voteCounts, tokenAddress, depositedAmount] = await registry.connect(addr1).getPoll(pollId);
        expect(voteCounts[0]).to.equal(0n);
        expect(depositedAmount).to.equal(0n);
        expect(await token.balanceOf(addr1.address)).to.equal(
            ethers.parseEther('100')
        );
    });

    it('未投票でcancelVoteはrevert', async () => {
        await expect(registry.connect(addr1).cancelVote(pollId)).to.be.revertedWith(
            'No vote to cancel'
        );
    });

    it('二重投票はできない', async () => {
        const amount = ethers.parseEther('5');
        await token.connect(addr1).approve(registry.target, amount);
        await registry.connect(addr1).vote(pollId, 1, amount);
        await token.connect(addr1).approve(registry.target, amount);
        await expect(
            registry.connect(addr1).vote(pollId, 1, amount)
        ).to.be.revertedWith('Already voted. Cancel first');
    });

    it('0 トークンでは投票できない', async () => {
        await expect(registry.connect(addr1).vote(pollId, 1, 0)).to.be.revertedWith(
            'Amount must be greater than zero for WeightedVote'
        );
    });

    it('開始前は投票できない', async () => {
        const Registry = await ethers.getContractFactory('PollRegistry');
        const now = await time.latest();
        const s = now + 100;
        const e = s + 3600;
        const r = await Registry.deploy();
        await r.waitForDeployment();
        const tx = await r.createPoll(1, 'Color', s, e, ['Red'], token.target);
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => r.interface.parseLog(log)?.name === 'PollCreated');
        const newPollId = event.args.pollId;

        await token.connect(addr1).approve(r.target, ethers.parseEther('1'));
        await expect(
            r.connect(addr1).vote(newPollId, 1, ethers.parseEther('1'))
        ).to.be.revertedWith('Voting closed');
    });

    it('終了後は投票も取消もできない', async () => {
        const Registry = await ethers.getContractFactory('PollRegistry');
        const now = await time.latest();
        const s = now + 3;
        const e = s + 4;
        const r = await Registry.deploy();
        await r.waitForDeployment();
        const tx = await r.createPoll(1, 'Color', s, e, ['Red'], token.target);
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => r.interface.parseLog(log)?.name === 'PollCreated');
        const newPollId = event.args.pollId;

        const amount = ethers.parseEther('1');
        await token.connect(addr1).approve(r.target, amount);
        await time.increaseTo(s + 1);
        await r.connect(addr1).vote(newPollId, 1, amount);
        await time.increaseTo(e + 1);
        await expect(r.connect(addr1).vote(newPollId, 1, amount)).to.be.revertedWith(
            'Voting closed'
        );
        await expect(r.connect(addr1).cancelVote(newPollId)).to.be.revertedWith(
            'Voting closed'
        );
    });
});