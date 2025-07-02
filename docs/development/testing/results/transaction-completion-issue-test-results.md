# トランザクション完了問題のテスト結果分析

## 概要

トランザクション完了後の処理に関する調査の一環として、`Simple Vote作成`テストを実行し、その結果を詳細に分析しました。

**実行日時**: 2025年7月2日
**対象テスト**: `poll-creation.spec.ts > 投票作成テスト > Simple Vote作成`
**実行環境**: Chromium（他ブラウザも同様の挙動が想定される）

---

## テスト結果サマリ

| 項目 | 結果 |
|------|------|
| **テスト結果** | ❌ 失敗（`failed`） |
| **実行時間** | 13.254秒 |
| **失敗箇所** | トーストメッセージの検証 |
| **期待値** | 「議題を作成しました」 |
| **実際の値** | 「トランザクション承認待ち…」 |

---

## エラー詳細

### エラーメッセージ
```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "議題を作成しました"
Received string:    "トランザクション承認待ち…"
```

### エラー発生箇所
- **ファイル**: `tests/helpers/ethers-mock.ts`
- **行**: 741
- **関数**: `waitForToast`
- **呼び出し元**: `poll-creation.spec.ts:277`

### スタックトレース
```
at waitForToast (helpers/ethers-mock.ts:741:23)
at poll-creation.spec.ts:277:9
```

---

## ブラウザコンソールログ分析

### ✅ 正常に動作している部分

1. **モックの初期化**
   ```
   Browser console [log]: Setting up complete ethers.js mock...
   Browser console [log]: Mock ethers object set: {isAddress: , parseUnits: , formatUnits: , getBigInt: , id: }
   Browser console [log]: Mock ethers.Contract available: class MockContract
   ```

2. **ウォレット接続**
   ```
   Browser console [log]: Mock ethereum.request called with: {method: eth_requestAccounts, params: Array(0)}
   Browser console [log]: Returning mock accounts: [0x1234567890123456789012345678901234567890]
   ```

3. **アプリ側でのモック適用**
   ```
   Browser console [log]: Applying mock ethers in create page
   ```

4. **トランザクション送信まで**
   ```
   Browser console [log]: Calling registry.createPoll...
   Browser console [log]: Mock ethereum.request called with: {method: eth_sendTransaction, params: Array(1)}
   Browser console [log]: Returning mock transaction hash: 0x1234567890...
   ```

### ❌ 問題が発生している部分

1. **`tx.wait()`の呼び出しログが出力されていない**
   - 期待されるログ: `Mock tx.wait() called`
   - 実際のログ: 出力されていない

2. **アプリ側の`tx.wait()`後の処理ログが出力されていない**
   - 期待されるログ: `tx.wait() completed successfully`
   - 実際のログ: 出力されていない

3. **成功トーストが表示されない**
   - 期待されるトースト: 「議題を作成しました」
   - 実際のトースト: 「トランザクション承認待ち…」のまま

---

## ページスナップショット分析

### エラー時のUI状態
```yaml
- button "作成中..." [disabled]
- text: トランザクション承認待ち…
```

### 正常な状態との比較
- **正常時**: 「作成」ボタン → 「作成中...」ボタン → 「議題を作成しました」トースト
- **現在**: 「作成」ボタン → 「作成中...」ボタン（無効化） → 「トランザクション承認待ち…」で停止

---

## 問題の根本原因分析

### 1. モック適用の問題
- モックの初期化ログは出力されている
- アプリ側でもモック適用のログが出力されている
- しかし、実際のトランザクション処理では実際のethers.jsが使用されている可能性

### 2. 非同期処理の問題
- `registry.createPoll()`は正常に呼び出されている
- しかし、返されたトランザクションオブジェクトの`wait()`メソッドが呼び出されていない
- または、`wait()`メソッドが呼び出されているが、その後の処理が実行されていない

### 3. エラーハンドリングの問題
- `tx.wait()`の呼び出しでエラーが発生している可能性
- エラーが適切にキャッチされていない可能性

---

## 技術的詳細

### モックトランザクションオブジェクトの構造
```javascript
const mockTx = {
    hash: '0x1234567890123456789012345678901234567890123456789012345678901234',
    from: '0x1234567890123456789012345678901234567890',
    to: '0x0000000000000000000000000000000000000000',
    gasLimit: '0x186A0',
    value: '0x0',
    nonce: '0x1',
    data: '0x',
    wait: async () => {
        console.log('Mock tx.wait() called');
        // ... レシート返却処理
        return receipt;
    }
};
```

### アプリ側の期待する処理フロー
1. `registry.createPoll()` 呼び出し
2. トランザクションオブジェクト取得
3. `tx.wait()` でレシート待機
4. レシートログのパース
5. イベント検知とトースト表示

---

## 次の調査ステップ

### 1. モック適用の確認強化
- アプリ側で実際に使用されているethers.jsの確認
- モックと実際のethers.jsの切り替えタイミングの確認

### 2. 非同期処理の詳細調査
- `tx.wait()`の呼び出し前後でのログ追加
- Promiseチェーンの詳細な追跡

### 3. エラーハンドリングの強化
- try-catch文でのエラー詳細の出力
- 非同期処理でのエラー伝播の確認

### 4. テスト環境の確認
- ブラウザ環境での非同期処理の実行状況
- テスト実行時のタイミング問題の確認

---

## 添付ファイル

- **エラー時スクリーンショット**: `poll-creation-投票作成テスト-Simple-Vote作成-chromium/test-failed-1.png`
- **エラー時動画**: `poll-creation-投票作成テスト-Simple-Vote作成-chromium/video.webm`
- **エラー詳細マークダウン**: `poll-creation-投票作成テスト-Simple-Vote作成-chromium/error-context.md`

---

## 結論

現在の問題は、**モックの`tx.wait()`メソッドが正常に動作しているにも関わらず、アプリ側でその後の処理が実行されていない**ことです。

これは以下のいずれかが原因と考えられます：
1. モックトランザクションオブジェクトの形式がアプリ側の期待と異なる
2. 非同期処理の実行コンテキストに問題がある
3. エラーハンドリングで処理が止まっている

次のステップとして、アプリ側のエラーハンドリングを強化し、`tx.wait()`の呼び出し前後で詳細なログを追加して、具体的な問題箇所を特定する必要があります。

---

**調査者**: AI Assistant
**関連ファイル**:
- `tests/poll-creation.spec.ts`
- `tests/helpers/ethers-mock.ts`
- `app/create/page.tsx`
- `docs/development/testing/investigations/transaction-completion-issue.md`