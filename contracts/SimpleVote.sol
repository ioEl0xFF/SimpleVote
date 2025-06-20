// =============================================================
// SimpleVote.sol（コメント付き）
// -------------------------------------------------------------
// 📝 このスマートコントラクトは、非常にシンプルな「賛成／反対」投票システムです。
// 初学者向けに各行の役割・書き方を丁寧にコメントしています。
//   1. topic      : 投票テーマ（例：Cats vs Dogs）
//   2. agree      : 賛成票の総数
//   3. disagree   : 反対票の総数
//   4. hasVoted   : 既に投票したアドレスを記録して二重投票を防ぐ
//   5. vote()     : 投票ロジック本体
//   6. getVotes() : 投票結果を外部から読み取るビュー関数
// -------------------------------------------------------------

// SPDX-License-Identifier はライセンスを明示する特別なコメントです。
// オープンソースとして公開する際に、使用ライセンス（MIT など）を書きます。
// これを記載するとコンパイラの警告を回避できます。
// SPDX-License-Identifier: MIT

// Solidity コンパイラのバージョンを指定。
// ここの ^0.8.30 は「0.8.30 以上 0.9.0 未満」を意味します。
pragma solidity ^0.8.30;

// ▼ コントラクト（クラスのようなもの）開始
contract SimpleVote {
    // =============================
    // 🔸 状態変数（ストレージ）
    // =============================
    string public topic;   // 投票テーマ。public 修飾子で自動 Getter が生成される
    uint   public agree;   // 賛成票のカウンタ
    uint   public disagree;// 反対票のカウンタ

    // アドレス => 投票済みかどうか のマッピング
    mapping(address => bool) public hasVoted;

    // =============================
    // 🔸 カスタムエラー
    // =============================
    // ガスを節約できる revert 方法。require より効率的＆エラーメッセージが型安全。
    error AlreadyVoted();

    // =============================
    // 🔸 コンストラクタ
    // =============================
    // デプロイ時に投票テーマを受け取り、状態変数 topic に保存します。
    constructor(string memory _topic) {
        topic = _topic;
    }

    // =============================
    // 🔸 メイン関数: vote()
    // =============================
    /// @notice 賛成( true ) か 反対( false ) を送信者が投票します。
    /// @param agreeVote true で賛成、false で反対。
    function vote(bool agreeVote) external {
        // ① 二重投票チェック：既に投票していれば revert で処理を中断
        if (hasVoted[msg.sender]) {
            revert AlreadyVoted();
        }
        // ② 投票済みフラグを立てる
        hasVoted[msg.sender] = true;

        // ③ 入力に応じてカウンタを増やす
        if (agreeVote) {
            // 賛成票をインクリメント
            agree++;
        } else {
            // 反対票をインクリメント
            disagree++;
        }
    }

    // =============================
    // 🔸 ビュー関数: getVotes()
    // =============================
    /// @notice 現在の賛成票数と反対票数を取得します。
    /// @return uint 賛成票, uint 反対票
    function getVotes() external view returns (uint, uint) {
        return (agree, disagree);
    }
}
