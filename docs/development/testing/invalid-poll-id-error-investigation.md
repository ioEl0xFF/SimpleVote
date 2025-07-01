# 無効なPoll IDでアクセスした場合のエラー表示不具合調査手順書

## 概要
SimpleVote Next.jsアプリケーションにおいて、無効なPoll IDでアクセスした場合のエラー表示が正常に動作しない問題の調査手順書です。

### 問題の詳細
- **テストケース**: `無効なPoll IDでアクセスした場合のエラー表示`
- **エラー内容**: `Timed out 5000ms waiting for expect(locator).toBeVisible()`
- **期待動作**: 404エラーページの表示
- **実際の動作**: 404エラーページが表示されない

## 調査手順

### ステップ1: 問題の再現確認

#### 1.1 テストの実行
```bash
cd simple-vote-next
npx playwright test --grep "無効なPoll IDでアクセスした場合のエラー表示" --reporter=list
```

#### 1.2 手動での再現確認
```bash
# Next.jsサーバーを起動
npm run dev

# ブラウザで以下のURLにアクセス
http://localhost:3000/dynamic/999999
http://localhost:3000/weighted/999999
http://localhost:3000/simple/999999
```

#### 1.3 期待される動作の確認
- 404エラーページが表示される
- "404"テキストが表示される
- 適切なエラーメッセージが表示される

### ステップ2: 関連ファイルの特定

#### 2.1 動的ルートファイルの確認
以下のファイルが問題の原因である可能性があります：

1. **Dynamic Voteページ**
   - `simple-vote-next/app/dynamic/[pollId]/page.tsx`

2. **Weighted Voteページ**
   - `simple-vote-next/app/weighted/[pollId]/page.tsx`

3. **Simple Voteページ**
   - `simple-vote-next/app/simple/[pollId]/page.tsx`

#### 2.2 エラーページファイルの確認
- `simple-vote-next/app/not-found.tsx`
- `simple-vote-next/app/error.tsx`

### ステップ3: コードの詳細調査

#### 3.1 動的ルートパラメータの処理確認

**調査対象**: `app/dynamic/[pollId]/page.tsx`

```typescript
// 現在のコード（問題のある部分）
const pollId = Number(params.pollId);

// 期待されるコード
const pollId = Number(await params.pollId);
```

**確認ポイント**:
1. `params.pollId`が`await`されているか
2. エラーハンドリングが適切か
3. 無効なpollIdの場合の処理

#### 3.2 エラーハンドリングの確認

**調査対象**: 各動的ルートファイル

```typescript
// 期待されるエラーハンドリング
if (isNaN(pollId) || pollId <= 0) {
    // 404エラーページにリダイレクトまたはnotFound()を呼び出し
    notFound();
}
```

**確認ポイント**:
1. `notFound()`関数の使用
2. 適切なエラーページへのリダイレクト
3. エラー状態の管理

#### 3.3 Next.js 13+ App Routerの仕様確認

**重要な変更点**:
- 動的ルートパラメータは`async`関数内で`await`する必要がある
- `params`オブジェクトは非同期で取得される

**正しい実装例**:
```typescript
export default async function DynamicVotePage({ params }: { params: Promise<{ pollId: string }> }) {
    const { pollId } = await params;
    const pollIdNumber = Number(pollId);

    if (isNaN(pollIdNumber) || pollIdNumber <= 0) {
        notFound();
    }
    // ...
}
```

### ステップ4: デバッグ情報の収集

#### 4.1 ブラウザコンソールの確認
```bash
# ブラウザの開発者ツールを開く
# Consoleタブでエラーメッセージを確認
```

**確認すべきエラー**:
- Next.jsの警告メッセージ
- JavaScriptエラー
- ネットワークエラー

#### 4.2 サーバーログの確認
```bash
# Next.jsサーバーのコンソール出力を確認
npm run dev
```

**確認すべきログ**:
- ルーティングエラー
- サーバーサイドエラー
- ビルドエラー

#### 4.3 Playwrightテストの詳細ログ
```bash
# 詳細なテストログを出力
npx playwright test --grep "無効なPoll IDでアクセスした場合のエラー表示" --reporter=verbose
```

### ステップ5: 問題の特定

#### 5.1 Next.js 13+ App Routerの問題
**症状**:
- `params.pollId`が`undefined`または`null`
- 動的ルートパラメータが正しく取得されない

