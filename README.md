# SimpleVote

簡単な投票コントラクトと React 製フロントエンドのサンプルです。

## WeightedVote について

`WeightedVote.sol` はトークン保有量に比例した重み付き投票を実現するコントラクトです。コンストラクタで対象トークンと計算モード（ERC20 か ERC721）を指定します。`vote()` を呼び出すと保有残高分の重みが加算され、結果は `getVotes()` で確認できます。

### オフチェーン集計モード

大量の投票をガスコスト無しで集計したい場合は [Snapshot.js](https://docs.snapshot.org/) を利用した署名ベースの方式も考慮できます。フロントエンドから署名のみ送信し、バックエンドで残高を参照して集計後、`resultSubmit()` のような専用関数で結果だけをチェーンへ書き込む方法です。

## セットアップ

```bash
npm install
```

## テスト実行

```bash
npm test
```

## コントラクトデプロイ

```bash
npm run deploy
```

## フロントエンド

```bash
cd simple-vote-ui
npm install
npm run dev
```
