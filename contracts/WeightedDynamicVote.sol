// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title WeightedDynamicVote
/// @notice 議題と選択肢を動的に管理し、トークン保有量に比例した重み付き投票を行えるコントラクト
contract WeightedDynamicVote is Ownable {
    /// 投票時に参照するトークン種別
    enum VoteWeightMode { ERC20, ERC721 }

    /// 議題
    string public topic;
    /// 選択肢 ID => 選択肢名
    mapping(uint256 => string) public choice;
    /// アドレス => 投票した選択肢 ID (0 は未投票)
    mapping(address => uint256) public votedChoiceId;
    /// アドレス => 投票時の重み
    mapping(address => uint256) public votedWeight;
    /// 選択肢 ID => 合計投票重み
    mapping(uint256 => uint256) public voteWeight;
    /// 選択肢の総数（最大 10）
    uint256 public choiceCount;

    /// 重み付けに利用するトークン
    address public immutable token;
    /// 重み計算モード
    VoteWeightMode public immutable mode;

    /// 選択肢が追加されたときに発火
    event ChoiceAdded(uint256 id, string name);
    /// 投票が行われたときに発火
    event WeightedVoteCast(address indexed voter, uint256 choiceId, uint256 weight);
    /// 投票が取り消されたときに発火
    event VoteCancelled(address indexed voter, uint256 choiceId, uint256 weight);

    /// @param _topic 議題
    /// @param tokenAddress 投票に用いるトークンアドレス
    /// @param _mode 重み計算モード（ERC20 or ERC721）
    constructor(string memory _topic, address tokenAddress, VoteWeightMode _mode) Ownable(msg.sender) {
        topic = _topic;
        token = tokenAddress;
        mode = _mode;
    }

    /// @notice 新しい選択肢を追加します。オーナーのみ実行可能
    function addChoice(string calldata name) external onlyOwner {
        require(choiceCount < 10, "too many choices");
        uint256 id = ++choiceCount;
        choice[id] = name;
        emit ChoiceAdded(id, name);
    }

    /// @notice 指定した選択肢へ投票します
    /// @param choiceId 1 から choiceCount までの ID
    function vote(uint256 choiceId) external {
        require(votedChoiceId[msg.sender] == 0, "Already voted. Cancel first");
        require(choiceId > 0 && choiceId <= choiceCount, "invalid id");
        uint256 weight = _getWeight(msg.sender);
        require(weight > 0, "No voting weight");
        votedChoiceId[msg.sender] = choiceId;
        votedWeight[msg.sender] = weight;
        voteWeight[choiceId] += weight;
        emit WeightedVoteCast(msg.sender, choiceId, weight);
    }

    /// @notice 投票を取り消します
    function cancelVote() external {
        uint256 prev = votedChoiceId[msg.sender];
        require(prev != 0, "No vote to cancel");
        uint256 weight = votedWeight[msg.sender];
        voteWeight[prev] -= weight;
        votedChoiceId[msg.sender] = 0;
        votedWeight[msg.sender] = 0;
        emit VoteCancelled(msg.sender, prev, weight);
    }

    /// @notice 全選択肢の名前を配列で取得
    function getChoices() external view returns (string[] memory names) {
        names = new string[](choiceCount);
        for (uint256 i = 0; i < choiceCount; i++) {
            names[i] = choice[i + 1];
        }
    }

    /// @dev アドレスのトークン残高を取得
    function _getWeight(address voter) internal view returns (uint256) {
        if (mode == VoteWeightMode.ERC20) {
            return IERC20(token).balanceOf(voter);
        } else {
            return IERC721(token).balanceOf(voter);
        }
    }
}
