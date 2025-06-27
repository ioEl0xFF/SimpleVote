// テストで使うライブラリをインポートします。
// expect は、アサーション（値が期待通りか検証）を行うための関数です。
const { expect } = require('chai');
// ethers は、Hardhat に組み込まれた Ethereum ライブラリで、コントラクトの操作に使います。
const { ethers } = require('hardhat');
// time は、Hardhat のローカルネットワークの時間を操作するためのヘルパーです。
const { time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

// PollManager から DynamicVote と WeightedVote を作成できるか検証するテストです。
// このテストは、複数のコントラクトが連携して正しく動作するかを確認する「統合テスト」です。

// describe は、関連するテストをグループ化するための関数です。
// 第一引数にはテストスイート（テストの集まり）の名前を、第二引数にはテストケースを定義する関数を指定します。
describe('PollManager integration', function () {
    // テストケース全体で利用する変数を宣言します。
    let manager; // PollManager コントラクトのインスタンス
    let token; // MockERC20 トークンコントラクトのインスタンス
    let owner; // デプロイ者のアカウント
    let addr1; // テストで使う別のアカウント
    let start; // 投票開始時刻
    let end; // 投票終了時刻

    // beforeEach は、この describe ブロック内の各テスト（it）が実行される前に一度だけ実行されるフックです。
    // テストごとに状態をリセットし、クリーンな環境でテストを実行するために使用します。
    beforeEach(async () => {
        // getContractFactory は、指定した名前のコントラクトをデプロイするためのファクトリ（工場）オブジェクトを作成します。
        const Manager = await ethers.getContractFactory('PollManager');
        const Token = await ethers.getContractFactory('MockERC20');
        // getSigners は、テストで使用できるイーサリアムアカウント（署名者）のリストを取得します。
        [owner, addr1] = await ethers.getSigners();

        // deploy は、コントラクトをブロックチェーンにデプロイします。
        manager = await Manager.deploy();
        // waitForDeployment は、コントラクトのデプロイが完了するまで待ちます。
        await manager.waitForDeployment();

        token = await Token.deploy('Mock', 'MCK');
        await token.waitForDeployment();

        // mint は、MockERC20 トークンを新規発行して owner アドレスに送ります。
        // ethers.parseEther('1000') は、1000 ETH を wei 単位（トークンの最小単位、10^18）に変換します。
        await token.mint(owner.address, ethers.parseEther('1000'));
        // transfer は、addr1 に 100 トークンを転送します。
        await token.transfer(addr1.address, ethers.parseEther('100'));

        // time.latest() は、ブロックチェーンの最新のタイムスタンプ（UNIX時間）を取得します。
        // ここでは、投票の開始時刻を「現在から10秒後」、終了時刻を「開始から1時間後」に設定しています。
        start = (await time.latest()) + 10;
        end = start + 3600;
    });

    // it は、個別のテストケースを定義します。
    // 第一引数にはテストの内容を説明する文字列を、第二引数にはテストロジックを含む非同期関数を指定します。
    it('DynamicVote を生成して投票できる', async () => {
        // manager.connect(addr1) は、addr1 のアカウントで PollManager コントラクトの関数を呼び出すための設定です。
        // これにより、msg.sender が addr1 になります。
        const tx = await manager
            .connect(addr1)
            .createDynamicVote('Food', start, end);
        // tx.wait() は、トランザクションがブロックチェーンに記録されるまで待ちます。
        await tx.wait();

        // getPolls を呼び出して、作成された投票コントラクトのアドレスリストを取得します。
        const polls = await manager.getPolls();
        // expect(...).to.equal(...) は、値が期待通りであるかを検証します。
        // ここでは、投票が1つ作成されたことを確認しています。
        expect(polls.length).to.equal(1);

        const voteAddr = polls[0];
        // getContractFactory で DynamicVote のファクトリを取得します。
        const Vote = await ethers.getContractFactory('DynamicVote');
        // attach は、既存のコントラクトアドレスに接続して、そのコントラクトを操作するためのオブジェクトを返します。
        const vote = Vote.attach(voteAddr);

        // 新しく作成された投票コントラクトの所有者が、作成者である addr1 になっているかを確認します。
        expect(await vote.owner()).to.equal(addr1.address);

        // addChoice で投票の選択肢を追加します。所有者（addr1）しか実行できません。
        await vote.connect(addr1).addChoice('Sushi');
        await vote.connect(addr1).addChoice('Pizza');

        // time.increaseTo は、Hardhat のローカルネットワークの時間を指定した時刻まで進めます。
        // これにより、投票期間の開始をシミュレートします。
        await time.increaseTo(start + 1);

        // vote(1) で、選択肢ID 1（Sushi）に投票します。
        await vote.connect(addr1).vote(1);
        // 投票後、選択肢1の票数が1になっていることを確認します。（1n は BigInt の 1）
        expect(await vote.voteCount(1)).to.equal(1n);
    });

    it('WeightedVote を生成して投票できる', async () => {
        // createWeightedVote を呼び出して、新しい WeightedVote コントラクトを作成します。
        // token.target は、デプロイされたトークンコントラクトのアドレスです。
        const tx = await manager
            .connect(addr1)
            .createWeightedVote('Color', token.target, start, end);
        await tx.wait();

        const polls = await manager.getPolls();
        const voteAddr = polls[polls.length - 1];
        const Vote = await ethers.getContractFactory('WeightedVote');
        const vote = Vote.attach(voteAddr);

        // 作成された投票コントラクトの所有者が addr1 であることを確認します。
        expect(await vote.owner()).to.equal(addr1.address);
        // 投票用の選択肢を追加します。
        await vote.connect(addr1).addChoice('Red');
        await vote.connect(addr1).addChoice('Blue');

        // ethers.parseEther('10') で、10 ETH 分のトークン量を wei 単位で表現します。
        const amount = ethers.parseEther('10');
        // approve は、指定した量（amount）のトークンを、voteAddr（WeightedVoteコントラクト）が代理で使用することを許可します。
        // これをしないと、vote 関数内で transferFrom が失敗します。
        await token.connect(addr1).approve(voteAddr, amount);

        // 投票期間まで時間を進めます。
        await time.increaseTo(start + 1);
        // vote(1, amount) で、選択肢1に amount 分の重みで投票します。
        await vote.connect(addr1).vote(1, amount);

        // 投票後、選択肢1の票数が amount と等しいことを確認します。
        expect(await vote.voteCount(1)).to.equal(amount);

        // 投票作成後の polls 配列の長さが 1 であることを確認します。
        const pollsAfter = await manager.getPolls();
        expect(pollsAfter.length).to.equal(1);
    });
});

