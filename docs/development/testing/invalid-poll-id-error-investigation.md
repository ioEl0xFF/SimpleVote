# 無効なPoll IDでアクセスした場合のエラー表示問題の原因調査

## 問題概要

**エラー**: `Timed out 5000ms waiting for expect(locator).toBeVisible()`
**期待値**: `text=404` が見つかること
**実際**: 404ページが表示されない
**スクリーンショット**: `test-results/basic-ui-navigation-基本UI・ナ-89bd9-グ-無効なPoll-IDでアクセスした場合のエラー表示-chromium/test-failed-1.png`
**動画**: `test-results/basic-ui-navigation-基本UI・ナ-89bd9-グ-無効なPoll-IDでアクセスした場合のエラー表示-chromium/video.webm`

## 調査手順

### 1. 現在の404ページ実装の確認

#### 1.1 Next.jsのnot-found.tsxファイルの確認
```bash
# ファイルの存在確認
ls -la simple-vote-next/app/not-found.tsx

# ファイル内容の確認
cat simple-vote-next/app/not-found.tsx
```

**確認ポイント**:
- `not-found.tsx`ファイルが存在するか
- ファイル内容に`404`テキストが含まれているか
- 適切なエクスポートがされているか

#### 1.2 動的ルートでの404処理の確認
```bash
# 動的ルートファイルの確認
ls -la simple-vote-next/app/dynamic/[pollId]/page.tsx
ls -la simple-vote-next/app/simple/[pollId]/page.tsx
ls -la simple-vote-next/app/weighted/[pollId]/page.tsx
```

**確認ポイント**:
- 各動的ルートで`notFound()`関数が適切に呼び出されているか
- 無効なPoll IDの場合の処理が実装されているか

### 2. テストコードの詳細分析

#### 2.1 テストファイルの確認
```bash
# テストファイルの確認
cat tests/basic-ui-navigation.spec.ts
```

**確認ポイント**:
- 無効なPoll IDのテストケースがどのように実装されているか
- 期待している`text=404`のセレクターが正しいか
- タイムアウト設定（5000ms）が適切か

#### 2.2 テスト実行時の詳細ログ確認
```bash
# 詳細ログ付きでテスト実行
npx playwright test --debug tests/basic-ui-navigation.spec.ts
```

### 3. アプリケーションの動作確認

#### 3.1 開発サーバーでの手動確認
```bash
# 開発サーバー起動
cd simple-vote-next
npm run dev
```

**手動テスト手順**:
1. ブラウザで`http://localhost:3000/dynamic/invalid-poll-id`にアクセス
2. ブラウザで`http://localhost:3000/simple/invalid-poll-id`にアクセス
3. ブラウザで`http://localhost:3000/weighted/invalid-poll-id`にアクセス
4. 各URLで404ページが表示されるか確認

#### 3.2 ブラウザの開発者ツールでの確認
- ネットワークタブでリクエスト/レスポンスを確認
- コンソールタブでエラーメッセージを確認
- 要素タブで実際に表示されているHTMLを確認

### 4. Next.jsのルーティング設定確認

#### 4.1 next.config.tsの確認
```bash
cat simple-vote-next/next.config.ts
```

**確認ポイント**:
- ルーティング設定に問題がないか
- 404ページの設定が正しいか

#### 4.2 app/layout.tsxの確認
```bash
cat simple-vote-next/app/layout.tsx
```

**確認ポイント**:
- レイアウトファイルで404ページの表示を妨げる要素がないか

### 5. スクリーンショットと動画の分析

#### 5.1 失敗時のスクリーンショット確認
```bash
# スクリーンショットファイルの確認
ls -la test-results/basic-ui-navigation-基本UI・ナ-89bd9-グ-無効なPoll-IDでアクセスした場合のエラー表示-chromium/
```

**分析ポイント**:
- 実際に何が表示されているか
- 404ページが表示されているが、テキストが異なるか
- ページが完全に読み込まれていないか

#### 5.2 動画ファイルの確認
- テスト実行中の動作を確認
- ページ遷移のタイミングを確認
- エラーが発生するタイミングを特定

### 6. 考えられる原因と対策

#### 6.1 原因の候補
1. **not-found.tsxファイルが存在しない**
   - ファイルが削除されている、または作成されていない

2. **not-found.tsxの内容に問題がある**
   - `404`テキストが含まれていない
   - 適切なコンポーネントがエクスポートされていない

3. **動的ルートでnotFound()が呼び出されていない**
   - 無効なPoll IDの場合の処理が実装されていない

4. **テストのセレクターが間違っている**
   - `text=404`ではなく、実際のテキストが異なる

5. **タイムアウト設定が短すぎる**
   - 5000msではページの読み込みが完了しない

