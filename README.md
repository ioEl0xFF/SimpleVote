# SimpleVote

簡単な投票コントラクトと React 製フロントエンドのサンプルです。

## WeightedVote について

`WeightedVote.sol` はトークン保有量に比例した重み付き投票を実現するコントラクトです。コンストラクタで対象トークンと計算モード（ERC20 か ERC721）を指定します。`vote()` を呼び出すと保有残高分の重みが加算され、結果は `getVotes()` で確認できます。

`WeightedDynamicVote.sol` は DynamicVote を拡張したもので、複数選択肢への投票をトークン残高に応じた重み付きで行えます。ERC20 と ERC721 のどちらのトークンでも利用可能です。

### オフチェーン集計モード

大量の投票をガスコスト無しで集計したい場合は [Snapshot.js](https://docs.snapshot.org/) を利用した署名ベースの方式も考慮できます。フロントエンドから署名のみ送信し、バックエンドで残高を参照して集計後、`resultSubmit()` のような専用関数で結果だけをチェーンへ書き込む方法です。

## セットアップ

```bash
npm install
```

`.env.example` をコピーして `.env` を作成し、各項目を編集してください。

## テスト実行

```bash
npm test
```

## コントラクトデプロイ

### SimpleVote
```bash
npx hardhat run scripts/deploy_simple.js --network amoy
```

### DynamicVote
`.env` に `TOPIC` と `CHOICES` を用意しておくとスクリプトが読み込みます。
```bash
npx hardhat run scripts/deploy_dynamic.js --network amoy
```

### WeightedSimpleVote
`.env` に `TOKEN_ADDRESS` と `WEIGHT_MODE` (0: ERC20, 1: ERC721) を記述します。
```bash
npx hardhat run scripts/deploy_weighted.js --network amoy
```

### WeightedDynamicVote
`.env` の `TOPIC`, `CHOICES`, `TOKEN_ADDRESS`, `WEIGHT_MODE` を使ってデプロイします。
```bash
npx hardhat run scripts/deploy_weighted_dynamic.js --network amoy
```

## フロントエンド

```bash
cd simple-vote-ui
npm install
npm run dev
```
