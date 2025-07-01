# 無効なPoll IDでアクセスした場合のエラー表示問題の原因分析

## 調査概要

**調査日時**: 2025年7月1日
**調査対象**: 無効なPoll IDでアクセスした場合のエラー表示テストの失敗
**エラー内容**: `Timed out 5000ms waiting for expect(locator).toBeVisible()`
**期待値**: `text=404` が見つかること
**実際**: 404ページが表示されない

## 調査手順書に沿った確認結果

### 1. 現在の404ページ実装の確認

#### 1.1 Next.jsのnot-found.tsxファイルの確認
✅ **ファイルの存在**: 存在する
✅ **404テキストの有無**: 「404 - ページが見つかりません」というテキストが含まれている
✅ **適切なエクスポート**: 正しく実装されている

```tsx
// simple-vote-next/app/not-found.tsx の内容
<h1 className="text-2xl font-bold text-gray-900 mb-2">
    404 - ページが見つかりません
</h1>
```

#### 1.2 動的ルートでの404処理の確認
✅ **notFound()関数の使用**: 各動的ルートで`notFound()`関数が呼び出されている

```tsx
// simple-vote-next/app/dynamic/[pollId]/page.tsx の処理
if (isNaN(pollId) || pollId <= 0) {
    notFound();
}
```

### 2. テストコードの詳細分析

#### 2.1 テストファイルの確認
✅ **テストケース**: 「無効なPoll IDでアクセスした場合のエラー表示」が実装されている
✅ **期待するセレクター**: `text=404`
✅ **テストURL**: `/dynamic/999999`
✅ **タイムアウト設定**: 5000ms（デフォルト）

```tsx
test('無効なPoll IDでアクセスした場合のエラー表示', async ({ page }) => {
    await page.goto('/dynamic/999999');
    await expect(page.locator('text=404')).toBeVisible();
});
```

### 3. アプリケーションの動作確認

#### 3.1 開発サーバーでの手動確認
❌ **実際の動作**: 無効なPoll IDでアクセスしても404ページが表示されない
❌ **エラーメッセージ**: Next.js 15の新しいエラーが発生

```
Error: Route "/dynamic/[pollId]" used `params.pollId`. `params` should be awaited before using its properties.
```

## 根本原因の特定

### 主要な問題

1. **Next.js 15の新しい制約**
   - `params`オブジェクトは`await`してから使用する必要がある
   - クライアントコンポーネント（`'use client'`）内で`params`を直接使用するとエラーが発生

2. **クライアントコンポーネントでのnotFound()使用**
   - 現在の実装では`'use client'`で始まるクライアントコンポーネント内で`notFound()`を呼び出している
   - クライアント側で`notFound()`を呼ぶと、サーバー側のnot-found.tsxが正しく表示されない場合がある

3. **Next.js公式ドキュメントの推奨事項違反**
   - `params`や`notFound()`はサーバーコンポーネントで使用することが推奨されている
   - クライアント側での利用は非推奨

### 技術的な詳細

#### 現在の問題のある実装
```tsx
'use client'; // ← クライアントコンポーネント

export default function DynamicVotePage({ params }: { params: { pollId: string } }) {
    const pollId = Number(params.pollId); // ← エラー: paramsをawaitしていない
    if (isNaN(pollId) || pollId <= 0) {
        notFound(); // ← クライアント側でnotFound()を呼び出し
    }
    // ...
}
```

#### 推奨される実装
```tsx
// 'use client' を外す（サーバーコンポーネント）

export default async function DynamicVotePage({ params }: { params: Promise<{ pollId: string }> }) {
    const { pollId } = await params; // ← paramsをawait
    const pollIdNum = Number(pollId);

    if (isNaN(pollIdNum) || pollIdNum <= 0) {
        notFound(); // ← サーバー側でnotFound()を呼び出し
    }
    // ...
}
```

## 影響範囲

### 影響を受けるファイル
1. `simple-vote-next/app/dynamic/[pollId]/page.tsx`
2. `simple-vote-next/app/simple/[pollId]/page.tsx`
3. `simple-vote-next/app/weighted/[pollId]/page.tsx`

### 影響を受ける機能
1. 無効なPoll IDでのアクセス時の404ページ表示
2. 動的ルーティングでのパラメータ処理
3. エラーハンドリングの一貫性

## 解決策

### 1. サーバーコンポーネントへの変更
- 各動的ルートページをサーバーコンポーネントに変更
- `'use client'`ディレクティブを削除
- `params`を`await`してから使用

### 2. コンポーネント構造の再設計
- サーバーコンポーネントでパラメータ検証と`notFound()`呼び出し
- クライアントコンポーネントはUI表示のみに専念
- データフェッチはサーバー側で実行

### 3. テストの修正
- 404ページの表示確認テストが正常に動作するようになる
- 一貫性のあるエラーハンドリングが実現

## 修正後の期待される動作

1. **無効なPoll IDでアクセス**
   - サーバー側で`notFound()`が呼び出される
   - Next.js標準の404ページ（`not-found.tsx`）が表示される
   - 「404 - ページが見つかりません」テキストが表示される

2. **テストの成功**
   - `text=404`セレクターが正しくマッチする
   - タイムアウトエラーが解消される

3. **Next.js 15の制約への準拠**
   - `params`の適切な`await`処理
   - サーバーコンポーネントでの`notFound()`使用

## 参考資料

- [Next.js 15 Dynamic APIs Documentation](https://nextjs.org/docs/messages/sync-dynamic-apis)
- [Next.js App Router notFound() Documentation](https://nextjs.org/docs/app/api-reference/functions/not-found)
- [Next.js Server vs Client Components](https://nextjs.org/docs/getting-started/react-essentials#server-components)

## 次のステップ

1. 各動的ルートページをサーバーコンポーネントに変更
2. `params`の`await`処理を実装
3. クライアントコンポーネントの分離
4. テストの再実行と動作確認
5. 他の動的ルートへの影響確認

---

**調査完了日時**: 2025年7月1日
**調査者**: AI Assistant
**次回更新予定**: 修正実装完了後