6. **Next.jsの設定問題**
   - ルーティング設定に問題がある

#### 6.2 対策の優先順位
1. **最優先**: `not-found.tsx`ファイルの存在と内容確認
2. **高優先**: 動的ルートでの`notFound()`呼び出し確認
3. **中優先**: テストのセレクターとタイムアウト設定の見直し
4. **低優先**: Next.js設定の確認

### 7. 修正後の検証手順

#### 7.1 修正内容の確認
```bash
# 修正したファイルの内容確認
cat simple-vote-next/app/not-found.tsx
cat simple-vote-next/app/dynamic/[pollId]/page.tsx
```

#### 7.2 テストの再実行
```bash
# 特定のテストケースのみ実行
npx playwright test --grep "無効なPoll IDでアクセスした場合のエラー表示"
```

#### 7.3 手動での動作確認
- 開発サーバーでの手動テスト
- 本番ビルドでの動作確認

## 調査結果の記録

### 調査日時
- 開始日時: 2024年12月19日
- 完了日時: 2024年12月19日

### 発見した問題

#### 1. not-found.tsxの内容に問題がある
- **ファイルの存在**: ✅ 存在する
- **404テキストの有無**: ❌ 「404」というテキストが含まれていない
- **実際の内容**: 「ページが見つかりません」という日本語のテキストが使用されている

```tsx
// simple-vote-next/app/not-found.tsx の内容
<h1 className="text-2xl font-bold text-gray-900 mb-2">ページが見つかりません</h1>
```

#### 2. 動的ルートでの404処理が不適切
- **notFound()関数の使用**: ❌ 各動的ルートで`notFound()`関数が呼び出されていない
- **独自エラーメッセージ**: ✅ 「無効なPoll IDです」という独自のエラーメッセージを表示

```tsx
// simple-vote-next/app/dynamic/[pollId]/page.tsx の処理
if (isNaN(pollId) || pollId <= 0) {
    return (
        <App>
            <PageHeader title="Dynamic Vote" ... />
            <section className="flex flex-col items-center gap-4 mt-10">
                <p>無効なPoll IDです</p>
            </section>
        </App>
    );
}
```

#### 3. テストのセレクターが間違っている
- **期待するセレクター**: `text=404`
- **実際のテキスト**: 「ページが見つかりません」または「無効なPoll IDです」
- **テストコード**:
```tsx
await expect(page.locator('text=404')).toBeVisible();
```

### 原因の特定

テストが失敗する根本的な原因は以下の通りです：

1. **Next.jsの標準的な404処理が実行されていない**
   - 無効なPoll IDでアクセスした場合、Next.jsの標準的な404ページ（`not-found.tsx`）が表示されるのではなく、各動的ルートページ内で独自のエラーメッセージが表示される

2. **not-found.tsxに「404」テキストが存在しない**
   - `not-found.tsx`には「404」というテキストが含まれていないため、テストの`text=404`セレクターがマッチしない

3. **動的ルートでnotFound()関数が使用されていない**
   - 動的ルートでは`notFound()`関数が呼び出されていないため、Next.jsの標準的な404処理が実行されない

### 実施した修正

1. **not-found.tsxの修正**
    - `<h1>`タグに「404 - ページが見つかりません」と明示し、テストで`text=404`が検出できるように修正。
2. **動的ルートの修正**
    - `dynamic/[pollId]/page.tsx`
    - `simple/[pollId]/page.tsx`
    - `weighted/[pollId]/page.tsx`
    - 上記3ファイルで、無効なPoll ID（数値でない、または0以下）の場合に`notFound()`を呼び出すよう修正。
3. **テストの実行**
    - Playwrightの該当テスト（`無効なPoll IDでアクセスした場合のエラー表示`）が正しく動作することを確認。

### 修正後の結果

- 無効なPoll IDでアクセスした場合、Next.js標準の404ページ（「404 - ページが見つかりません」）が表示されるようになった。
- テストも正常にパスすることを確認。
- これにより、Next.jsのベストプラクティスに沿った一貫性のあるエラーハンドリングが実現できた。

#### 参考: 修正コミットの主な内容
- not-found.tsx: `<h1>`に「404 - 」を追加
- 各動的ルート: `notFound()`の呼び出しを追加し、独自エラーメッセージを廃止

---

**今後の運用**
- 他のテストも念のため全件実行し、影響がないか確認することを推奨
- 本番ビルドでも同様の挙動となるか、念のため確認

---

## 参考資料

- [Next.js 13+ App Router での404ページの実装方法](https://nextjs.org/docs/app/building-your-application/routing/not-found)
- [Playwrightでのテスト実行方法](https://playwright.dev/docs/running-tests)
- [動的ルートでのエラーハンドリング](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)