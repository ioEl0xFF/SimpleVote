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
    /// アドレス => 投票済みか
    mapping(address => bool) public hasVoted;
    /// 選択肢 ID => 票数
    mapping(uint256 => uint256) public voteCount;
    /// 選択肢の総数（最大 10）
    uint256 public choiceCount;

    /// 選択肢が追加されたときに発火
    event ChoiceAdded(uint256 id, string name);
    /// 投票が行われたときに発火
    event VoteCast(address voter, uint256 choiceId);

    /// @param _topic 議題
    constructor(string memory _topic) Ownable(msg.sender) {
        topic = _topic;
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
        require(!hasVoted[msg.sender], "already voted");
        require(choiceId > 0 && choiceId <= choiceCount, "invalid id");
        voteCount[choiceId] += 1;
        hasVoted[msg.sender] = true;
        emit VoteCast(msg.sender, choiceId);
    }

    /// @notice 全選択肢の名前を配列で取得
    function getChoices() external view returns (string[] memory names) {
        names = new string[](choiceCount);
        for (uint256 i = 0; i < choiceCount; i++) {
            names[i] = choice[i + 1];
        }
    }
}
