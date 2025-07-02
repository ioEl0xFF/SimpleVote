# 無効なPoll IDエラー修正手順書

## 修正概要

**修正対象**: 無効なPoll IDでアクセスした場合の404ページ表示問題
**根本原因**: Next.js 15の新しい制約により、クライアントコンポーネントで`params`を直接使用し、`notFound()`を呼び出していること
**修正方針**: 動的ルートページをサーバーコンポーネントに変更し、適切なパラメータ処理を実装

## 修正対象ファイル

1. `simple-vote-next/app/dynamic/[pollId]/page.tsx`
2. `simple-vote-next/app/simple/[pollId]/page.tsx`
3. `simple-vote-next/app/weighted/[pollId]/page.tsx`

## 修正手順

### ステップ1: Dynamic Vote ページの修正

#### 1.1 ファイルの現在の状態確認
```bash
# 現在のファイル内容を確認
cat simple-vote-next/app/dynamic/[pollId]/page.tsx
```

#### 1.2 サーバーコンポーネントへの変更
```tsx
// 修正前（クライアントコンポーネント）
'use client';

export default function DynamicVotePage({ params }: { params: { pollId: string } }) {
    const pollId = Number(params.pollId);
    if (isNaN(pollId) || pollId <= 0) {
        notFound();
    }
    // ...
}

// 修正後（サーバーコンポーネント）
export default async function DynamicVotePage({ params }: { params: Promise<{ pollId: string }> }) {
    const { pollId } = await params;
    const pollIdNum = Number(pollId);

    if (isNaN(pollIdNum) || pollIdNum <= 0) {
        notFound();
    }

    // データフェッチをサーバー側で実行
    const pollData = await fetchPollData(pollIdNum);

    return (
        <div>
            <PageHeader title="動的投票" />
            <DynamicVoteClient pollData={pollData} pollId={pollIdNum} />
        </div>
    );
}
```

#### 1.3 クライアントコンポーネントの分離
```tsx
// simple-vote-next/components/DynamicVoteClient.tsx を新規作成
'use client';

interface DynamicVoteClientProps {
    pollData: any;
    pollId: number;
}

export default function DynamicVoteClient({ pollData, pollId }: DynamicVoteClientProps) {
    // 既存のクライアント側ロジックをここに移動
    // ウォレット接続、投票処理など
}
```

### ステップ2: Simple Vote ページの修正

#### 2.1 サーバーコンポーネントへの変更
```tsx
// simple-vote-next/app/simple/[pollId]/page.tsx
export default async function SimpleVotePage({ params }: { params: Promise<{ pollId: string }> }) {
    const { pollId } = await params;
    const pollIdNum = Number(pollId);

    if (isNaN(pollIdNum) || pollIdNum <= 0) {
        notFound();
    }

    const pollData = await fetchPollData(pollIdNum);

    return (
        <div>
            <PageHeader title="シンプル投票" />
            <SimpleVoteClient pollData={pollData} pollId={pollIdNum} />
        </div>
    );
}
```

#### 2.2 クライアントコンポーネントの分離
```tsx
// simple-vote-next/components/SimpleVoteClient.tsx を新規作成
'use client';

interface SimpleVoteClientProps {
    pollData: any;
    pollId: number;
}

export default function SimpleVoteClient({ pollData, pollId }: SimpleVoteClientProps) {
    // 既存のクライアント側ロジックをここに移動
}
```

### ステップ3: Weighted Vote ページの修正

#### 3.1 サーバーコンポーネントへの変更
```tsx
// simple-vote-next/app/weighted/[pollId]/page.tsx
export default async function WeightedVotePage({ params }: { params: Promise<{ pollId: string }> }) {
    const { pollId } = await params;
    const pollIdNum = Number(pollId);

    if (isNaN(pollIdNum) || pollIdNum <= 0) {
        notFound();
    }

    const pollData = await fetchPollData(pollIdNum);

    return (
        <div>
            <PageHeader title="重み付き投票" />
            <WeightedVoteClient pollData={pollData} pollId={pollIdNum} />
        </div>
    );
}
```

