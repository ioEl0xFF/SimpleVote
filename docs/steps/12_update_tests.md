# Step 12: テストの更新

このステップでは、既存のテストファイルを更新し、新しい `PollRegistry.sol` コントラクトのロジックをテストするように変更します。`PollManager.js`、`DynamicVote.js`、`WeightedVote.js` のテストは、`PollRegistry` の関数を呼び出し、内部の投票データが正しく更新されることを検証するように修正します。

## 12.1. test/PollManager.js の変更

`test/PollManager.js` を開き、以下の変更を行います。

1.  `PollManager` の代わりに `PollRegistry` をデプロイするように変更します。
2.  `createDynamicVote` や `createWeightedVote` の呼び出しを `createPoll` に変更し、`PollType` を適切に渡します。
3.  `getPolls` や `getPoll` を使用して、`PollRegistry` 内の投票データを検証するように変更します。

```javascript
// test/PollManager.js

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
```

## 12.2. test/DynamicVote.js の変更

`test/DynamicVote.js` を開き、以下の変更を行います。

1.  `DynamicVote` コントラクトのデプロイを `PollRegistry` の `createPoll` 呼び出しに置き換えます。
2.  テスト内の `vote` および `cancelVote` の呼び出しを `registry.vote` および `registry.cancelVote` に変更し、`pollId` を引数として渡します。
3.  `voteCount` や `votedChoiceId` の取得も `registry.getPoll` や `registry.getVotedChoiceId` を通じて行います。

```javascript
// test/DynamicVote.js

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
```

## 12.3. test/WeightedVote.js の変更

`test/WeightedVote.js` を開き、以下の変更を行います。

1.  `WeightedVote` コントラクトのデプロイを `PollRegistry` の `createPoll` 呼び出しに置き換えます。
2.  テスト内の `vote` および `cancelVote` の呼び出しを `registry.vote` および `registry.cancelVote` に変更し、`pollId` を引数として渡します。
3.  `voteCount` や `deposited` の取得も `registry.getPoll` を通じて行います。
4.  トークンの `approve` は `PollRegistry` のアドレスに対して行います。

```javascript
// test/WeightedVote.js

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

        let [, , , , , , , voteCounts, , depositedAmounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(amount);
        expect(depositedAmounts).to.equal(amount); // depositedAmounts は getPoll の戻り値の9番目
        expect(await token.balanceOf(addr1.address)).to.equal(
            ethers.parseEther('90')
        );

        await registry.connect(addr1).cancelVote(pollId); // cancelVote 関数に pollId を追加
        [, , , , , , , voteCounts, , depositedAmounts] = await registry.getPoll(pollId);
        expect(voteCounts[0]).to.equal(0n);
        expect(depositedAmounts).to.equal(0n);
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
        await token.connect(addr1).approve(r.target, amount);
        await expect(r.connect(addr1).vote(newPollId, 1, amount)).to.be.revertedWith(
            'Voting closed'
        );
        await expect(r.connect(addr1).cancelVote(newPollId)).to.be.revertedWith(
            'Voting closed'
        );
    });
});
```

## 12.4. test/SimpleVote.js の変更

`test/SimpleVote.js` を開き、以下の変更を行います。

1.  `SimpleVote` コントラクトのデプロイを `PollRegistry` の `createPoll` 呼び出しに置き換えます。
2.  テスト内の `vote` および `cancelVote` の呼び出しを `registry.vote` および `registry.cancelVote` に変更し、`pollId` を引数として渡します。
3.  `getVotes` の代わりに `registry.getPoll` を使用して票数を取得します。

```javascript
// test/SimpleVote.js

const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('PollRegistry SimpleVote logic', function () {
    let registry; // vote から registry に変更
    let owner;
    let addr1;
    let start;
    let end;
    let pollId; // 新しく pollId を追加

    beforeEach(async () => {
        const Registry = await ethers.getContractFactory('PollRegistry'); // SimpleVote から PollRegistry に変更
        [owner, addr1] = await ethers.getSigners();
        start = (await time.latest()) + 10;
        end = start + 3600;

        registry = await Registry.deploy(); // vote から registry に変更
        await registry.waitForDeployment();

        // SimpleVote を PollRegistry 経由で作成
        const tx = await registry.createPoll(2, 'Cats vs Dogs', start, end, ['Yes', 'No'], ethers.ZeroAddress); // PollType.SIMPLE_VOTE は 2
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

        await time.increaseTo(s + 1);
        await r.connect(addr1).vote(newPollId, 1, 0);
        await time.increaseTo(e + 1);
        await expect(r.connect(addr1).vote(newPollId, 1, 0)).to.be.revertedWith('Voting closed');
        await expect(r.connect(addr1).cancelVote(newPollId)).to.be.revertedWith('Voting closed');
    });
});
```