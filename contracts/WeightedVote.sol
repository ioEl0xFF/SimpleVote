// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title WeightedVote
 * @notice ERC20 トークン量によって票の重みが決まる投票コントラクト
 */
contract WeightedVote {
    /// 投票テーマ
    string public topic;
    /// 使用するトークン
    IERC20 public immutable token;
    /// 賛成票総数
    uint256 public agree;
    /// 反対票総数
    uint256 public disagree;

    /// アドレス => 投票した選択肢 (0:未投票, 1:賛成, 2:反対)
    mapping(address => uint8) public votedChoiceId;
    /// アドレス => 投票に使ったトークン量
    mapping(address => uint256) public voteWeight;

    event VoteCast(address indexed voter, bool agreeVote, uint256 amount);
    event VoteCancelled(address indexed voter, uint256 amount);

    constructor(string memory _topic, IERC20 _token) {
        topic = _topic;
        token = _token;
    }

    /// @notice 指定量のトークンを使って投票
    function vote(bool agreeVote, uint256 amount) external {
        require(votedChoiceId[msg.sender] == 0, "Already voted");
        require(amount > 0, "amount zero");
        votedChoiceId[msg.sender] = agreeVote ? 1 : 2;
        voteWeight[msg.sender] = amount;
        if (agreeVote) {
            agree += amount;
        } else {
            disagree += amount;
        }
        require(token.transferFrom(msg.sender, address(this), amount), "transfer failed");
        emit VoteCast(msg.sender, agreeVote, amount);
    }

    /// @notice 投票を取り消し、トークンを返却
    function cancelVote() external {
        uint8 prev = votedChoiceId[msg.sender];
        require(prev != 0, "No vote to cancel");
        uint256 amount = voteWeight[msg.sender];
        if (prev == 1) {
            agree -= amount;
        } else if (prev == 2) {
            disagree -= amount;
        }
        votedChoiceId[msg.sender] = 0;
        voteWeight[msg.sender] = 0;
        require(token.transfer(msg.sender, amount), "refund failed");
        emit VoteCancelled(msg.sender, amount);
    }

    /// @notice 現在の賛成票数と反対票数を取得
    function getVotes() external view returns (uint256, uint256) {
        return (agree, disagree);
    }
}