#### 3.2 クライアントコンポーネントの分離
```tsx
// simple-vote-next/components/WeightedVoteClient.tsx を新規作成
'use client';

interface WeightedVoteClientProps {
    pollData: any;
    pollId: number;
}

export default function WeightedVoteClient({ pollData, pollId }: WeightedVoteClientProps) {
    // 既存のクライアント側ロジックをここに移動
}
```

### ステップ4: データフェッチ関数の実装

#### 4.1 サーバー側データフェッチ関数の作成
```tsx
// simple-vote-next/lib/poll-data.ts を新規作成
export async function fetchPollData(pollId: number) {
    // ブロックチェーンからポールデータを取得するロジック
    // 既存のデータフェッチロジックをサーバー側に移動
    return {
        id: pollId,
        title: "サンプル投票",
        description: "投票の説明",
        options: ["選択肢1", "選択肢2", "選択肢3"],
        // その他の必要なデータ
    };
}
```

### ステップ5: インポート文の更新

#### 5.1 各ページファイルでのインポート更新
```tsx
// 各ページファイルの先頭に追加
import { fetchPollData } from '@/lib/poll-data';
import { DynamicVoteClient } from '@/components/DynamicVoteClient';
import { SimpleVoteClient } from '@/components/SimpleVoteClient';
import { WeightedVoteClient } from '@/components/WeightedVoteClient';
```

## 修正後の動作確認

### 5.1 開発サーバーの起動
```bash
cd simple-vote-next
npm run dev
```

### 5.2 手動テスト
1. **有効なPoll IDでのアクセス**
   - `/dynamic/1` → 正常にページが表示される
   - `/simple/1` → 正常にページが表示される
   - `/weighted/1` → 正常にページが表示される

2. **無効なPoll IDでのアクセス**
   - `/dynamic/999999` → 404ページが表示される
   - `/simple/999999` → 404ページが表示される
   - `/weighted/999999` → 404ページが表示される

### 5.3 自動テストの実行
```bash
cd simple-vote-next
npm run test:e2e
```

期待される結果：
- 「無効なPoll IDでアクセスした場合のエラー表示」テストが成功
- `text=404`セレクターが正しくマッチ
- タイムアウトエラーが解消

## 修正のポイント

### 1. Next.js 15の制約への準拠
- `params`を`await`してから使用
- サーバーコンポーネントでの`notFound()`使用

### 2. コンポーネント設計の改善
- サーバーコンポーネント：データフェッチとパラメータ検証
- クライアントコンポーネント：UI表示とインタラクション

### 3. エラーハンドリングの一貫性
- 無効なPoll IDでの一貫した404ページ表示
- 適切なエラーメッセージの表示

## 注意事項

### 1. 既存機能への影響
- ウォレット接続機能はクライアントコンポーネントで維持
- 投票処理はクライアントコンポーネントで実行
- データフェッチのみサーバー側に移動

### 2. 型安全性の確保
- TypeScriptの型定義を適切に設定
- インターフェースの定義と使用

### 3. パフォーマンスの考慮
- サーバー側でのデータフェッチによる初期表示の高速化
- クライアント側でのインタラクティブ機能の維持

## 修正完了後の確認項目

- [ ] 無効なPoll IDで404ページが正しく表示される
- [ ] 有効なPoll IDで正常にページが表示される
- [ ] ウォレット接続機能が正常に動作する
- [ ] 投票機能が正常に動作する
- [ ] 自動テストが全て成功する
- [ ] Next.js 15の制約に準拠している

## 参考資料

- [Next.js 15 Dynamic APIs Documentation](https://nextjs.org/docs/messages/sync-dynamic-apis)
- [Next.js App Router notFound() Documentation](https://nextjs.org/docs/app/api-reference/functions/not-found)
- [Next.js Server vs Client Components](https://nextjs.org/docs/getting-started/react-essentials#server-components)

---

**作成日時**: 2025年7月1日
**作成者**: AI Assistant
**次回更新予定**: 修正実装完了後 