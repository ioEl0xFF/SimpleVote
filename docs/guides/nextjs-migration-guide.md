# SimpleVote フロントエンドのNext.jsへの移行ガイド

このドキュメントは、既存のReactフロントエンドをNext.jsに移行するための必要な変更点と手順を詳述します。Next.jsへの移行は、アプリケーションのパフォーマンス向上（特に初期表示速度とSEO）や開発体験の改善に大きなメリットをもたらします。

## 1. Next.jsプロジェクトの新規作成

まず、新しいNext.jsプロジェクトを作成します。

```bash
# Next.jsプロジェクトを作成
npx create-next-app@latest simple-vote-next --typescript --eslint --tailwind --app

# プロジェクトディレクトリへ移動
cd simple-vote-next

# 必要な依存関係をインストール (ethers.jsなど)
npm install ethers
```

*   `--typescript`: TypeScriptを使用します。
*   `--eslint`: ESLintを設定します。
*   `--tailwind`: Tailwind CSSを設定します。
*   `--app`: App Routerを使用します（Next.js 13以降の推奨）。

## 2. コンポーネントの移行とルーティングの調整

現在の`simple-vote-ui/src`ディレクトリ内のコンポーネントをNext.jsの構造に移行し、ルーティングをNext.jsのファイルシステムベースのルーティングに置き換えます。

### 2.1. `App.jsx`の置き換え

*   `App.jsx`のウォレット接続ロジックやトースト通知の管理は、Next.jsのルートレイアウト (`app/layout.tsx`) やクライアントコンポーネント (`'use client'` ディレクティブを使用) に移行します。
*   ページごとの表示ロジック (`renderContent`) は、Next.jsのページファイル (`app/page.tsx`, `app/create/page.tsx`など) に分割されます。

### 2.2. ページコンポーネントの作成

以下の既存コンポーネントをNext.jsのページファイルとして再構築します。

*   `PollListPage.jsx` -> `app/page.tsx` (ルートページ)
*   `PollCreate.jsx` -> `app/create/page.tsx`
*   `DynamicVote.jsx` -> `app/dynamic/[pollId]/page.tsx` (動的ルーティング)
*   `WeightedVote.jsx` -> `app/weighted/[pollId]/page.tsx` (動的ルーティング)
*   `SimpleVote.jsx` -> `app/simple/[pollId]/page.tsx` (動的ルーティング)

### 2.3. クライアントコンポーネント化

Web3関連のロジック（`ethers.js`の初期化、ウォレット接続、コントラクト操作など）は、ブラウザ環境でのみ実行される必要があります。Next.jsのApp Routerでは、デフォルトでサーバーコンポーネントですが、これらのコンポーネントのファイルの先頭に `'use client';` を追加してクライアントコンポーネントとしてマークします。

*   `PollList.jsx`、`PollCreate.jsx`、`DynamicVote.jsx`、`WeightedVote.jsx`、`SimpleVote.jsx`、`Toast.jsx`などはクライアントコンポーネントになります。

**例: `app/dynamic/[pollId]/page.tsx`の構造**

```typescript
// app/dynamic/[pollId]/page.tsx
'use client'; // これをファイルの先頭に追加してクライアントコンポーネントにする

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { POLL_REGISTRY_ABI, POLL_REGISTRY_ADDRESS } from '@/constants'; // @/ はNext.jsのエイリアス設定による

// DynamicVote コンポーネントのロジックをここに移植
// propsとしてparams.pollIdを受け取る
export default function DynamicVotePage({ params }: { params: { pollId: string } }) {
    const pollId = Number(params.pollId); // URLから取得したpollIdを使用
    // ... 既存のDynamicVote.jsxのstateとロジックを移植 ...

    // signerの取得やshowToastの渡し方は、App.jsxのロジックをどこに配置したかによる
    // 例えば、Context APIを使ってsignerやshowToastを渡すことも検討

    return (
        // ... DynamicVote.jsxのJSXを移植 ...
    );
}
```

### 2.4. 共通コンポーネント

`Toast.jsx`のような汎用コンポーネントは、`components`ディレクトリ（例: `components/Toast.tsx`）に配置します。

### 2.5. `Link`コンポーネントの使用

ページ間のナビゲーションには、Next.jsの`next/link`からインポートする`<Link>`コンポーネントを使用します。

## 3. Web3統合の確認

*   **`ethers.js`のインポート**: `ethers`ライブラリは通常通りインポートして使用できます。
*   **ウォレット接続**: `connectWallet`関数など、MetaMaskとのインタラクションはクライアントコンポーネント内で行う必要があります。
*   **ABIとアドレス**: `constants.js`はNext.jsプロジェクトのどこか（例: `lib/constants.ts`や`src/constants.ts`）に移動し、パスを適切に調整します。Next.jsでは、`tsconfig.json`でパスエイリアス（例: `"@/*": ["./*"]`）を設定すると便利です。

## 4. スタイリングの調整

`create-next-app`で`--tailwind`オプションを指定していれば、Tailwind CSSは自動的に設定されます。

*   `tailwind.config.js`と`postcss.config.js`がプロジェクトルートに生成されます。
*   `app/globals.css`にTailwindのディレクティブがインポートされます。
*   既存のCSS（`App.css`, `index.css`）は、必要に応じてTailwindクラスに変換するか、`globals.css`に統合します。

## 5. ビルドと実行

Next.jsプロジェクトのルートディレクトリで、以下のコマンドを実行します。

*   **開発サーバーの起動**:
    ```bash
    npm run dev
    ```
    通常、`http://localhost:3000`でアプリケーションが起動します。
*   **本番ビルド**:
    ```bash
    npm run build
    ```
    `out`ディレクトリ（静的エクスポートの場合）または`.next`ディレクトリ（サーバーサイドレンダリングの場合）に最適化されたビルドが出力されます。
*   **本番サーバーの起動**:
    ```bash
    npm run start
    ```

## 6. 考慮事項と課題

*   **学習コスト**: Next.jsのApp Router、サーバーコンポーネント、クライアントコンポーネントの概念を理解する必要があります。
*   **データフェッチ**: Next.jsでは、サーバーコンポーネントでのデータフェッチが推奨されますが、Web3のデータは通常クライアントサイドでフェッチする必要があります。`swr`や`react-query`のようなライブラリを使用して、クライアントサイドでのデータフェッチを効率化できます。
*   **環境変数**: `.env.local`ファイルを使用して環境変数を管理します。
*   **既存のロジックの再構築**: `App.jsx`で行っていたページ遷移のロジックは、Next.jsのルーティングと`next/navigation`の`useRouter`フックに置き換える必要があります。

これらの変更は大規模なリファクタリングとなるため、段階的に進めることをお勧めします。
