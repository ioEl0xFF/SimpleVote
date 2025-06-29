const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('PollRegistry SimpleVote logic', function () {
    let registry;
    let owner;
    let addr1;
    let start;
    let end;
    let pollId; // 新しく pollId を追加

    beforeEach(async () => {
        const Registry = await ethers.getContractFactory('PollRegistry');
        [owner, addr1] = await ethers.getSigners();
        
        const now = await time.latest();
        start = now + 10;
        end = start + 3600;

        registry = await Registry.deploy();
        await registry.waitForDeployment();

        const tx = await registry.createPoll(2, 'Cats vs Dogs', start, end, ['Yes', 'No'], ethers.ZeroAddress);
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => registry.interface.parseLog(log)?.name === 'PollCreated');
        pollId = event.args.pollId;

        await time.increaseTo(start + 1);
    });

    it('初期トピックが正しい', async () => {
        const [, , , topic] = await registry.getPoll(pollId);
        expect(topic).to.equal('Cats vs Dogs');
    });

    it('取消前後で票数が増減する', async () => {
        await registry.connect(addr1).vote(pollId, 1, 0); // Yes に投票
        let [, , , , , , , voteCounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(1n);
        await registry.connect(addr1).cancelVote(pollId);
        [, , , , , , , voteCounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(0n);
    });

    it('取消後に別の票へ再投票できる', async () => {
        await registry.connect(addr1).vote(pollId, 1, 0); // Yes に投票
        await registry.connect(addr1).cancelVote(pollId);
        await registry.connect(addr1).vote(pollId, 2, 0); // No に投票
        const [, , , , , , , voteCounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(0n);
        expect(voteCounts[1]).to.equal(1n);
    });

    it('未投票でcancelVoteはrevertする', async () => {
        await expect(registry.connect(addr1).cancelVote(pollId)).to.be.revertedWith(
            'No vote to cancel'
        );
    });

    it('取消後すぐ再投票可能', async () => {
        await registry.connect(addr1).vote(pollId, 2, 0); // No に投票
        await registry.connect(addr1).cancelVote(pollId);
        await registry.connect(addr1).vote(pollId, 1, 0); // Yes に投票
        const [, , , , , , , voteCounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(1n);
        expect(voteCounts[1]).to.equal(0n);
    });

    it('開始前は投票できない', async () => {
        const Registry = await ethers.getContractFactory('PollRegistry');
        const now = await time.latest();
        const s = now + 100;
        const e = s + 3600;
        const r = await Registry.deploy();
        await r.waitForDeployment();
        const tx = await r.createPoll(2, 'Cats vs Dogs', s, e, ['Yes', 'No'], ethers.ZeroAddress);
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => r.interface.parseLog(log)?.name === 'PollCreated');
        const newPollId = event.args.pollId;

        await expect(r.connect(addr1).vote(newPollId, 1, 0)).to.be.revertedWith('Voting closed');
    });

    it('終了後は投票も取消もできない', async () => {
        const Registry = await ethers.getContractFactory('PollRegistry');
        const now = await time.latest();
        const s = now + 1;
        const e = s + 10;
        const r = await Registry.deploy();
        await r.waitForDeployment();
        const tx = await r.createPoll(2, 'Cats vs Dogs', s, e, ['Yes', 'No'], ethers.ZeroAddress);
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => r.interface.parseLog(log)?.name === 'PollCreated');
        const newPollId = event.args.pollId;

        await time.increase(2); // Move past start time
        await r.connect(addr1).vote(newPollId, 1, 0);
        await time.increase(10); // Move past end time
        await expect(r.connect(addr1).vote(newPollId, 1, 0)).to.be.revertedWith('Voting closed');
        await expect(r.connect(addr1).cancelVote(newPollId)).to.be.revertedWith('Voting closed');
    });
});
