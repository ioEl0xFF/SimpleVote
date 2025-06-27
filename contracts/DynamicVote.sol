// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DynamicVote
 * @notice 議題と選択肢を動的に管理できる多人数投票コントラクトです。
 */
contract DynamicVote is Ownable {
    /// 議題
    string public topic;
    /// 選択肢 ID => 選択肢名
    mapping(uint256 => string) public choice;
    /// アドレス => 投票した選択肢 ID (0 は未投票)
    mapping(address => uint256) public votedChoiceId;
    /// 選択肢 ID => 票数
    mapping(uint256 => uint256) public voteCount;
    /// 選択肢の総数（最大 10）
    uint256 public choiceCount;
    /// 投票開始時刻
    uint256 public startTime;
    /// 投票終了時刻
    uint256 public endTime;

    /// 選択肢が追加されたときに発火
    event ChoiceAdded(uint256 id, string name);
    /// 投票が行われたときに発火
    event VoteCast(address voter, uint256 choiceId);
    /// 投票が取り消されたときに発火
    event VoteCancelled(address indexed voter, uint256 choiceId);

    /// @param _topic 議題
    /// @param _startTime 投票開始時刻
    /// @param _endTime 投票終了時刻
    constructor(
        string memory _topic,
        uint256 _startTime,
        uint256 _endTime
    ) Ownable(msg.sender) {
        require(_endTime > _startTime, "end must be after start");
        topic = _topic;
        startTime = _startTime;
        endTime = _endTime;
    }

    /**
     * @notice 新しい選択肢を追加します。オーナーのみ実行可能です。
     * @param name 選択肢の名前
     */
    function addChoice(string calldata name) external onlyOwner {
        require(choiceCount < 10, "too many choices");
        uint256 id = ++choiceCount;
        choice[id] = name;
        emit ChoiceAdded(id, name);
    }

    /**
     * @notice 指定した選択肢へ投票します。
     * @param choiceId 1 から choiceCount までの選択肢 ID
     */
    function vote(uint256 choiceId) external {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Voting closed"
        );
        require(votedChoiceId[msg.sender] == 0, "Already voted. Cancel first");
        require(choiceId > 0 && choiceId <= choiceCount, "invalid id");
        voteCount[choiceId] += 1;
        votedChoiceId[msg.sender] = choiceId;
        emit VoteCast(msg.sender, choiceId);
    }

    /// @notice 投票を取り消します
    function cancelVote() external {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Voting closed"
        );
        uint256 prev = votedChoiceId[msg.sender];
        require(prev != 0, "No vote to cancel");
        voteCount[prev] -= 1;
        votedChoiceId[msg.sender] = 0;
        emit VoteCancelled(msg.sender, prev);
    }

    /// @notice 全選択肢の名前を配列で取得
    function getChoices() external view returns (string[] memory names) {
        names = new string[](choiceCount);
        for (uint256 i = 0; i < choiceCount; i++) {
            names[i] = choice[i + 1];
        }
    }
}
