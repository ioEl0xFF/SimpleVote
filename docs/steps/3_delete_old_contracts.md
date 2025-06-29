# Step 3: 古いコントラクトファイルの削除

このステップでは、`PollRegistry.sol` に統合されるため不要になる既存のスマートコントラクトファイルを削除します。

## 3.1. 削除対象ファイル

以下のファイルを `contracts/` ディレクトリから削除します。

- `contracts/DynamicVote.sol`
- `contracts/MockERC20.sol`
- `contracts/PollManager.sol`
- `contracts/SimpleVote.sol`
- `contracts/WeightedVote.sol`

**注意:** `contracts/Lock.sol` は Hardhat Ignition のサンプルとして残すため、削除しません。

## 3.2. 実行コマンド

以下のコマンドを実行してファイルを削除します。

```bash
rm contracts/DynamicVote.sol
rm contracts/MockERC20.sol
rm contracts/PollManager.sol
rm contracts/SimpleVote.sol
rm contracts/WeightedVote.sol
```

## 3.3. コンパイルの確認

ファイル削除後、以下のコマンドを実行して、新しい `PollRegistry.sol` が正しくコンパイルされることを確認します。

```bash
npm run compile
```

コンパイルが成功すれば、このステップは完了です。
