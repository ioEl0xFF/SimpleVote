# SimpleVote ドキュメント

このディレクトリには、SimpleVoteプロジェクトのドキュメントが含まれています。

## ディレクトリ構成

```
docs/
├── README.md                    # このファイル
├── specifications/              # 仕様書
│   ├── polling-app-spec.md     # 投票アプリケーション全体の仕様
│   ├── single-contract-design-spec.md  # 単一コントラクト設計仕様
│   └── delete-button-spec.md   # 削除ボタン機能仕様
├── guides/                      # ガイド・チュートリアル
│   ├── nextjs-migration-guide.md  # Next.js移行ガイド
│   └── implementation/         # 実装手順書
│       ├── 01-create-poll-registry-contract.md
│       ├── 02-modify-hardhat-config.md
│       ├── 03-delete-old-contracts.md
│       ├── 04-update-constants-js.md
│       ├── 05-modify-deploy-script.md
│       ├── 06-modify-poll-create-jsx.md
│       ├── 07-modify-poll-list-jsx.md
│       ├── 08-modify-app-jsx.md
│       ├── 09-modify-dynamic-vote-jsx.md
│       ├── 10-modify-weighted-vote-jsx.md
│       ├── 11-create-simple-vote-jsx.md
│       └── 12-update-tests.md
├── development/                 # 開発関連ドキュメント
│   └── testing/                # テスト関連
│       ├── playwright-test-plan.md
│       ├── basic-ui-navigation-issue-investigation.md
│       ├── basic-ui-navigation-test-fix.md
│       ├── wallet-connection-test-investigation.md
│       ├── wallet-connection-test-fix-plan.md
│       ├── invalid-poll-id-error-investigation.md
│       └── invalid-poll-id-error-fix-plan.md
└── images/                     # 画像ファイル
    ├── dapp-home.png
    ├── dapp-new.png
    ├── dapp-wallet.png
    ├── dapp-dynamic.png
    └── dapp-weighted.png
```

## 各ディレクトリの説明

### specifications/
プロジェクトの仕様書を格納します。機能要件、設計仕様、技術仕様などが含まれます。

### guides/
ユーザー向けのガイドやチュートリアルを格納します。
- **implementation/**: 実装手順書（番号順に並んでいます）

### development/
開発者向けの技術文書を格納します。
- **testing/**: テスト関連の調査結果、修正計画、テスト計画など

### images/
ドキュメントで使用する画像ファイルを格納します。 