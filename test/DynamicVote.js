const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('PollRegistry DynamicVote logic', function () {
    let registry; // vote から registry に変更
    let owner;
    let addr1;
    let addr2;
    let start;
    let end;
    let pollId; // 新しく pollId を追加

    beforeEach(async () => {
        const Registry = await ethers.getContractFactory('PollRegistry'); // DynamicVote から PollRegistry に変更
        [owner, addr1, addr2] = await ethers.getSigners();
        start = (await time.latest()) + 10;
        end = start + 3600;

        registry = await Registry.deploy(); // vote から registry に変更
        await registry.waitForDeployment();

        // DynamicVote を PollRegistry 経由で作成
        const tx = await registry.createPoll(0, 'Favorite fruit', start, end, ['Apple', 'Orange'], ethers.ZeroAddress);
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => registry.interface.parseLog(log)?.name === 'PollCreated');
        pollId = event.args.pollId;

        await time.increaseTo(start + 1);
    });

    it('初期トピックが正しい', async () => {
        const [, , , topic] = await registry.getPoll(pollId);
        expect(topic).to.equal('Favorite fruit');
    });

    it('取消前後でvoteCountが変化する', async () => {
        await registry.connect(addr1).vote(pollId, 1, 0);
        let [, , , , , , , voteCounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(1n);
        await registry.connect(addr1).cancelVote(pollId);
        [, , , , , , , voteCounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(0n);
    });

    it('取消後に再度voteできる', async () => {
        await registry.connect(addr1).vote(pollId, 1, 0);
        await registry.connect(addr1).cancelVote(pollId);
        await registry.connect(addr1).vote(pollId, 2, 0);
        let [, , , , , , , voteCounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(0n);
        expect(voteCounts[1]).to.equal(1n);
    });

    it('未投票でcancelVoteはrevert', async () => {
        await expect(registry.connect(addr2).cancelVote(pollId)).to.be.revertedWith(
            'No vote to cancel'
        );
    });

    it('取消後すぐ他の選択肢に投票できる', async () => {
        await registry.connect(addr1).vote(pollId, 2, 0);
        await registry.connect(addr1).cancelVote(pollId);
        await registry.connect(addr1).vote(pollId, 1, 0);
        let [, , , , , , , voteCounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(1n);
    });

    it('二重投票はできない', async () => {
        await registry.connect(addr1).vote(pollId, 1, 0);
        await expect(registry.connect(addr1).vote(pollId, 1, 0)).to.be.revertedWith(
            'Already voted. Cancel first'
        );
    });

    it('開始前は投票できない', async () => {
        const Registry = await ethers.getContractFactory('PollRegistry');
        const now = await time.latest();
        const s = now + 100;
        const e = s + 3600;
        const r = await Registry.deploy();
        await r.waitForDeployment();
        const tx = await r.createPoll(0, 'Fruit', s, e, ['Apple'], ethers.ZeroAddress);
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => r.interface.parseLog(log)?.name === 'PollCreated');
        const newPollId = event.args.pollId;

        await expect(r.connect(addr1).vote(newPollId, 1, 0)).to.be.revertedWith('Voting closed');
    });

    it('終了後は投票も取消もできない', async () => {
        const Registry = await ethers.getContractFactory('PollRegistry');
        const now = await time.latest();
        const s = now + 3;
        const e = s + 4;
        const r = await Registry.deploy();
        await r.waitForDeployment();
        const tx = await r.createPoll(0, 'Fruit', s, e, ['Apple'], ethers.ZeroAddress);
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => r.interface.parseLog(log)?.name === 'PollCreated');
        const newPollId = event.args.pollId;

        await time.increaseTo(s + 1);
        await r.connect(addr1).vote(newPollId, 1, 0);
        await time.increaseTo(e + 1);
        await expect(r.connect(addr1).vote(newPollId, 1, 0)).to.be.revertedWith('Voting closed');
        await expect(r.connect(addr1).cancelVote(newPollId)).to.be.revertedWith('Voting closed');
    });
});