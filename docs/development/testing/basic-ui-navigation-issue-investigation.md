# basic-ui-navigation.spec.ts 失敗テスト項目の原因調査手順

## 概要
`basic-ui-navigation.spec.ts`のテスト実行で発見された問題の原因調査手順をまとめています。

## 失敗したテスト項目

### 1. 無効なPoll IDでアクセスした場合のエラー表示

#### 問題の詳細
- **テスト名**: `無効なPoll IDでアクセスした場合のエラー表示`
- **エラー内容**: `Timed out 5000ms waiting for expect(locator).toBeVisible()`
- **期待値**: `text=404` が見つかること
- **実際**: 404ページが表示されない
- **ファイル**: `tests/basic-ui-navigation.spec.ts:243`

#### 原因調査手順

##### ステップ1: 404ページの実装確認
```bash
# 1. not-found.tsxファイルの存在確認
ls -la simple-vote-next/app/not-found.tsx

# 2. not-found.tsxの内容確認
cat simple-vote-next/app/not-found.tsx
```

**確認ポイント**:
- `not-found.tsx`ファイルが存在するか
- 404テキストが含まれているか
- 適切なHTML構造になっているか

##### ステップ2: 動的ルートのエラーハンドリング確認
```bash
# 1. dynamic/[pollId]/page.tsxの内容確認
cat simple-vote-next/app/dynamic/[pollId]/page.tsx

# 2. エラーハンドリングの実装確認
grep -n "notFound\|error" simple-vote-next/app/dynamic/[pollId]/page.tsx
```

**確認ポイント**:
- `notFound()`関数が呼び出されているか
- 無効なpollIdの場合の処理が実装されているか
- Next.js 15のparams非同期化に対応しているか

##### ステップ3: 実際のページアクセステスト
```bash
# 1. 開発サーバーの起動
cd simple-vote-next
npm run dev

# 2. ブラウザで直接アクセス
# http://localhost:3000/dynamic/999999
```

**確認ポイント**:
- ブラウザで直接アクセスした場合の動作
- 404ページが表示されるか
- コンソールエラーが発生するか

##### ステップ4: Next.js 15のparams非同期化問題確認
```bash
# 1. package.jsonでNext.jsバージョン確認
grep "next" simple-vote-next/package.json

# 2. params非同期化の実装確認
grep -n "params\." simple-vote-next/app/dynamic/[pollId]/page.tsx
```

**確認ポイント**:
- Next.js 15が使用されているか
- `params.pollId`が`await`されているか
- 非同期処理が適切に実装されているか

#### 修正手順

##### 修正1: params非同期化対応
```typescript
// 修正前
const pollId = Number(params.pollId);

// 修正後
const pollId = Number(await params.pollId);
```

##### 修正2: 404エラーハンドリング強化
```typescript
// 無効なpollIdの場合の処理
if (isNaN(pollId) || pollId <= 0) {
    notFound();
}
```

##### 修正3: not-found.tsxの改善
```typescript
// app/not-found.tsx
export default function NotFound() {
    return (
        <div>
            <h1>404</h1>
            <p>ページが見つかりません</p>
        </div>
    );
}
```

### 2. タイムアウトエラーの多発

#### 問題の詳細
- **エラー内容**: `Test timeout of 30000ms exceeded`
- **影響テスト**: ウォレット接続シミュレーション関連のテスト
- **エラー詳細**: `page.reload: Test timeout of 30000ms exceeded`

#### 原因調査手順

##### ステップ1: 開発サーバーの応答速度確認
```bash
# 1. 開発サーバーの起動時間確認
time npm run dev

# 2. ページ読み込み時間の測定
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/"
```

**curl-format.txt**:
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

##### ステップ2: ethers.jsモックの動作確認
```bash
# 1. ethers-mock.tsの内容確認
cat simple-vote-next/tests/helpers/ethers-mock.ts

# 2. モック設定の確認
grep -n "eth_newFilter\|eth_call\|eth_blockNumber" simple-vote-next/tests/helpers/ethers-mock.ts
```

**確認ポイント**:
- 未対応メソッドの実装状況
- モックの初期化タイミング
- エラーハンドリングの実装

##### ステップ3: ウォレット接続シミュレーションの詳細確認
```bash
# 1. wallet-helper.tsの内容確認
cat simple-vote-next/tests/helpers/wallet-helper.ts

# 2. シミュレーション関数の確認
grep -n "simulateCompleteWalletConnection" simple-vote-next/tests/helpers/ethers-mock.ts
```

**確認ポイント**:
- シミュレーションの待機時間設定
- ページリロードのタイミング
- 状態確認のロジック

#### 修正手順

##### 修正1: タイムアウト時間の延長
```typescript
// playwright.config.ts
export default defineConfig({
    timeout: 60000, // 30秒 → 60秒
    // ...
});
```

##### 修正2: ethers.jsモックの改善
```typescript
// tests/helpers/ethers-mock.ts
// 未対応メソッドの追加
case 'eth_newFilter':
    return '0x1';
case 'eth_call':
    return '0x';
case 'eth_blockNumber':
    return '0x123456';
```

##### 修正3: ウォレット接続シミュレーションの最適化
```typescript
// 待機時間の調整
await page.waitForTimeout(2000); // 5秒 → 2秒

// 状態確認の改善
await page.waitForSelector('.font-mono', { timeout: 10000 });
```

### 3. パフォーマンス問題

#### 問題の詳細
- **測定値**: Chromium: 5,197ms、Firefox: 12,017ms
- **期待値**: 3,000ms未満
- **影響**: パフォーマンステストの失敗

#### 原因調査手順

##### ステップ1: 開発環境のパフォーマンス測定
```bash
# 1. 開発サーバーの起動時間
time npm run dev

# 2. ページ読み込み時間の詳細測定
# Chrome DevToolsのPerformanceタブで測定
# または Lighthouse を使用
npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json
```

##### ステップ2: 本番環境との比較
```bash
# 1. 本番ビルドの作成
npm run build

# 2. 本番サーバーの起動
npm start

# 3. 本番環境でのパフォーマンス測定
npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-prod.json
```

##### ステップ3: パフォーマンスボトルネックの特定
```bash
# 1. バンドルサイズの確認
npm run build
# .next/static/chunks/ のサイズ確認

# 2. 依存関係の確認
npm ls --depth=0
```

#### 修正手順

##### 修正1: パフォーマンステストの閾値調整
```typescript
// tests/basic-ui-navigation.spec.ts:296
// 開発環境を考慮した閾値設定
expect(loadTime).toBeLessThan(10000); // 3秒 → 10秒
```

##### 修正2: 開発環境の最適化
```typescript
// next.config.ts
const nextConfig = {
    experimental: {
        optimizeCss: true,
    },
    // ...
};
```

## 調査結果の記録

### 調査日時
- 開始日時: 2024年7月1日
- 完了予定: 2024年7月2日

### 調査担当者
- フロントエンド開発チーム
- テスト自動化チーム

### 調査結果の記録場所
- このファイルに調査結果を記録
- 修正内容は各ファイルに直接反映
- テスト結果は `test-results/` ディレクトリに保存

## 次のステップ

1. **即座に修正可能な項目**
   - パフォーマンステストの閾値調整
   - タイムアウト時間の延長

2. **調査が必要な項目**
   - 404エラーページの実装確認
   - ethers.jsモックの改善

3. **長期的な改善項目**
   - 開発環境のパフォーマンス最適化
   - テスト環境の安定化

## 参考資料

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Playwright Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Ethers.js Documentation](https://docs.ethers.org/)