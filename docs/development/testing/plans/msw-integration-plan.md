# MSW 導入計画 - SimpleVote プロジェクト

## 目的 (Purpose)

現在の Playwright テストで発生している**ethers.js v6 のモック問題を根本的に解決**し、安定した E2E テスト環境を構築する。

### 現在の問題

-   ethers.js v6 の`BytesLike`エラーによりテストが失敗
-   複雑なライブラリ内部のモックが困難
-   ウォレット接続後の投票データ取得でエラー発生

## ゴール (Goals)

### 主要ゴール

1. **MSW (Mock Service Worker)を導入**してネットワークレベルでブロックチェーン RPC コールをモック
2. **投票一覧表示テストを安定化**させる
3. **実際の ethers.js ライブラリを使用**しながらテストを実行可能にする

### 成功指標

-   [ ] `投票一覧が表示される（データがある場合）`テストが成功
-   [ ] 他のホームページテストも安定動作
-   [ ] 開発時にも MSW を活用可能

## 実装タスク

### Phase 1: MSW 基盤構築

#### 1.1 MSW ライブラリのインストール

```bash
cd simple-vote-next
npm install --save-dev msw
```

#### 1.2 MSW の初期設定

```bash
# Service Workerファイルの生成
npx msw init public/ --save
```

#### 1.3 基本設定ファイルの作成

-   `simple-vote-next/tests/mocks/handlers.ts` - MSW ハンドラー定義
-   `simple-vote-next/tests/mocks/server.ts` - テスト用 MSW サーバー設定
-   `simple-vote-next/tests/mocks/browser.ts` - ブラウザ用 MSW ワーカー設定

### Phase 2: ブロックチェーン RPC モック実装

#### 2.1 Ethereum RPC エンドポイントのモック

以下の RPC メソッドをモック：

-   `eth_call` - コントラクト関数呼び出し（getPolls 等）
-   `eth_blockNumber` - ブロック番号取得
-   `eth_chainId` - チェーン ID 取得
-   `eth_accounts` - アカウント一覧
-   `eth_getBalance` - 残高取得

#### 2.2 PollRegistry コントラクト専用モック

-   `getPolls()`メソッドの戻り値を ABI エンコード形式でモック
-   投票データ（ID、タイプ、オーナー、トピック）の正確な返却
-   空データ・エラー状態のモック

### Phase 3: Playwright テスト統合

#### 3.1 テストセットアップの修正

-   `tests/helpers/contract-mock.ts`の段階的置き換え
-   `tests/helpers/wallet-mock.ts`の簡略化
-   MSW を使用した新しいテストヘルパーの作成

#### 3.2 ホームページテストの更新

-   現在の複雑なモック処理を MSW に移行
-   テスト環境フラグ（`__PLAYWRIGHT_TEST__`）の削除
-   より自然なテストフローの実現

### Phase 4: 開発環境での活用

#### 4.1 開発時のモックサーバー

-   ローカル開発時にも MSW を活用
-   ブロックチェーンネットワークに依存しない開発環境
-   様々な投票データパターンの簡単なテスト

## 技術仕様

### MSW ハンドラーの構造例

```typescript
// tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
    // Ethereum RPC モック
    rest.post('https://localhost:8545', (req, res, ctx) => {
        const { method, params } = req.body;

        switch (method) {
            case 'eth_call':
                return handleEthCall(req, res, ctx, params);
            case 'eth_blockNumber':
                return res(ctx.json({ result: '0x1' }));
            // その他のメソッド...
        }
    }),
];

function handleEthCall(req, res, ctx, params) {
    // getPolls()のメソッドシグネチャを検出
    if (params[0].data.startsWith('0x5c01f867')) {
        // モック投票データをABIエンコード形式で返却
        return res(
            ctx.json({
                result: encodeGetPollsResponse([
                    { id: 1, type: 'dynamic', topic: 'プロジェクトの方向性について' },
                    { id: 2, type: 'weighted', topic: '技術スタックの選択' },
                    { id: 3, type: 'simple', topic: 'チームリーダーの選出' },
                ]),
            })
        );
    }

    return res(ctx.json({ result: '0x' }));
}
```

### Playwright テスト統合

```typescript
// tests/e2e/homepage/homepage.spec.ts
import { test, expect } from '@playwright/test';
import { server } from '../../mocks/server';

test.beforeAll(() => server.listen());
test.afterEach(() => server.resetHandlers());
test.afterAll(() => server.close());

test('投票一覧が表示される（データがある場合）', async ({ page }) => {
    // MSWが自動的にRPCコールをモック
    await page.goto('/');

    // 実際のethers.jsを使用してテスト
    // ...
});
```

## 実装順序

1. **MSW ライブラリのインストールと基本設定**
2. **最小限の RPC モック実装**（eth_call のみ）
3. **1 つのテストケースでの動作確認**
4. **全 RPC メソッドのモック拡張**
5. **全テストケースの移行**
6. **開発環境での活用設定**

## リスク・注意点

### 技術的リスク

-   ABI エンコード/デコードの正確な実装が必要
-   ethers.js が使用する RPC エンドポイントの特定が必要
-   Service Worker の動作がブラウザ環境に依存

### 対策

-   段階的な実装とテスト
-   既存のモック機能は当面並行運用
-   詳細なログ出力による動作確認

## 期待される効果

### 短期的効果

-   現在失敗しているテストの安定化
-   テストメンテナンスコストの削減

### 長期的効果

-   新しいコントラクト機能のテスト追加が容易
-   開発時のブロックチェーン依存の削減
-   より現実的なテスト環境の実現

## Background Agent への指示

### 最優先タスク

1. MSW ライブラリのインストールと基本設定
2. `eth_call`メソッドの最小限モック実装
3. `投票一覧が表示される（データがある場合）`テストでの動作確認

### 実装時の注意点

-   既存のモック機能は削除せず、段階的に置き換える
-   各段階でテスト実行して動作確認
-   エラーが発生した場合は詳細なログ出力を追加

### 成果物

-   動作する MSW 設定ファイル
-   投票データ取得のモック実装
-   1 つ以上のテストケースの成功

---

**担当者**: Background Agent  
**期限**: 実装可能な範囲で段階的に進行  
**連絡**: 各 Phase 完了時に進捗報告
