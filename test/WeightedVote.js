const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('WeightedVote', () => {
    let owner, addr1, addr2, addr3;
    let erc20, erc721;

    beforeEach(async () => {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        const ERC20 = await ethers.getContractFactory('MockERC20');
        erc20 = await ERC20.deploy();
        await erc20.waitForDeployment();

        const ERC721 = await ethers.getContractFactory('MockERC721');
        erc721 = await ERC721.deploy();
        await erc721.waitForDeployment();

        // mint tokens
        await erc20.mint(addr1.address, 100);
        await erc20.mint(addr2.address, 50);

        await erc721.mint(addr1.address);
        await erc721.mint(addr2.address);
    });

    describe('ERC20 モード', () => {
        let vote;
        beforeEach(async () => {
            const Vote = await ethers.getContractFactory('WeightedSimpleVote');
            vote = await Vote.deploy(erc20.target, 0); // ERC20 mode
            await vote.waitForDeployment();
        });

        it('保有ゼロアカウントは投票不可', async () => {
            await expect(vote.connect(addr3).vote(true)).to.be.revertedWith(
                'No voting weight'
            );
        });

        it('重複投票不可', async () => {
            await vote.connect(addr1).vote(true);
            await expect(vote.connect(addr1).vote(false)).to.be.revertedWith(
                'Already voted'
            );
        });

        it('合計重み計算が正しいか確認', async () => {
            await expect(vote.connect(addr1).vote(true))
                .to.emit(vote, 'WeightedVote')
                .withArgs(addr1.address, 100n, true);
            await vote.connect(addr2).vote(false);

            const [a, b] = await vote.getVotes();
            expect(a).to.equal(100n);
            expect(b).to.equal(50n);
        });
    });

    describe('ERC721 モード', () => {
        let vote;
        beforeEach(async () => {
            const Vote = await ethers.getContractFactory('WeightedSimpleVote');
            vote = await Vote.deploy(erc721.target, 1); // ERC721 mode
            await vote.waitForDeployment();
        });

        it('合計重み計算が正しいか確認', async () => {
            await vote.connect(addr1).vote(true);
            await vote.connect(addr2).vote(false);
            const [a, b] = await vote.getVotes();
            expect(a).to.equal(1n);
            expect(b).to.equal(1n);
        });
    });
});
