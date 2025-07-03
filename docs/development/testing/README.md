# Testing Documentation

このディレクトリには、SimpleVoteプロジェクトのテスト関連ドキュメントが含まれています。

## ディレクトリ構造

```
testing/
├── README.md (このファイル)
├── plans/                    # テスト計画書
│   ├── playwright-test.md
│   ├── wallet-connection-test-fix.md
│   ├── invalid-poll-id-error-fix.md
│   └── transaction-completion-issue-fix.md
├── investigations/           # 問題調査報告
│   ├── bignumberish-error.md
│   ├── poll-creation-error.md
│   ├── invalid-poll-id-error.md
│   ├── invalid-poll-id-error-cause.md
│   ├── basic-ui-navigation-issue.md
│   ├── wallet-connection-test.md
│   └── transaction-completion-issue.md
├── fixes/                    # 修正内容・修正ガイド
│   ├── bignumberish-error.md
│   ├── basic-ui-navigation.md
│   ├── poll-creation-test.md
│   └── transaction-completion-issue.md
├── guides/                   # 実装ガイド
│   └── poll-creation-test.md
└── results/                  # テスト結果報告
    ├── analysis-results.md
    ├── overview.md
    ├── poll-creation.md
    └── transaction-completion-issue.md
```

## ファイル命名規則

- **すべて小文字**を使用
- **ハイフン（-）**で単語を区切る
- **プレフィックスなし**の簡潔な命名：
  - ファイル名から内容が明確に分かる命名
  - ディレクトリ構造でファイルタイプを識別

## 各ディレクトリの説明

### plans/
テストの計画書や戦略を格納します。テストの実行前に作成される文書です。

### investigations/
問題が発生した際の調査報告を格納します。問題の原因分析や調査過程を記録します。

### fixes/
問題の修正内容や修正手順を格納します。実際の修正作業で使用されるガイドです。

### guides/
テストの実装方法や手順を説明するガイドを格納します。

### results/
テストの実行結果やレポートを格納します。テスト完了後に作成される文書です。 