// =============================================================
// SimpleVote.test.js（Hardhat）
// -------------------------------------------------------------
// 「SimpleVote.sol」コントラクトのユニットテスト。
// Hardhat（Ethers.js v6 + Mocha + Chai）を使って以下を検証します：
//   1. コンストラクタで設定した初期トピックが正しいか
//   2. ユーザーが投票を記録できるか
//   3. 二重投票（同じアドレスの重複投票）が拒否されるか
// =============================================================

// Chai の expect 関数：値が期待どおりかを検証するアサーション用
const { expect } = require('chai');
// Hardhat がグローバルに注入する Ethers.js（v6）
const { ethers } = require('hardhat');

// テストスイート。「SimpleVote」コントラクトに関するテストをまとめる
describe('SimpleVote', () => {
    // ここで宣言した変数は describe スコープ全体で参照可能
    let vote; // デプロイ済みコントラクトのインスタンス
    let owner; // デプロイを実行したアカウント（コントラクトオーナー）
    let addr1; // テスト用アカウント 1
    let addr2; // テスト用アカウント 2

    // beforeEach フック：各テスト(it)の前に必ず実行
    // 毎回クリーンな環境でコントラクトを再デプロイすることで、
    // テスト同士が干渉せず独立して動くようにする
    beforeEach(async () => {
        // コントラクトファクトリを取得（ABI + バイトコードのラッパー）
        const Vote = await ethers.getContractFactory('SimpleVote');
        // Hardhat ネットワークが用意したダミーアカウントを 3 つ取得
        [owner, addr1, addr2] = await ethers.getSigners();
        // コントラクトをデプロイ。コンストラクタ引数にトピック名を渡す
        vote = await Vote.deploy('Cats vs Dogs');
        // ethers v6：デプロイ完了を待つ専用メソッド
        await vote.waitForDeployment();
    });

    // =========================================================
    // 📝 テスト 1: 初期トピックが正しい
    // =========================================================
    it('初期トピックが正しいこと', async () => {
        // コントラクトの状態変数 topic が期待値と一致するか確認
        expect(await vote.topic()).to.equal('Cats vs Dogs');
    });

    // =========================================================
    // 📝 テスト 2: 投票が記録されるか
    // =========================================================
    it('投票できること', async () => {
        // addr1 が「賛成 (true)」で投票
        await vote.connect(addr1).vote(true);
        // getVotes() は [賛成票, 反対票] の配列を返す想定
        const [forVotes, againstVotes] = await vote.getVotes();
        // 賛成票が 1、反対票が 0 になっていることを検証
        expect(forVotes).to.equal(1n);
        expect(againstVotes).to.equal(0n);
    });

    // =========================================================
    // 📝 テスト 3: 二重投票を防止できるか
    // =========================================================
    it('二重投票を防止すること', async () => {
        // まず addr1 が「反対 (false)」に投票
        await vote.connect(addr1).vote(false);
        // 同じアドレスが再度投票しようとするとカスタムエラーで revert されるはず
        await expect(vote.connect(addr1).vote(true)).to.be.revertedWithCustomError(
            vote,
            'AlreadyVoted'
        );
    });
});
