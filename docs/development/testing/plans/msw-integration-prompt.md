# MSW 導入実行プロンプト

## 📋 タスク概要

あなたは**SimpleVote プロジェクトの Playwright テスト問題を解決するエキスパート**です。現在、ethers.js v6 のモック問題によりテストが失敗しており、MSW (Mock Service Worker)を導入してネットワークレベルでブロックチェーン RPC コールをモックする必要があります。

## 🎯 実行指示

### 前提条件

-   プロジェクトパス: `/c/Users/t-yamakawa/source/repos/SimpleVote`
-   作業ディレクトリ: `simple-vote-next/`
-   詳細計画書: `docs/development/testing/plans/msw-integration-plan.md`

### 実行コマンド

```
まず以下のファイルを読み込んで実行計画を理解してください：
read_file: docs/development/testing/plans/msw-integration-plan.md

その後、以下の段階的実装を実行してください：

Phase 1: MSW基盤構築
1. simple-vote-nextディレクトリでMSWライブラリをインストール
2. Service Workerファイルを生成
3. 基本設定ファイル（handlers.ts, server.ts, browser.ts）を作成

Phase 2: 最小限RPC実装
1. eth_callメソッドのモック実装
2. getPolls()のABIエンコード形式レスポンス作成
3. 投票データの正確な返却実装

Phase 3: テスト統合確認
1. 既存テストとの共存設定
2. "投票一覧が表示される（データがある場合）"テストでの動作確認
3. エラー解決とデバッグ

各Phase完了時に進捗を報告し、次の指示を待ってください。
```

## 🔧 技術要件

### 必須実装項目

-   [ ] MSW ライブラリのインストール (`npm install --save-dev msw`)
-   [ ] Service Worker 初期化 (`npx msw init public/ --save`)
-   [ ] RPC handlers 実装 (`tests/mocks/handlers.ts`)
-   [ ] テストサーバー設定 (`tests/mocks/server.ts`)
-   [ ] ブラウザ worker 設定 (`tests/mocks/browser.ts`)

### 重要な制約

1. **既存のモック機能は削除しない** - 段階的に移行
2. **エラー時は詳細ログ出力** - デバッグを容易に
3. **1 つずつテスト実行** - 各段階で動作確認

## 📊 成功指標

### 必達目標

-   [ ] MSW 基本設定が完了している
-   [ ] `eth_call`のモックが動作している
-   [ ] `投票一覧が表示される（データがある場合）`テストが成功している

### 品質指標

-   [ ] 既存テストが破壊されていない
-   [ ] エラーメッセージが明確
-   [ ] 実装が段階的で理解しやすい

## ⚠️ 重要な注意事項

### エラー対応

```
エラーが発生した場合：
1. 詳細なエラーログを出力
2. 現在の実装状況を報告
3. 次のステップの提案を含める
4. 必要に応じて代替案を提示
```

### コミュニケーション

```
各Phase完了時の報告形式：
✅ Phase N 完了: [実装内容]
📋 作成ファイル: [ファイルリスト]
🧪 テスト結果: [成功/失敗/部分成功]
🔄 次のステップ: [次に行うこと]
❗ 注意事項: [あれば記載]
```

## 🚀 実行開始プロンプト

---

**以下をコピーして Background Agent に送信してください：**

```
SimpleVoteプロジェクトのPlaywrightテスト問題を解決するため、MSW (Mock Service Worker)を導入してください。

作業手順：
1. まず `docs/development/testing/plans/msw-integration-plan.md` を読み込んで計画を理解
2. Phase 1から段階的に実装
3. 各Phase完了時に進捗報告
4. "投票一覧が表示される（データがある場合）"テストの成功を最終目標とする

現在の問題：ethers.js v6のBytesLikeエラーでテストが失敗
解決方針：ネットワークレベルでブロックチェーンRPCコールをモック

プロジェクトパス: /c/Users/t-yamakawa/source/repos/SimpleVote
作業ディレクトリ: simple-vote-next/

Phase 1から開始してください。
```

---
