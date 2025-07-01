# 無効なPoll IDエラー問題の修正計画

## 問題の概要

**問題**: 無効なPoll IDでアクセスした場合のテストが失敗する
**エラー**: `Timed out 5000ms waiting for expect(locator).toBeVisible()`
**期待値**: `text=404` が見つかること
**実際**: 404ページが表示されない

## 原因分析

### 1. not-found.tsxの問題
- **ファイル**: `simple-vote-next/app/not-found.tsx`
- **問題**: 「404」というテキストが含まれていない
- **現在の内容**: 「ページが見つかりません」という日本語テキストのみ

### 2. 動的ルートの404処理問題
- **ファイル**: 
  - `simple-vote-next/app/dynamic/[pollId]/page.tsx`
  - `simple-vote-next/app/simple/[pollId]/page.tsx`
  - `simple-vote-next/app/weighted/[pollId]/page.tsx`
- **問題**: `notFound()`関数が使用されていない
- **現在の処理**: 独自のエラーメッセージ「無効なPoll IDです」を表示

### 3. テストセレクターの問題
- **ファイル**: `simple-vote-next/tests/basic-ui-navigation.spec.ts`
- **問題**: `text=404`を検索しているが、実際のテキストと一致しない

## 修正方針の選択

### 方針A: Next.js標準の404処理を使用（推奨）
- 動的ルートで`notFound()`関数を使用
- `not-found.tsx`に「404」テキストを追加
- テストは現状のまま維持

### 方針B: 独自エラーメッセージを維持
- 動的ルートの独自エラーメッセージを維持
- テストのセレクターを「無効なPoll IDです」に変更

### 方針C: ハイブリッド対応
- `not-found.tsx`に「404」テキストを追加
- 動的ルートでは独自エラーメッセージを維持
- テストで両方のケースに対応

## 推奨修正方針: 方針A（Next.js標準の404処理を使用）

### 理由
1. **Next.jsのベストプラクティスに従う**
2. **一貫性のあるエラーハンドリング**
3. **SEOフレンドリーな404ページ**
4. **将来的な拡張性**

## 修正手順

### ステップ1: not-found.tsxの修正

**ファイル**: `simple-vote-next/app/not-found.tsx`

**修正内容**:
```tsx
import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
                <div className="flex justify-center mb-4">
                    <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">404 - ページが見つかりません</h1>
                <p className="text-gray-600 mb-6">
                    お探しのページは存在しないか、移動された可能性があります。
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    ホームに戻る
                </Link>
            </div>
        </div>
    );
}
```

**変更点**:
- `<h1>`タグに「404 - 」を追加

### ステップ2: 動的ルートの修正

#### 2.1 dynamic/[pollId]/page.tsxの修正

**ファイル**: `simple-vote-next/app/dynamic/[pollId]/page.tsx`

**修正内容**:
```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation'; // 追加
import { useWallet } from '@/components/WalletProvider';
import App from '@/components/App';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import { POLL_REGISTRY_ABI, POLL_REGISTRY_ADDRESS } from '@/lib/constants';

// ... 既存のDynamicVoteコンポーネント ...

// 動的ルーティングページコンポーネント
export default function DynamicVotePage({ params }: { params: { pollId: string } }) {
    const { signer, showToast } = useWallet();
    const router = useRouter();
    const pollId = Number(params.pollId);

    // pollIdが無効な場合の処理
    if (isNaN(pollId) || pollId <= 0) {
        notFound(); // 変更: 独自エラーメッセージからnotFound()に変更
    }

    return (
        <App>
            <PageHeader
                title="Dynamic Vote"
                breadcrumbs={[
                    { label: 'Dynamic Vote', href: '/dynamic' },
                    { label: `ID: ${pollId}` },
                ]}
            />
            <DynamicVote signer={signer} pollId={pollId} showToast={showToast} />
        </App>
    );
}
```

**変更点**:
- `notFound`をインポート
- 無効なPoll IDの場合に`notFound()`を呼び出し

#### 2.2 simple/[pollId]/page.tsxの修正

**ファイル**: `simple-vote-next/app/simple/[pollId]/page.tsx`

**修正内容**:
```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation'; // 追加
import { POLL_REGISTRY_ABI, POLL_REGISTRY_ADDRESS, ZERO } from '@/lib/constants';
import { useWallet } from '@/components/WalletProvider';
import App from '@/components/App';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';

// SimpleVote ページコンポーネント
export default function SimpleVotePage({ params }: { params: { pollId: string } }) {
    const router = useRouter();
    const { signer, showToast } = useWallet();
    const pollId = Number(params.pollId);

    // pollIdが無効な場合の処理
    if (isNaN(pollId) || pollId <= 0) {
        notFound(); // 変更: 独自エラーメッセージからnotFound()に変更
    }

    // ... 既存のコード ...
}
```

**変更点**:
- `notFound`をインポート
- 無効なPoll IDの場合に`notFound()`を呼び出し

#### 2.3 weighted/[pollId]/page.tsxの修正

**ファイル**: `simple-vote-next/app/weighted/[pollId]/page.tsx`

