// =============================================================
// SimpleVote.sol（コメント付き）
// -------------------------------------------------------------
// 📝 このスマートコントラクトは、非常にシンプルな「賛成／反対」投票システムです。
// 初学者向けに各行の役割・書き方を丁寧にコメントしています。
//   1. topic      : 投票テーマ（例：Cats vs Dogs）
//   2. agree      : 賛成票の総数
//   3. disagree   : 反対票の総数
//   4. votedChoiceId : 誰がどちらに投票したかを記録する
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
    uint256 public startTime; // 投票開始時刻
    uint256 public endTime;   // 投票終了時刻

    // アドレス => 投票した選択肢 ID (0: 未投票, 1: 賛成, 2: 反対)
    mapping(address => uint) public votedChoiceId;

    /// 投票が取り消されたときに発火
    event VoteCancelled(address indexed voter, uint choiceId);


    // =============================
    // 🔸 コンストラクタ
    // =============================
    // デプロイ時に投票テーマを受け取り、状態変数 topic に保存します。
    constructor(string memory _topic, uint256 _startTime, uint256 _endTime) {
        require(_endTime > _startTime, "end must be after start");
        topic = _topic;
        startTime = _startTime;
        endTime = _endTime;
    }

    // =============================
    // 🔸 メイン関数: vote()
    // =============================
    /// @notice 賛成( true ) か 反対( false ) を送信者が投票します。
    /// @param agreeVote true で賛成、false で反対。
    function vote(bool agreeVote) external {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Voting closed"
        );
        require(votedChoiceId[msg.sender] == 0, "Already voted. Cancel first");

        if (agreeVote) {
            agree++;
            votedChoiceId[msg.sender] = 1;
        } else {
            disagree++;
            votedChoiceId[msg.sender] = 2;
        }
    }

    /// @notice 投票を取り消します
    function cancelVote() external {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Voting closed"
        );
        uint prev = votedChoiceId[msg.sender];
        require(prev != 0, "No vote to cancel");
        if (prev == 1) {
            agree--;
        } else if (prev == 2) {
            disagree--;
        }
        votedChoiceId[msg.sender] = 0;
        emit VoteCancelled(msg.sender, prev);
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
