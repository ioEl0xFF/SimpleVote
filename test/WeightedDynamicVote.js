const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('WeightedDynamicVote', () => {
    let owner, addr1, addr2;
    let erc20, erc721;

    beforeEach(async () => {
        [owner, addr1, addr2] = await ethers.getSigners();

        const ERC20 = await ethers.getContractFactory('MockERC20');
        erc20 = await ERC20.deploy();
        await erc20.waitForDeployment();

        const ERC721 = await ethers.getContractFactory('MockERC721');
        erc721 = await ERC721.deploy();
        await erc721.waitForDeployment();

        await erc20.mint(addr1.address, 100);
        await erc20.mint(addr2.address, 50);

        await erc721.mint(addr1.address);
        await erc721.mint(addr2.address);
    });

    describe('ERC20 モード', () => {
        let vote;
        beforeEach(async () => {
            const Vote = await ethers.getContractFactory('WeightedDynamicVote');
            vote = await Vote.deploy('topic', erc20.target, 0);
            await vote.waitForDeployment();
            await vote.addChoice('Apple');
            await vote.addChoice('Orange');
        });

        it('重み付け投票の合計が正しい', async () => {
            await vote.connect(addr1).vote(1);
            await vote.connect(addr2).vote(2);
            expect(await vote.voteWeight(1)).to.equal(100n);
            expect(await vote.voteWeight(2)).to.equal(50n);
        });

        it('取消すると重みが減算される', async () => {
            await vote.connect(addr1).vote(1);
            await vote.connect(addr1).cancelVote();
            expect(await vote.voteWeight(1)).to.equal(0n);
        });
    });

    describe('ERC721 モード', () => {
        let vote;
        beforeEach(async () => {
            const Vote = await ethers.getContractFactory('WeightedDynamicVote');
            vote = await Vote.deploy('topic', erc721.target, 1);
            await vote.waitForDeployment();
            await vote.addChoice('A');
            await vote.addChoice('B');
        });

        it('NFT 保有数で重み計算', async () => {
            await vote.connect(addr1).vote(1);
            await vote.connect(addr2).vote(2);
            expect(await vote.voteWeight(1)).to.equal(1n);
            expect(await vote.voteWeight(2)).to.equal(1n);
        });
    });
});
