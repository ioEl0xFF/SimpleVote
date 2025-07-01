# Testing Documentation

このディレクトリには、SimpleVoteプロジェクトのテスト関連ドキュメントが含まれています。

## ディレクトリ構造

```
testing/
├── README.md (このファイル)
├── plans/                    # テスト計画書
│   ├── plan-playwright-test.md
│   ├── plan-wallet-connection-test-fix.md
│   └── plan-invalid-poll-id-error-fix.md
├── investigations/           # 問題調査報告
│   ├── investigation-bignumberish-error.md
│   ├── investigation-poll-creation-error.md
│   ├── investigation-invalid-poll-id-error.md
│   ├── investigation-invalid-poll-id-error-cause.md
│   ├── investigation-basic-ui-navigation-issue.md
│   └── investigation-wallet-connection-test.md
├── fixes/                    # 修正内容・修正ガイド
│   ├── fix-bignumberish-error.md
│   ├── fix-basic-ui-navigation.md
│   └── fix-poll-creation-test.md
├── guides/                   # 実装ガイド
│   └── guide-poll-creation-test.md
└── results/                  # テスト結果報告
    ├── results-overview.md
    └── results-poll-creation.md
```

## ファイル命名規則

- **すべて小文字**を使用
- **ハイフン（-）**で単語を区切る
- **プレフィックス**でファイルタイプを識別：
  - `plan-` - テスト計画書
  - `investigation-` - 問題調査報告
  - `fix-` - 修正内容・修正ガイド
  - `guide-` - 実装ガイド
  - `results-` - テスト結果報告

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