// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title WeightedVote
 * @notice トークン量に応じた重み付き投票を行うコントラクトです。
 * DynamicVote を基に、投票時に ERC20 トークンを預け入れます。
 */
contract WeightedVote is Ownable {
    /// 投票に使うトークン
    IERC20 public immutable token;
    /// 議題
    string public topic;
    /// 選択肢 ID => 選択肢名
    mapping(uint256 => string) public choice;
    /// アドレス => 投票した選択肢 ID (0 は未投票)
    mapping(address => uint256) public votedChoiceId;
    /// 選択肢 ID => 票数
    mapping(uint256 => uint256) public voteCount;
    /// 各アドレスが預けたトークン量
    mapping(address => uint256) public deposited;
    /// 選択肢の総数（最大 10）
    uint256 public choiceCount;
    /// 投票開始時刻
    uint256 public startTime;
    /// 投票終了時刻
    uint256 public endTime;

    event ChoiceAdded(uint256 id, string name);
    event VoteCast(address voter, uint256 choiceId, uint256 amount);
    event VoteCancelled(address indexed voter, uint256 choiceId, uint256 amount);

    /// @param _topic 議題
    /// @param _token 投票に利用する ERC20 トークン
    /// @param _startTime 投票開始時刻
    /// @param _endTime 投票終了時刻
    /// @param _choices 初期選択肢の配列
    constructor(
        string memory _topic,
        IERC20 _token,
        uint256 _startTime,
        uint256 _endTime,
        string[] memory _choices
    ) Ownable(msg.sender) {
        require(_endTime > _startTime, "end must be after start");
        topic = _topic;
        token = _token;
        startTime = _startTime;
        endTime = _endTime;

        for (uint i = 0; i < _choices.length; i++) {
            if (bytes(_choices[i]).length > 0) {
                _addChoiceInternal(_choices[i]);
            }
        }
    }

    /**
     * @notice 新しい選択肢を追加します。オーナーのみ実行可能です。
     * @param name 選択肢の名前
     */
    function addChoice(string calldata name) external onlyOwner {
        _addChoiceInternal(name);
    }

    /**
     * @notice 選択肢を追加する内部関数
     * @param name 選択肢の名前
     */
    function _addChoiceInternal(string memory name) internal {
        require(choiceCount < 10, "too many choices");
        uint256 id = ++choiceCount;
        choice[id] = name;
        emit ChoiceAdded(id, name);
    }

    /**
     * @notice トークンを預け入れて投票します。
     * @param choiceId 1 から choiceCount までの選択肢 ID
     * @param amount 預けるトークン量（そのまま票数となります）
     */
    function vote(uint256 choiceId, uint256 amount) external {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Voting closed"
        );
        require(votedChoiceId[msg.sender] == 0, "Already voted. Cancel first");
        require(choiceId > 0 && choiceId <= choiceCount, "invalid id");
        require(amount > 0, "amount zero");

        require(token.transferFrom(msg.sender, address(this), amount));
        voteCount[choiceId] += amount;
        deposited[msg.sender] = amount;
        votedChoiceId[msg.sender] = choiceId;
        emit VoteCast(msg.sender, choiceId, amount);
    }

    /// @notice 投票を取り消し、預けたトークンを返却します
    function cancelVote() external {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Voting closed"
        );
        uint256 prev = votedChoiceId[msg.sender];
        require(prev != 0, "No vote to cancel");
        uint256 amount = deposited[msg.sender];
        voteCount[prev] -= amount;
        deposited[msg.sender] = 0;
        votedChoiceId[msg.sender] = 0;
        require(token.transfer(msg.sender, amount));
        emit VoteCancelled(msg.sender, prev, amount);
    }

    /// @notice 全選択肢の名前を配列で取得
    function getChoices() external view returns (string[] memory names) {
        names = new string[](choiceCount);
        for (uint256 i = 0; i < choiceCount; i++) {
            names[i] = choice[i + 1];
        }
    }
}