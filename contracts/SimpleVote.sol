// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SimpleVote {
    /// @notice 議題タイトル
    string public topic;
    /// @notice A 票数
    uint256 public votesForA;
    /// @notice B 票数
    uint256 public votesForB;
    /// @dev 投票済みアドレスを記録
    mapping(address => bool) public hasVoted;

    /// @dev 既に投票済みの場合のエラー
    error AlreadyVoted();
    /// @notice 投票イベント
    event Voted(address indexed voter, bool voteForA);

    constructor(string memory _topic) {
        topic = _topic;
    }

    /// @notice 投票処理
    /// @param _voteForA true: A へ投票 / false: B へ投票
    function vote(bool _voteForA) external {
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        hasVoted[msg.sender] = true;
        _voteForA ? votesForA++ : votesForB++;
        emit Voted(msg.sender, _voteForA);
    }

    /// @notice 現在の票数を取得
    function getVotes() external view returns (uint256, uint256) {
        return (votesForA, votesForB);
    }
}
