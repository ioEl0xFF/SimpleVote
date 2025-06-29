# Step 1: PollRegistry.sol コントラクトの作成

このステップでは、すべての投票データを管理する新しいスマートコントラクト `PollRegistry.sol` を作成します。このコントラクトは、既存の `PollManager.sol`、`DynamicVote.sol`、`WeightedVote.sol` の機能を統合します。

## 1.1. ファイルの作成

`contracts/PollRegistry.sol` という名前で新しいファイルを作成します。

## 1.2. コントラクトのコード

以下のSolidityコードを `contracts/PollRegistry.sol` に記述します。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // PollRegistry自体にオーナーシップを持たせる場合

/**
 * @title PollRegistry
 * @notice 全ての投票（DynamicVote, WeightedVote, SimpleVote）の作成、管理、投票ロジックを内包する単一コントラクト。
 *         各投票は内部のデータ構造として保持され、一意のIDで識別されます。
 */
contract PollRegistry is Ownable {
    using SafeERC20 for IERC20;

    // 投票の種類を識別するための列挙型
    enum PollType {
        DYNAMIC_VOTE,
        WEIGHTED_VOTE,
        SIMPLE_VOTE
    }

    // 各選択肢の情報を保持する構造体
    struct Choice {
        string name;
        uint256 voteCount; // DynamicVote, SimpleVote の票数
    }

    // 各投票（議題）の詳細情報を保持する構造体
    struct Poll {
        uint256 id;
        PollType pollType;
        address owner; // 投票作成者
        string topic;
        uint256 startTime;
        uint256 endTime;
        Choice[] choices; // 選択肢の配列
        mapping(address => uint256) votedChoiceId; // 投票者アドレス => 投票した選択肢ID (0は未投票)
        // WeightedVote 専用のデータ
        IERC20 token; // WeightedVote の場合のみ使用するトークンアドレス
        mapping(address => uint256) depositedAmounts; // WeightedVote の場合のみ使用する投票者 => 預け入れトークン量
    }

    uint256 public nextPollId; // 次に作成される投票のID
    mapping(uint256 => Poll) public polls; // 投票ID => Poll構造体

    // イベント定義
    event PollCreated(uint256 indexed pollId, PollType pollType, address indexed owner, string topic);
    event VoteCast(uint256 indexed pollId, address indexed voter, uint256 choiceId, uint256 amount);
    event VoteCancelled(uint256 indexed pollId, address indexed voter, uint256 choiceId);

    constructor() Ownable(msg.sender) {
        nextPollId = 0;
    }

    /**
     * @notice 新しい投票を作成します。
     * @param _pollType 投票の種類 (DYNAMIC_VOTE, WEIGHTED_VOTE, SIMPLE_VOTE)
     * @param _topic 議題
     * @param _startTime 投票開始時刻 (UNIXタイムスタンプ)
     * @param _endTime 投票終了時刻 (UNIXタイムスタンプ)
     * @param _choiceNames 初期選択肢の配列
     * @param _tokenAddress WeightedVote の場合に使用するERC20トークンアドレス (それ以外は address(0))
     * @return pollId 作成された投票の一意のID
     */
    function createPoll(
        PollType _pollType,
        string memory _topic,
        uint256 _startTime,
        uint256 _endTime,
        string[] memory _choiceNames,
        address _tokenAddress
    ) external returns (uint256 pollId) {
        require(_endTime > _startTime, "end must be after start");
        require(_choiceNames.length > 0, "choices cannot be empty");
        require(_choiceNames.length <= 10, "too many choices"); // 最大10件の選択肢

        if (_pollType == PollType.WEIGHTED_VOTE) {
            require(_tokenAddress != address(0), "token address cannot be zero for WeightedVote");
        } else {
            require(_tokenAddress == address(0), "token address must be zero for non-WeightedVote");
        }

        pollId = nextPollId++;
        Poll storage newPoll = polls[pollId];

        newPoll.id = pollId;
        newPoll.pollType = _pollType;
        newPoll.owner = msg.sender;
        newPoll.topic = _topic;
        newPoll.startTime = _startTime;
        newPoll.endTime = _endTime;

        for (uint i = 0; i < _choiceNames.length; i++) {
            newPoll.choices.push(Choice(_choiceNames[i], 0));
        }

        if (_pollType == PollType.WEIGHTED_VOTE) {
            newPoll.token = IERC20(_tokenAddress);
        }

        emit PollCreated(pollId, _pollType, msg.sender, _topic);
    }

    /**
     * @notice 指定した投票IDに対して投票します。
     * @param _pollId 投票のID
     * @param _choiceId 選択肢のID (1から始まる)
     * @param _amount WeightedVote の場合のみ使用するトークン量 (それ以外は0)
     */
    function vote(
        uint256 _pollId,
        uint256 _choiceId,
        uint256 _amount
    ) external {
        Poll storage poll = polls[_pollId];
        require(poll.id == _pollId, "Poll does not exist");
        require(block.timestamp >= poll.startTime && block.timestamp <= poll.endTime, "Voting closed");
        require(poll.votedChoiceId[msg.sender] == 0, "Already voted. Cancel first");
        require(_choiceId > 0 && _choiceId <= poll.choices.length, "Invalid choice ID");

        if (poll.pollType == PollType.WEIGHTED_VOTE) {
            require(_amount > 0, "Amount must be greater than zero for WeightedVote");
            poll.token.safeTransferFrom(msg.sender, address(this), _amount);
            poll.choices[_choiceId - 1].voteCount += _amount;
            poll.depositedAmounts[msg.sender] = _amount;
        } else { // DYNAMIC_VOTE, SIMPLE_VOTE
            require(_amount == 0, "Amount must be zero for non-WeightedVote");
            poll.choices[_choiceId - 1].voteCount += 1;
        }

        poll.votedChoiceId[msg.sender] = _choiceId;
        emit VoteCast(_pollId, msg.sender, _choiceId, _amount);
    }

    /**
     * @notice 指定した投票IDに対する投票を取り消します。
     * @param _pollId 投票のID
     */
    function cancelVote(uint256 _pollId) external {
        Poll storage poll = polls[_pollId];
        require(poll.id == _pollId, "Poll does not exist");
        require(block.timestamp >= poll.startTime && block.timestamp <= poll.endTime, "Voting closed");
        uint256 prevChoiceId = poll.votedChoiceId[msg.sender];
        require(prevChoiceId != 0, "No vote to cancel");

        if (poll.pollType == PollType.WEIGHTED_VOTE) {
            uint256 amount = poll.depositedAmounts[msg.sender];
            poll.choices[prevChoiceId - 1].voteCount -= amount;
            poll.depositedAmounts[msg.sender] = 0;
            poll.token.safeTransfer(msg.sender, amount);
        } else { // DYNAMIC_VOTE, SIMPLE_VOTE
            poll.choices[prevChoiceId - 1].voteCount -= 1;
        }

        poll.votedChoiceId[msg.sender] = 0;
        emit VoteCancelled(_pollId, msg.sender, prevChoiceId);
    }

    /**
     * @notice 全ての投票の概要リストを返します。
     * @return pollIds 投票IDの配列
     * @return pollTypes 投票種類の配列
     * @return owners 投票作成者の配列
     * @return topics 議題の配列
     */
    function getPolls() external view returns (uint256[] memory pollIds, PollType[] memory pollTypes, address[] memory owners, string[] memory topics) {
        pollIds = new uint256[](nextPollId);
        pollTypes = new PollType[](nextPollId);
        owners = new address[](nextPollId);
        topics = new string[](nextPollId);

        for (uint256 i = 0; i < nextPollId; i++) {
            Poll storage poll = polls[i];
            pollIds[i] = poll.id;
            pollTypes[i] = poll.pollType;
            owners[i] = poll.owner;
            topics[i] = poll.topic;
        }
    }

    /**
     * @notice 特定の投票の詳細情報を返します。
     * @param _pollId 投票のID
     * @return id 投票ID
     * @return pollType 投票種類
     * @return owner 投票作成者
     * @return topic 議題
     * @return startTime 投票開始時刻
     * @return endTime 投票終了時刻
     * @return choiceNames 選択肢名の配列
     * @return voteCounts 各選択肢の票数の配列
     * @return tokenAddress WeightedVote の場合に使用するトークンアドレス (それ以外は address(0))
     * @return depositedAmount 現在のユーザーが預け入れたトークン量 (WeightedVote の場合のみ)
     */
    function getPoll(uint256 _pollId) external view returns (
        uint256 id,
        PollType pollType,
        address owner,
        string memory topic,
        uint256 startTime,
        uint256 endTime,
        string[] memory choiceNames,
        uint256[] memory voteCounts,
        address tokenAddress,
        uint256 depositedAmount
    ) {
        Poll storage poll = polls[_pollId];
        require(poll.id == _pollId, "Poll does not exist");

        string[] memory names = new string[](poll.choices.length);
        uint256[] memory counts = new uint256[](poll.choices.length);
        for (uint i = 0; i < poll.choices.length; i++) {
            names[i] = poll.choices[i].name;
            counts[i] = poll.choices[i].voteCount;
        }

        return (
            poll.id,
            poll.pollType,
            poll.owner,
            poll.topic,
            poll.startTime,
            poll.endTime,
            names,
            counts,
            address(poll.token),
            poll.depositedAmounts[msg.sender]
        );
    }

    /**
     * @notice 特定の投票者がある投票でどの選択肢に投票したかを返します。
     * @param _pollId 投票のID
     * @param _voter 投票者のアドレス
     * @return 投票した選択肢のID (0は未投票)
     */
    function getVotedChoiceId(uint256 _pollId, address _voter) external view returns (uint256) {
        Poll storage poll = polls[_pollId];
        require(poll.id == _pollId, "Poll does not exist");
        return poll.votedChoiceId[_voter];
    }
}
```
