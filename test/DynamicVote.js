const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('DynamicVote cancel/revote', function () {
    let vote;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async () => {
        const Vote = await ethers.getContractFactory('DynamicVoteUpgradeable');
        [owner, addr1, addr2] = await ethers.getSigners();
        vote = await upgrades.deployProxy(Vote, ['Favorite fruit'], {
            initializer: 'initialize',
        });
        await vote.waitForDeployment();
        await vote.addChoice('Apple');
        await vote.addChoice('Orange');
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

    it('アップグレード後も状態が保持される', async () => {
        await vote.connect(addr1).vote(1);
        const VoteV2 = await ethers.getContractFactory(
            'DynamicVoteUpgradeableV2'
        );
        const upgraded = await upgrades.upgradeProxy(vote, VoteV2);
        expect(await upgraded.voteCount(1)).to.equal(1n);
        expect(await upgraded.getVersion()).to.equal(2n);
    });
});
