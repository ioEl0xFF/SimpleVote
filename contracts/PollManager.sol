// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./DynamicVote.sol";
import "./WeightedVote.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title PollManager
/// @notice DynamicVote または WeightedVote を生成・管理するコントラクト
contract PollManager {
    /// 生成した投票コントラクトのアドレス一覧
    address[] private _polls;

    event DynamicCreated(address indexed poll);
    event WeightedCreated(address indexed poll, address token);

    /// @notice 作成済み議題のアドレスを配列で取得します
    function getPolls() external view returns (address[] memory list) {
        list = _polls;
    }

    /// @notice DynamicVote をデプロイします
    /// @param topic 議題
    /// @param startTime 投票開始時刻
    /// @param endTime 投票終了時刻
    function createDynamicVote(
        string calldata topic,
        uint256 startTime,
        uint256 endTime
    ) external returns (address addr) {
        DynamicVote vote = new DynamicVote(topic, startTime, endTime);
        vote.transferOwnership(msg.sender);
        addr = address(vote);
        _polls.push(addr);
        emit DynamicCreated(addr);
    }

    /// @notice WeightedVote をデプロイします
    /// @param topic 議題
    /// @param token 投票に使うトークン
    /// @param startTime 投票開始時刻
    /// @param endTime 投票終了時刻
    function createWeightedVote(
        string calldata topic,
        IERC20 token,
        uint256 startTime,
        uint256 endTime
    ) external returns (address addr) {
        WeightedVote vote = new WeightedVote(topic, token, startTime, endTime);
        vote.transferOwnership(msg.sender);
        addr = address(vote);
        _polls.push(addr);
        emit WeightedCreated(addr, address(token));
    }
}
