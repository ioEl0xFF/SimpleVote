# 単一コントラクトによる投票管理システム設計仕様

## 1. 目的

現在の「SimpleVote」プロジェクトでは、新しい投票（議題）が作成されるたびに個別のスマートコントラクト（`DynamicVote` または `WeightedVote`）がデプロイされています。この設計は、投票数が増えるにつれてデプロイコストの増大や管理の複雑化を招く可能性があります。

本仕様書は、この課題を解決するため、単一のスマートコントラクトで全ての投票データを管理する新しい設計を提案します。これにより、ガス効率の向上、デプロイ時間の短縮、およびシステム全体の管理の簡素化を目指します。

## 2. 現行設計の課題

*   **高コスト:** 投票が作成されるたびに新しいコントラクトをデプロイするため、高額なガス代が発生します。
*   **デプロイ時間:** コントラクトのデプロイにはネットワークの混雑状況により時間がかかります。
*   **管理の複雑さ:** 多数の投票コントラクトがデプロイされると、それらのアドレス管理やフロントエンドからのアクセスが複雑になります。

## 3. 新設計の概要

`PollManager.sol` を置き換え、全ての投票の作成、管理、投票ロジックを内包する単一のスマートコントラクトを導入します。この新しいコントラクトは、各投票を内部のデータ構造（`struct`）として保持し、一意のIDで識別します。

## 4. 新コントラクト名

`PollRegistry.sol` (仮称)

## 5. 新コントラクトの構造

新しい `PollRegistry.sol` コントラクトは、以下の主要なデータ構造と状態変数を持ちます。

### 5.1. `enum PollType`

投票の種類を識別するための列挙型。

```solidity
enum PollType {
    DYNAMIC_VOTE,
    WEIGHTED_VOTE,
    SIMPLE_VOTE // SimpleVoteも統合する場合
}
```

### 5.2. `struct Choice`

各選択肢の情報を保持する構造体。

```solidity
struct Choice {
    string name;
    uint256 voteCount; // DynamicVote, SimpleVote の票数
}
```

### 5.3. `struct Poll`

各投票（議題）の詳細情報を保持する構造体。

```solidity
struct Poll {
    uint256 id;
    PollType pollType;
    address owner;
    string topic;
    uint256 startTime;
    uint256 endTime;
    Choice[] choices; // 選択肢の配列
    mapping(address => uint256) votedChoiceId; // 投票者アドレス => 投票した選択肢ID (0は未投票)
    // WeightedVote 専用のデータ
    IERC20 token; // WeightedVote の場合のみ使用するトークンアドレス
    mapping(address => uint256) depositedAmounts; // WeightedVote の場合のみ使用する投票者 => 預け入れトークン量
    // SimpleVote 専用のデータ (SimpleVoteを統合する場合)
    // uint256 agreeCount;
    // uint256 disagreeCount;
}
```

### 5.4. 状態変数

```solidity
uint256 public nextPollId; // 次に作成される投票のID
mapping(uint256 => Poll) public polls; // 投票ID => Poll構造体
```

## 6. 新コントラクトの関数

### 6.1. 投票作成関数

`createPoll` 関数は、投票の種類に応じて異なるパラメータを受け取り、新しい投票を作成します。

```solidity
function createPoll(
    PollType _pollType,
    string memory _topic,
    uint256 _startTime,
    uint256 _endTime,
    string[] memory _choiceNames,
    address _tokenAddress // WeightedVote の場合のみ使用
) external returns (uint256 pollId) {
    require(_endTime > _startTime, "end must be after start");
    require(_choiceNames.length > 0, "choices cannot be empty");
    require(_choiceNames.length <= 10, "too many choices"); // 最大10件の選択肢

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
        require(_tokenAddress != address(0), "token address cannot be zero");
        newPoll.token = IERC20(_tokenAddress);
    }
    // SimpleVote の場合、choices[0]を賛成、choices[1]を反対として扱うなど、内部ロジックで調整

    emit PollCreated(pollId, _pollType, msg.sender, _topic);
}
```

### 6.2. 投票関数

`vote` 関数は、指定された投票IDに対して投票を行います。投票の種類に応じて内部ロジックを分岐させます。

```solidity
function vote(
    uint256 _pollId,
    uint256 _choiceId,
    uint256 _amount // WeightedVote の場合のみ使用
) external {
    Poll storage poll = polls[_pollId];
    require(poll.id == _pollId, "Poll does not exist");
    require(block.timestamp >= poll.startTime && block.timestamp <= poll.endTime, "Voting closed");
    require(poll.votedChoiceId[msg.sender] == 0, "Already voted. Cancel first");
    require(_choiceId > 0 && _choiceId <= poll.choices.length, "Invalid choice ID");

    if (poll.pollType == PollType.WEIGHTED_VOTE) {
        require(_amount > 0, "Amount must be greater than zero");
        poll.token.safeTransferFrom(msg.sender, address(this), _amount);
        poll.choices[_choiceId - 1].voteCount += _amount;
        poll.depositedAmounts[msg.sender] = _amount;
    } else { // DYNAMIC_VOTE, SIMPLE_VOTE
        poll.choices[_choiceId - 1].voteCount += 1;
    }

    poll.votedChoiceId[msg.sender] = _choiceId;
    emit VoteCast(_pollId, msg.sender, _choiceId, _amount);
}
```

