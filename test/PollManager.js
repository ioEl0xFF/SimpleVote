const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('PollRegistry integration', function () {
    let registry; // manager から registry に変更
    let token;
    let owner;
    let addr1;
    let start;
    let end;

    beforeEach(async () => {
        const Registry = await ethers.getContractFactory('PollRegistry'); // Manager から Registry に変更
        const Token = await ethers.getContractFactory('MockERC20');
        [owner, addr1] = await ethers.getSigners();

        registry = await Registry.deploy(); // manager から registry に変更
        await registry.waitForDeployment();

        token = await Token.deploy('Mock', 'MCK');
        await token.waitForDeployment();

        await token.mint(owner.address, ethers.parseEther('1000'));
        await token.transfer(addr1.address, ethers.parseEther('100'));

        start = (await time.latest()) + 10;
        end = start + 3600;
    });

    it('DynamicVote を生成して投票できる', async () => {
        // PollType.DYNAMIC_VOTE は 0
        const tx = await registry
            .connect(addr1)
            .createPoll(0, 'Food', start, end, ['Sushi', 'Pizza'], ethers.ZeroAddress); // createDynamicVote から createPoll に変更
        await tx.wait();

        const [pollIds, pollTypes, owners, topics] = await registry.getPolls(); // getPolls の戻り値が変更
        expect(pollIds.length).to.equal(1);
        expect(pollTypes[0]).to.equal(0); // DYNAMIC_VOTE
        expect(owners[0]).to.equal(addr1.address);
        expect(topics[0]).to.equal('Food');

        const pollId = pollIds[0];

        await time.increaseTo(start + 1);

        await registry.connect(addr1).vote(pollId, 1, 0); // vote 関数に pollId と amount を追加

        const [, , , , , , , voteCounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(1n);
    });

    it('WeightedVote を生成して投票できる', async () => {
        // PollType.WEIGHTED_VOTE は 1
        const tx = await registry
            .connect(addr1)
            .createPoll(1, 'Color', start, end, ['Red', 'Blue'], token.target); // createWeightedVote から createPoll に変更
        await tx.wait();

        const [pollIds, pollTypes, owners, topics] = await registry.getPolls();
        expect(pollIds.length).to.equal(1);
        expect(pollTypes[0]).to.equal(1); // WEIGHTED_VOTE
        expect(owners[0]).to.equal(addr1.address);
        expect(topics[0]).to.equal('Color');

        const pollId = pollIds[0];

        const amount = ethers.parseEther('10');
        await token.connect(addr1).approve(registry.target, amount); // voteAddr から registry.target に変更

        await time.increaseTo(start + 1);
        await registry.connect(addr1).vote(pollId, 1, amount); // vote 関数に pollId と amount を追加

        const [, , , , , , , voteCounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(amount);

        const [pollsAfterIds] = await registry.getPolls();
        expect(pollsAfterIds.length).to.equal(1);
    });

    it('SimpleVote を生成して投票できる', async () => {
        // PollType.SIMPLE_VOTE は 2
        const tx = await registry
            .connect(addr1)
            .createPoll(2, 'Yes/No', start, end, ['Yes', 'No'], ethers.ZeroAddress); // SimpleVote の作成
        await tx.wait();

        const [pollIds, pollTypes, owners, topics] = await registry.getPolls();
        expect(pollIds.length).to.equal(1);
        expect(pollTypes[0]).to.equal(2); // SIMPLE_VOTE
        expect(owners[0]).to.equal(addr1.address);
        expect(topics[0]).to.equal('Yes/No');

        const pollId = pollIds[0];

        await time.increaseTo(start + 1);

        await registry.connect(addr1).vote(pollId, 1, 0); // Yes に投票

        const [, , , , , , , voteCounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(1n);

        await registry.connect(addr1).cancelVote(pollId); // 投票キャンセル
        const [, , , , , , , voteCountsAfterCancel] = await registry.getPoll(pollId);
        expect(voteCountsAfterCancel[0]).to.equal(0n);

        await registry.connect(addr1).vote(pollId, 2, 0); // No に投票
        const [, , , , , , , voteCountsAfterRevote] = await registry.getPoll(pollId);
        expect(voteCountsAfterRevote[1]).to.equal(1n);
    });
});