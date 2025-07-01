# BigNumberishエラー原因調査結果と修正方法

## 概要

SimpleVoteアプリケーションのテスト実行時に発生していた「invalid BigNumberish value」エラーの原因を特定し、修正方法をまとめました。

## エラーの詳細

### 発生状況
- **エラーメッセージ**: `TypeError: invalid BigNumberish value (argument="%response", value=null, code=INVALID_ARGUMENT, version=6.14.4)`
- **発生箇所**: ethers.jsの`BrowserProvider.estimateGas`メソッド内
- **影響範囲**: すべての投票作成テスト（Dynamic Vote、Weighted Vote、Simple Vote）

### エラーの特徴
- ethers.jsの内部処理で`getBigInt(null)`が呼ばれて発生
- モック環境でのみ発生
- 実際のアプリケーション側のパラメータ生成は正常

## 原因の特定

### 調査手順
1. **詳細ログの追加**: ethers-mock.tsとアプリケーション側にログ出力を追加
2. **コンソールログの確認**: テスト実行時のブラウザコンソールをキャプチャ
3. **パラメータの追跡**: アプリケーションからモックまでの値の流れを確認

### 調査結果

#### アプリケーション側のパラメータ（正常）
```javascript
// アプリケーション側で生成されるパラメータ
{
  pollTypeEnum: 0,           // number型
  topic: "テスト投票",        // string型
  s: 1751364180,            // number型（UNIXタイムスタンプ）
  eTime: 1751367780,        // number型（UNIXタイムスタンプ）
  filteredChoices: ["選択肢1", "選択肢2"], // string[]型
  tokenAddress: "0x0000000000000000000000000000000000000000" // string型
}
```

#### 問題の発生箇所
```javascript
// ethers.jsの内部処理で発生
BrowserProvider.estimateGas() {
  // eth_estimateGasのレスポンスがnullの場合
  const gasEstimate = null;
  return getBigInt(gasEstimate); // ← ここでエラー発生
}
```

### 根本原因
**ethers-mock.tsの`ethereum.request`で`eth_estimateGas`メソッドのモックが未実装だったため、`null`を返していた。**

```javascript
// 問題のあったコード
switch (args.method) {
    case 'eth_blockNumber':
        return '0x123456';
    default:
        console.log('Unknown method:', args.method);
        return null; // ← eth_estimateGasがここに該当
}
```

## 修正方法

### 修正内容
ethers-mock.tsの`ethereum.request`に`eth_estimateGas`のモックを追加

```javascript
// 修正後のコード
switch (args.method) {
    case 'eth_blockNumber':
        console.log('Returning mock block number: 0x123456');
        return '0x123456';
    case 'eth_estimateGas':
        console.log('Returning mock gas estimate: 0x186A0');
        return '0x186A0'; // ← 適当なガス値を返す
    default:
        console.log('Unknown method:', args.method);
        return null;
}
```

### 修正ファイル
- **ファイル**: `simple-vote-next/tests/helpers/ethers-mock.ts`
- **修正箇所**: `ethereum.request`メソッド内のswitch文

## 修正の効果

### 修正前
- `eth_estimateGas`が`null`を返す
- ethers.jsが`getBigInt(null)`を実行
- 「invalid BigNumberish value」エラーが発生
- すべての投票作成テストが失敗

### 修正後
- `eth_estimateGas`が適切なガス値（`0x186A0`）を返す
- ethers.jsが正常にBigInt変換を実行
- BigNumberishエラーが解消
- テストが次の段階（トランザクション送信）まで進行

## 追加で必要な修正

### 現在の状況
BigNumberishエラーは解消されましたが、以下のモックが未実装のため、テストは完全には成功しません：

1. **`eth_sendTransaction`**: トランザクション送信
2. **`eth_getTransactionByHash`**: トランザクションハッシュ取得
3. **`eth_getFilterChanges`**: イベントフィルター変更
4. **`eth_uninstallFilter`**: フィルター削除

### 推奨される追加修正
```javascript
case 'eth_sendTransaction':
    console.log('Returning mock transaction hash: 0x1234567890...');
    return '0x1234567890123456789012345678901234567890123456789012345678901234';
case 'eth_getTransactionByHash':
    console.log('Returning mock transaction receipt');
    return {
        hash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        status: 1,
        logs: [/* PollCreatedイベントのログ */]
    };
```

## 教訓とベストプラクティス

### 1. モックの完全性
- ethers.jsのモックを作成する際は、実際のethers.jsが呼び出すすべてのメソッドをモックする必要がある
- 特に`estimateGas`、`sendTransaction`、`getTransactionByHash`などは必須

### 2. エラーの段階的調査
- アプリケーション側のパラメータ生成を確認
- ethers.jsの内部処理を追跡
- モックの戻り値を検証

### 3. ログ出力の重要性
- 詳細なログ出力により、問題の特定が大幅に効率化された
- ブラウザコンソールのキャプチャが有効

## 結論

BigNumberishエラーの原因は、ethers.jsの`estimateGas`メソッドのモックが未実装で`null`を返していたことでした。適切なガス値を返すようにモックを修正することで、エラーは解消されました。

この修正により、テストは次の段階まで進行できるようになり、より完全なテスト環境の構築が可能になりました。

## 関連ファイル

- `simple-vote-next/tests/helpers/ethers-mock.ts` - モック実装
- `simple-vote-next/app/create/page.tsx` - 投票作成アプリケーション
- `simple-vote-next/tests/poll-creation.spec.ts` - テストファイル
- `docs/development/testing/bignumberish-error-investigation-guide.md` - 調査手順書 