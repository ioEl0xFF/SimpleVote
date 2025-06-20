const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('DynamicVote', function () {
    let vote;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async () => {
        const Vote = await ethers.getContractFactory('DynamicVote');
        [owner, addr1, addr2] = await ethers.getSigners();
        vote = await Vote.deploy('Favorite fruit');
        await vote.waitForDeployment();
    });

    it('初期トピックが正しい', async () => {
        expect(await vote.topic()).to.equal('Favorite fruit');
    });

    it('選択肢を追加できる', async () => {
        await vote.addChoice('Apple');
        expect(await vote.choice(1)).to.equal('Apple');
        expect(await vote.choiceCount()).to.equal(1n);
    });

    it('投票と二重投票防止', async () => {
        await vote.addChoice('Apple');
        await vote.addChoice('Orange');

        await vote.connect(addr1).vote(2);
        expect(await vote.voteCount(2)).to.equal(1n);

        await expect(vote.connect(addr1).vote(1)).to.be.revertedWith(
            'already voted'
        );
    });

    it('選択肢一覧を取得', async () => {
        await vote.addChoice('A');
        await vote.addChoice('B');

        const names = await vote.getChoices();
        expect(names).to.deep.equal(['A', 'B']);
    });
});