**原因**:
- `params`オブジェクトが`await`されていない
- 非同期処理の不適切な実装

#### 5.2 エラーハンドリングの問題
**症状**:
- 無効なpollIdでも通常のページが表示される
- 404エラーページが表示されない

**原因**:
- `notFound()`関数が呼び出されていない
- エラー条件の判定が不適切

#### 5.3 ルーティングの問題
**症状**:
- 無効なURLでもページが表示される
- 適切なエラーページにリダイレクトされない

**原因**:
- Next.jsのルーティング設定の問題
- エラーページの設定不備

### ステップ6: 修正方法の検討

#### 6.1 動的ルートパラメータの修正
```typescript
// 修正前
export default function DynamicVotePage({ params }: { params: { pollId: string } }) {
    const pollId = Number(params.pollId);
    // ...
}

// 修正後
export default async function DynamicVotePage({ params }: { params: Promise<{ pollId: string }> }) {
    const { pollId } = await params;
    const pollIdNumber = Number(pollId);

    if (isNaN(pollIdNumber) || pollIdNumber <= 0) {
        notFound();
    }
    // ...
}
```

#### 6.2 エラーハンドリングの追加
```typescript
import { notFound } from 'next/navigation';

export default async function DynamicVotePage({ params }: { params: Promise<{ pollId: string }> }) {
    try {
        const { pollId } = await params;
        const pollIdNumber = Number(pollId);

        if (isNaN(pollIdNumber) || pollIdNumber <= 0) {
            notFound();
        }

        // 投票データの取得
        const poll = await getPoll(pollIdNumber);
        if (!poll) {
            notFound();
        }

        // 以降の処理...
    } catch (error) {
        console.error('Error in DynamicVotePage:', error);
        notFound();
    }
}
```

#### 6.3 テストケースの修正
```typescript
test('無効なPoll IDでアクセスした場合のエラー表示', async ({ page }) => {
    // 無効なPoll IDでアクセス
    await page.goto('/dynamic/999999');

    // 404エラーページの表示確認
    await expect(page.locator('text=404')).toBeVisible({ timeout: 10000 });

    // または、not-found.tsxの内容を確認
    await expect(page.locator('h1')).toContainText('404');
});
```

### ステップ7: 修正の実装

#### 7.1 各動的ルートファイルの修正
1. `app/dynamic/[pollId]/page.tsx`
2. `app/weighted/[pollId]/page.tsx`
3. `app/simple/[pollId]/page.tsx`

#### 7.2 エラーページの確認
- `app/not-found.tsx`の内容確認
- 適切な404エラーメッセージの表示

#### 7.3 テストの再実行
```bash
# 修正後のテスト実行
npx playwright test --grep "無効なPoll IDでアクセスした場合のエラー表示" --reporter=list
```

### ステップ8: 検証と確認

#### 8.1 修正の効果確認
- 無効なPoll IDでアクセスした際に404エラーページが表示される
- テストが成功する
- 他の機能に影響がない

#### 8.2 手動テストの実行
```bash
# ブラウザで以下のURLにアクセスして確認
http://localhost:3000/dynamic/999999
http://localhost:3000/weighted/999999
http://localhost:3000/simple/999999
```

#### 8.3 全テストの実行
```bash
# 全テストを実行して他の機能に影響がないことを確認
npx playwright test --reporter=list
```

## 期待される結果

### 修正後の動作
1. **無効なPoll IDアクセス**: 404エラーページが表示される
2. **テスト成功**: 該当テストケースが成功する
3. **全体的な改善**: テスト成功率が100%になる

### 技術的な改善
1. **Next.js 13+対応**: 動的ルートパラメータの適切な処理
2. **エラーハンドリング**: 適切なエラー状態の管理
3. **ユーザー体験**: 明確なエラーメッセージの表示

## 注意事項

1. **Next.js 13+ App Router**: 動的ルートパラメータは非同期処理が必要
2. **エラーハンドリング**: `notFound()`関数の適切な使用
3. **テストタイムアウト**: エラーページ表示の待機時間を適切に設定
4. **ブラウザ互換性**: 各ブラウザでの動作確認

## 参考資料

- [Next.js 13+ App Router Documentation](https://nextjs.org/docs/app)
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Playwright Testing Documentation](https://playwright.dev/docs/intro)

この手順書に従って調査・修正を行うことで、無効なPoll IDでアクセスした場合のエラー表示問題を解決できます。