// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SimpleVote {
    string public topic;
    uint public votesForA;
    uint public votesForB;
    mapping(address => bool) public hasVoted;

    constructor(string memory _topic) {
        topic = _topic;
    }

    function vote(bool _voteForA) external {
        require(!hasVoted[msg.sender], "You have already voted.");
        hasVoted[msg.sender] = true;
        _voteForA ? votesForA++ : votesForB++;
    }

    function getVotes() external view returns (uint, uint) {
        return (votesForA, votesForB);
    }
}
