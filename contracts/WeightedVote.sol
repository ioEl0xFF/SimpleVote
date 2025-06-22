// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title WeightedVote
/// @notice トークン保有量に応じて重み付けされる投票コントラクト
contract WeightedSimpleVote {
    /// 投票テーマ
    string public topic;
    /// @dev ERC20 か ERC721 かを指定するモード
    enum VoteWeightMode { ERC20, ERC721 }

    /// @notice 投票で用いるトークンのアドレス
    address public immutable token;
    /// @notice 投票時の重み計算方法
    VoteWeightMode public immutable mode;

    /// @notice 同一アドレスの重複投票を防ぐマッピング
    mapping(address => bool) public hasVoted;

    /// @notice 賛成票の総重量
    uint256 public weightedVotesForA;
    /// @notice 反対票の総重量
    uint256 public weightedVotesForB;

    /// @notice 投票が行われた際に発火するイベント
    event WeightedVote(address indexed voter, uint256 weight, bool forA);

    /// @param _topic 投票テーマ
    /// @param tokenAddress 投票に用いるトークンのアドレス
    /// @param _mode 重み計算モード（ERC20 or ERC721）
    constructor(
        string memory _topic,
        address tokenAddress,
        VoteWeightMode _mode
    ) {
        topic = _topic;
        token = tokenAddress;
        mode = _mode;
    }

    /// @notice 賛成(true)か反対(false)かを送信者が投票する
    /// 重みは保有しているトークン数に比例する
    function vote(bool forA) external {
        if (hasVoted[msg.sender]) {
            revert("Already voted");
        }

        uint256 weight = _getWeight(msg.sender);
        require(weight > 0, "No voting weight");

        hasVoted[msg.sender] = true;

        if (forA) {
            weightedVotesForA += weight;
        } else {
            weightedVotesForB += weight;
        }

        emit WeightedVote(msg.sender, weight, forA);
    }

    /// @notice 現在の賛成票と反対票を返す
    function getVotes() external view returns (uint256, uint256) {
        return (weightedVotesForA, weightedVotesForB);
    }

    /// @dev モードに応じてトークン残高を取得
    function _getWeight(address voter) internal view returns (uint256) {
        if (mode == VoteWeightMode.ERC20) {
            return IERC20(token).balanceOf(voter);
        } else {
            return IERC721(token).balanceOf(voter);
        }
    }
}