### 6.3. 投票キャンセル関数

`cancelVote` 関数は、指定された投票IDに対する投票を取り消します。

```solidity
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
```

### 6.4. 情報取得関数 (View Functions)

*   **`getPolls()`:** 全ての投票の概要リストを返します。
    ```solidity
    function getPolls() external view returns (uint256[] memory pollIds, PollType[] memory pollTypes, address[] memory owners, string[] memory topics) {
        // 全ての投票IDをループして情報を取得
        // 効率化のため、ページネーションやフィルタリングを考慮することも可能
    }
    ```
*   **`getPoll(uint256 _pollId)`:** 特定の投票の詳細情報を返します。
    ```solidity
    function getPoll(uint256 _pollId) external view returns (
        uint256 id,
        PollType pollType,
        address owner,
        string memory topic,
        uint256 startTime,
        uint256 endTime,
        string[] memory choiceNames,
        uint256[] memory voteCounts,
        address tokenAddress, // WeightedVote の場合
        uint256 depositedAmount // WeightedVote の場合
    ) {
        Poll storage poll = polls[_pollId];
        require(poll.id == _pollId, "Poll does not exist");

        // choiceNames と voteCounts を構築
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
            poll.depositedAmounts[msg.sender] // 現在のユーザーの預け入れ量
        );
    }
    ```
*   **`getVotedChoiceId(uint256 _pollId, address _voter)`:** 特定の投票者がある投票でどの選択肢に投票したかを返します。
    ```solidity
    function getVotedChoiceId(uint256 _pollId, address _voter) external view returns (uint256) {
        Poll storage poll = polls[_pollId];
        require(poll.id == _pollId, "Poll does not exist");
        return poll.votedChoiceId[_voter];
    }
    ```

## 7. イベント

主要な操作に対してイベントを発行し、オフチェーンアプリケーションがブロックチェーンの状態変化を効率的に監視できるようにします。

*   `event PollCreated(uint256 indexed pollId, PollType pollType, address indexed owner, string topic);`
*   `event VoteCast(uint256 indexed pollId, address indexed voter, uint256 choiceId, uint256 amount);`
*   `event VoteCancelled(uint256 indexed pollId, address indexed voter, uint256 choiceId);`

## 8. フロントエンド (`simple-vote-ui`) への影響

*   **`simple-vote-ui/src/constants.js`:**
    *   `POLL_MANAGER_ADDRESS` を新しい `PollRegistry` コントラクトのアドレスに更新します。
    *   `POLL_MANAGER_ABI` を新しい `PollRegistry` のABIに更新します。
    *   `DYNAMIC_VOTE_ABI`, `WEIGHTED_VOTE_ABI` は不要になります（または、内部的に使用されるABIとして残す）。
    *   `DYNAMIC_VOTE_ADDRESS`, `WEIGHTED_VOTE_ADDRESS` は不要になります。
*   **`simple-vote-ui/src/PollCreate.jsx`:**
    *   `createDynamicVote` や `createWeightedVote` の代わりに、`PollRegistry` の `createPoll` 関数を呼び出すように変更します。
    *   投票の種類（`pollType`）をパラメータとして渡すようにします。
    *   `token` アドレスは `WEIGHTED_VOTE` の場合にのみ渡します。
*   **`simple-vote-ui/src/PollList.jsx`:**
    *   `PollRegistry` の `getPolls` 関数を呼び出して、全ての投票の概要リストを取得するように変更します。
    *   各投票の詳細情報（トピック、選択肢など）は、`getPoll` 関数を呼び出して取得するように変更します。
*   **`simple-vote-ui/src/DynamicVote.jsx` および `simple-vote-ui/src/WeightedVote.jsx`:**
    *   これらのコンポーネントは、個別のコントラクトではなく、`PollRegistry` コントラクトの `vote` および `cancelVote` 関数を呼び出すように変更します。
    *   関数呼び出し時に、操作対象の `pollId` をパラメータとして渡すようにします。
    *   `WeightedVote.jsx` では、`PollRegistry` の `vote` 関数に `amount` を渡すようにします。
    *   `approve` 関数は、`PollRegistry` が保持するトークンアドレスに対して実行するように変更します。

## 9. テストへの影響

*   既存の `test/PollManager.js` は、新しい `PollRegistry.sol` のテストに置き換えられます。
*   `test/DynamicVote.js` および `test/WeightedVote.js` は、個別のコントラクトのテストではなく、`PollRegistry.sol` 内の対応するロジックをテストするように変更されます。
*   各テストケースは、`PollRegistry` の関数を呼び出し、内部の投票データが正しく更新されることを検証します。
