# SimpleVote

簡単な投票コントラクトと React 製フロントエンドのサンプルです。

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

## イベントトレーサ

WebSocket プロバイダと対象コントラクトのアドレス、ABI ファイルを環境変数で指定して実行します。


```bash
WS_URL=wss://example.com CONTRACT_ADDRESS=0x123... \
CONTRACT_ABI_PATH=artifacts/contracts/DynamicVote.sol/DynamicVote.json \
node scripts/eventTracer.js
```

取得したログは `event-log.json` に保存されます。
