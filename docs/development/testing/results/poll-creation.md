# 投票作成テスト実行結果レポート

## 概要

- テストファイル: `simple-vote-next/tests/poll-creation.spec.ts`
- 実行日: 2024年12月19日
- ブラウザ: Chromium, Firefox, WebKit
- 総テスト数: 10ケース × 3ブラウザ = 30

## サマリー

| 結果   | 件数 | 備考         |
|--------|------|--------------|
| 成功   | 3    | UI系のみ     |
| 失敗   | 27   | 主要機能全滅 |

## 主な失敗内容と原因

### 1. Toast要素の重複
- **エラー例**: `strict mode violation: locator('[data-testid="toast"]') resolved to 2 elements`
- **原因**: 複数のトーストが同時に表示されるため、テストヘルパーが単一要素を期待して失敗

### 2. フォーム要素のセレクタ不一致
- **エラー例**: `TimeoutError: locator.fill: Timeout 5000ms exceeded`
- **原因**: `input[name="end"]` というセレクタが実際のHTMLに存在しない

### 3. 選択肢入力の部分一致
- **エラー例**: `strict mode violation: locator('input[placeholder*="選択肢 1"]') resolved to 2 elements`
- **原因**: 「選択肢 10」も「選択肢 1」に部分一致してしまう

### 4. トークンアドレスバリデーション
- **エラー例**: `Expected substring: "トークンアドレスを正しく入力してください"`
- **原因**: バリデーションロジックが正しく動作していない、またはトーストの競合

## 詳細

### 成功したテスト
- ページの基本表示
- 投票タイプ変更時のUI更新
- 戻るボタンの動作

### 失敗したテスト
- フォームバリデーション
- Dynamic Vote作成
- Weighted Vote作成
- Simple Vote作成
- 選択肢の追加・削除
- トランザクションエラーハンドリング
- トランザクション承認待ち状態の表示

## 推奨修正

1. **waitForToastヘルパーの修正例**
    ```ts
    // 最新のトーストのみ検証するよう修正
    const toasts = page.locator('[data-testid="toast"]');
    const count = await toasts.count();
    const latestToast = toasts.nth(count - 1);
    await expect(latestToast).toBeVisible();
    const toastText = await latestToast.textContent();
    expect(toastText).toContain(expectedMessage);
    ```

2. **フォームセレクタの修正例**
    ```ts
    // name属性ではなくtype属性で特定
    await page.locator('input[type="datetime-local"]').nth(1).fill(...);
    ```

3. **選択肢入力のセレクタ修正例**
    ```ts
    await page.locator(`input[placeholder="選択肢 ${i + 1}"]`).fill(...);
    ```

4. **バリデーションロジックの見直し**

## 結論

現在のテストは90%失敗しており、主に以下の問題があります：

1. **Toast要素の重複表示**: 最も重要な問題で、複数のテストケースに影響
2. **フォーム要素の特定**: セレクターの不整合
3. **選択肢入力の誤マッチ**: プレースホルダーテキストの部分一致問題
4. **バリデーションロジック**: 期待される動作と実際の動作の不一致

これらの問題を修正することで、テストの成功率を大幅に向上させることができます。