**修正内容**:
```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation'; // 追加
import { useWallet } from '@/components/WalletProvider';
import App from '@/components/App';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import { POLL_REGISTRY_ABI, POLL_REGISTRY_ADDRESS, ERC20_ABI, ZERO } from '@/lib/constants';

// ... 既存のWeightedVoteコンポーネント ...

// 動的ルーティングページコンポーネント
export default function WeightedVotePage({ params }: { params: { pollId: string } }) {
    const { signer, showToast } = useWallet();
    const router = useRouter();
    const pollId = Number(params.pollId);

    // pollIdが無効な場合の処理
    if (isNaN(pollId) || pollId <= 0) {
        notFound(); // 変更: 独自エラーメッセージからnotFound()に変更
    }

    return (
        <App>
            <PageHeader
                title="Weighted Vote"
                breadcrumbs={[
                    { label: 'Weighted Vote', href: '/weighted' },
                    { label: `ID: ${pollId}` },
                ]}
            />
            <WeightedVote signer={signer} pollId={pollId} showToast={showToast} />
        </App>
    );
}
```

**変更点**:
- `notFound`をインポート
- 無効なPoll IDの場合に`notFound()`を呼び出し

### ステップ3: テストの確認

**ファイル**: `simple-vote-next/tests/basic-ui-navigation.spec.ts`

**現在のテストコード**:
```tsx
test('無効なPoll IDでアクセスした場合のエラー表示', async ({ page }) => {
    // 無効なPoll IDでのアクセステスト
    await page.goto('/dynamic/999999');
    // エラーページの表示確認
    await expect(page.locator('text=404')).toBeVisible();
});
```

**修正後の動作**:
- `not-found.tsx`が表示される
- 「404 - ページが見つかりません」テキストが表示される
- テストが成功する

## 修正後の検証手順

### 1. 修正内容の確認
```bash
# 修正したファイルの内容確認
cat simple-vote-next/app/not-found.tsx
cat simple-vote-next/app/dynamic/[pollId]/page.tsx
cat simple-vote-next/app/simple/[pollId]/page.tsx
cat simple-vote-next/app/weighted/[pollId]/page.tsx
```

### 2. 開発サーバーでの手動確認
```bash
cd simple-vote-next
npm run dev
```

**手動テスト手順**:
1. ブラウザで`http://localhost:3000/dynamic/invalid-poll-id`にアクセス
2. ブラウザで`http://localhost:3000/simple/invalid-poll-id`にアクセス
3. ブラウザで`http://localhost:3000/weighted/invalid-poll-id`にアクセス
4. 各URLで404ページ（「404 - ページが見つかりません」）が表示されることを確認

### 3. テストの実行
```bash
# 特定のテストケースのみ実行
npx playwright test --grep "無効なPoll IDでアクセスした場合のエラー表示"

# 全テスト実行
npx playwright test
```

### 4. 本番ビルドでの確認
```bash
cd simple-vote-next
npm run build
npm start
```

## 期待される結果

### 修正前
- 無効なPoll IDでアクセス → 独自エラーメッセージ「無効なPoll IDです」を表示
- テスト失敗: `text=404`が見つからない

### 修正後
- 無効なPoll IDでアクセス → Next.js標準の404ページ「404 - ページが見つかりません」を表示
- テスト成功: `text=404`が見つかる

## リスクと対策

### リスク1: 既存のユーザー体験の変化
**リスク**: 独自エラーメッセージから標準404ページへの変更により、ユーザー体験が変わる
**対策**: 
- 404ページのデザインを既存のアプリケーションに合わせて調整
- 必要に応じて、より詳細なエラーメッセージを追加

### リスク2: SEOへの影響
**リスク**: 404ページの変更によりSEOに影響する可能性
**対策**:
- 適切なHTTPステータスコード（404）が返されることを確認
- 404ページに適切なメタタグを設定

### リスク3: 他のテストへの影響
**リスク**: 修正により他のテストが失敗する可能性
**対策**:
- 全テストスイートを実行して影響を確認
- 必要に応じて他のテストも修正

## 代替案

### 代替案1: テストのみ修正
- 動的ルートの独自エラーメッセージを維持
- テストのセレクターを「無効なPoll IDです」に変更

**メリット**: 最小限の変更で済む
**デメリット**: Next.jsのベストプラクティスに従わない

### 代替案2: ハイブリッド対応
- `not-found.tsx`に「404」テキストを追加
- 動的ルートでは独自エラーメッセージを維持
- テストで両方のケースに対応

**メリット**: 既存の動作を維持しつつ、テストも通る
**デメリット**: 複雑な実装になる

## 結論

**推奨修正方針**: 方針A（Next.js標準の404処理を使用）

この修正により、以下のメリットが得られます：

1. **Next.jsのベストプラクティスに従う**
2. **一貫性のあるエラーハンドリング**
3. **テストが成功する**
4. **SEOフレンドリーな404ページ**
5. **将来的な拡張性**

修正手順に従って実装することで、問題を解決し、より良いユーザー体験を提供できます。 