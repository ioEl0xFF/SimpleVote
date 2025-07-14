# ウォレット接続前後の表示内容分析

## 概要

このドキュメントでは、SimpleVote アプリケーションのホームページ（`page.tsx`）におけるウォレット接続前後の表示内容の違いを分析します。

## ファイル構成

-   **メインファイル**: `simple-vote-next/app/page.tsx`
-   **関連コンポーネント**:
    -   `simple-vote-next/components/App.tsx`
    -   `simple-vote-next/components/PageHeader.tsx`

## ウォレット接続前の表示内容

### 1. メインタイトル

-   **要素**: `<h1>` タグ
-   **テキスト**: "SimpleVote"
-   **スタイル**: `text-3xl font-bold`

### 2. ウォレット接続ボタン

-   **要素**: `<button>` タグ
-   **テキスト**: "ウォレット接続"
-   **スタイル**:
    -   `px-6 py-2 rounded-xl bg-purple-600 text-white`
    -   `hover:bg-purple-700 transition-colors`
-   **アクセシビリティ**: `aria-label="ウォレットを接続する"`

### 3. ページヘッダー

-   **要素**: `<h1>` タグ（PageHeader コンポーネント内）
-   **テキスト**: "投票一覧"
-   **スタイル**: `text-2xl font-bold text-gray-900`

### 4. 新規作成ボタン

-   **要素**: `<button>` タグ
-   **テキスト**: "新規作成"
-   **スタイル**:
    -   `px-4 py-2 rounded-xl bg-green-600 text-white`
    -   `hover:bg-green-700 transition-colors`
-   **アクセシビリティ**: `aria-label="新しい投票を作成する"`

### 5. 投票一覧エリア

-   **状態**: データ読み込み中
-   **表示内容**:
    -   LoadingSpinner コンポーネント
    -   "投票一覧を読み込み中..." メッセージ
-   **スタイル**: `text-center text-gray-600`

## ウォレット接続後の表示内容

### 1. メインタイトル

-   **要素**: `<h1>` タグ
-   **テキスト**: "SimpleVote"
-   **スタイル**: `text-3xl font-bold`

### 2. ウォレット情報エリア

-   **ウォレットアドレス**:
    -   **要素**: `<p>` タグ
    -   **スタイル**: `font-mono`
    -   **アクセシビリティ**: `aria-label="接続中のウォレットアドレス: {account}"`
-   **切断ボタン**:
    -   **要素**: `<button>` タグ
    -   **テキスト**: "切断"
    -   **スタイル**:
        -   `px-4 py-1 rounded-xl bg-gray-400 text-white`
        -   `hover:bg-gray-500 transition-colors`
    -   **アクセシビリティ**: `aria-label="ウォレットを切断する"`

### 3. ページヘッダー

-   **要素**: `<h1>` タグ（PageHeader コンポーネント内）
-   **テキスト**: "投票一覧"
-   **スタイル**: `text-2xl font-bold text-gray-900`

### 4. 新規作成ボタン

-   **要素**: `<button>` タグ
-   **テキスト**: "新規作成"
-   **スタイル**:
    -   `px-4 py-2 rounded-xl bg-green-600 text-white`
    -   `hover:bg-green-700 transition-colors`
-   **アクセシビリティ**: `aria-label="新しい投票を作成する"`

### 5. 投票一覧エリア

-   **見出し**: "Poll 一覧" (`text-xl font-bold`)
-   **投票データがある場合**:
    -   **要素**: `<ul>` 内の `<li>` と `<button>` タグ
    -   **表示形式**: `{type} : {topic} (ID: {id})`
    -   **スタイル**:
        -   `underline text-blue-600 hover:text-blue-800`
        -   `focus:outline-none focus:ring-2 focus:ring-blue-500`
    -   **アクセシビリティ**: `aria-label="{type}投票「{topic}」を選択する"`
-   **投票データがない場合**:
    -   **要素**: `<p>` タグ
    -   **テキスト**: "議題が存在しません"

## 主要な違いのまとめ

| 項目               | ウォレット接続前 | ウォレット接続後               |
| ------------------ | ---------------- | ------------------------------ |
| ウォレット関連     | 接続ボタンのみ   | アドレス表示 + 切断ボタン      |
| 投票データ読み込み | 実行されない     | 実行される                     |
| 投票一覧表示       | ローディング状態 | 実際のデータまたは空メッセージ |
| 投票項目の操作性   | なし             | クリック可能                   |

## 技術的な実装ポイント

### 条件分岐の仕組み

```typescript
// App.tsx での条件分岐
{
    !signer ? (
        // ウォレット接続前の表示
        <button>ウォレット接続</button>
    ) : (
        // ウォレット接続後の表示
        <>
            <div>ウォレット情報</div>
            {children} {/* 投票一覧コンテンツ */}
        </>
    );
}
```

### データ取得の制御

```typescript
// PollList コンポーネントでの制御
useEffect(() => {
    if (!signer) return; // signerがない場合は何もしない
    // signerがある場合のみデータ取得を実行
}, [signer]);
```

## アクセシビリティ対応

-   すべてのボタンに適切な `aria-label` 属性を設定
-   キーボードナビゲーション対応（Tab、Enter、Space キー）
-   フォーカス管理とフォーカスインジケーター
-   スクリーンリーダー対応のラベル設定

## レスポンシブデザイン

-   Tailwind CSS のユーティリティクラスを使用
-   フレックスボックスレイアウト
-   適切なスペーシングとパディング
-   ホバー効果とトランジション

---

_このドキュメントは `page.tsx` の実装に基づいて作成されました。_
