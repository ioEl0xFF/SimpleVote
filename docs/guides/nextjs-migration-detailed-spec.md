# Next.js移行 詳細仕様書

## 概要

SimpleVoteプロジェクトを既存のVite + ReactアプリケーションからNext.js 14 (App Router)に移行するための詳細な仕様書です。

## 1. 移行の背景と目的

### 1.1 移行理由
- **パフォーマンス向上**: SSR/SSGによる初期ロード時間の短縮
- **SEO最適化**: 各投票ページの検索エンジン最適化
- **モダンな開発体験**: Next.js 14のApp Routerによる型安全なルーティング
- **デプロイメント最適化**: Vercelでの簡単なデプロイメント

### 1.2 移行目標
- 既存の機能を100%保持
- パフォーマンスの向上
- 保守性の向上
- 開発者体験の向上

## 2. 技術スタック

### 2.1 移行前（現在）
```
React 18
Vite
ethers.js
Tailwind CSS
```

### 2.2 移行後（目標）
```
Next.js 14 (App Router)
React 18
TypeScript
ethers.js v6
Tailwind CSS 3.4+
ESLint + Prettier
```

## 3. ディレクトリ構造

### 3.1 新しいディレクトリ構造
```
simple-vote-next/
├── app/                    # App Router構造
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ホームページ
│   ├── create/            # 投票作成ページ
│   │   └── page.tsx
│   ├── simple/            # シンプル投票
│   │   └── [pollId]/
│   │       └── page.tsx
│   ├── dynamic/           # 動的投票
│   │   └── [pollId]/
│   │       └── page.tsx
│   ├── weighted/          # 重み付け投票
│   │   └── [pollId]/
│   │       └── page.tsx
│   └── not-found.tsx      # 404ページ
├── components/            # 共通コンポーネント
│   ├── providers/         # Providerコンポーネント
│   ├── ui/               # UIコンポーネント
│   └── voting/           # 投票関連コンポーネント
├── lib/                  # ユーティリティ関数
│   ├── contracts/        # コントラクト関連
│   ├── constants.ts      # 定数
│   └── utils.ts          # ユーティリティ
├── hooks/                # カスタムフック
├── types/                # TypeScript型定義
├── public/               # 静的ファイル
└── tests/                # テストファイル
```

## 4. 移行タスク詳細

### 4.1 Phase 1: 環境セットアップ
#### 4.1.1 Next.jsプロジェクトの初期化
```bash
# simple-vote-nextディレクトリに移動
cd simple-vote-next

# Next.js 14 (App Router)のセットアップ
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false
```

#### 4.1.2 必要なパッケージのインストール
```json
{
  "dependencies": {
    "next": "14.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "ethers": "^6.8.0",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0",
    "@rainbow-me/rainbowkit": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "14.0.0",
    "prettier": "^3.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### 4.2 Phase 2: コア機能の移行
#### 4.2.1 コントラクト接続の移行
```typescript
// lib/contracts/contract-manager.ts
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/lib/constants';

export class ContractManager {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  async connect(): Promise<void> {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
    }
  }

  // コントラクトインスタンスの取得
  getPollManager() {
    if (!this.signer) throw new Error('Wallet not connected');
    return new ethers.Contract(
      CONTRACT_ADDRESSES.POLL_MANAGER,
      PollManagerABI,
      this.signer
    );
  }
}
```

#### 4.2.2 ウォレット接続の実装
```typescript
// components/providers/wallet-provider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ContractManager } from '@/lib/contracts/contract-manager';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  contractManager: ContractManager;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [contractManager] = useState(() => new ContractManager());

  // ウォレット接続ロジック
  const connect = async () => {
    try {
      await contractManager.connect();
      const signer = await contractManager.getSigner();
      const address = await signer.getAddress();
      setAddress(address);
      setIsConnected(true);
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        contractManager,
        connect,
        disconnect: () => {
          setIsConnected(false);
          setAddress(null);
        }
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
```

### 4.3 Phase 3: ページコンポーネントの移行
#### 4.3.1 ホームページの実装
```typescript
// app/page.tsx
import { Suspense } from 'react';
import { PollList } from '@/components/voting/poll-list';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PageHeader } from '@/components/ui/page-header';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="SimpleVote"
        subtitle="分散型投票システム"
      />
      
      <Suspense fallback={<LoadingSpinner />}>
        <PollList />
      </Suspense>
    </div>
  );
}

// メタデータの設定
export const metadata = {
  title: 'SimpleVote - 分散型投票システム',
  description: '透明性のある投票システムで、公正な意思決定を実現',
};
```

#### 4.3.2 動的ルーティングの実装
```typescript
// app/dynamic/[pollId]/page.tsx
import { notFound } from 'next/navigation';
import { DynamicVotingInterface } from '@/components/voting/dynamic-voting-interface';

interface PageProps {
  params: {
    pollId: string;
  };
}

export default function DynamicVotePage({ params }: PageProps) {
  const { pollId } = params;

  if (!pollId) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DynamicVotingInterface pollId={pollId} />
    </div>
  );
}

// 動的メタデータの生成
export async function generateMetadata({ params }: PageProps) {
  const { pollId } = params;
  
  return {
    title: `投票 #${pollId} - SimpleVote`,
    description: `投票 #${pollId} に参加して、あなたの意見を表明しましょう。`,
  };
}
```

### 4.4 Phase 4: コンポーネントの移行
#### 4.4.1 投票インターフェースの実装
```typescript
// components/voting/dynamic-voting-interface.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/components/providers/wallet-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface DynamicVotingInterfaceProps {
  pollId: string;
}

export function DynamicVotingInterface({ pollId }: DynamicVotingInterfaceProps) {
  const { contractManager, isConnected } = useWallet();
  const [pollData, setPollData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    const loadPollData = async () => {
      if (!isConnected) return;
      
      try {
        const contract = contractManager.getPollManager();
        const poll = await contract.getPoll(pollId);
        setPollData(poll);
      } catch (error) {
        console.error('Poll data loading failed:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPollData();
  }, [pollId, contractManager, isConnected]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!pollData) {
    return <div>投票が見つかりません</div>;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{pollData.title}</h1>
        <p className="text-gray-600 mb-6">{pollData.description}</p>
        
        <div className="space-y-3">
          {pollData.options.map((option: string, index: number) => (
            <Button
              key={index}
              variant={selectedOption === index ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setSelectedOption(index)}
            >
              {option}
            </Button>
          ))}
        </div>

        <Button 
          className="w-full mt-6"
          disabled={selectedOption === null}
          onClick={() => handleVote(selectedOption)}
        >
          投票する
        </Button>
      </div>
    </Card>
  );
}
```

### 4.5 Phase 5: 型定義の作成
```typescript
// types/contracts.ts
export interface Poll {
  id: string;
  title: string;
  description: string;
  options: string[];
  votes: number[];
  creator: string;
  deadline: number;
  isActive: boolean;
}

export interface VoteTransaction {
  pollId: string;
  option: number;
  voter: string;
  weight: number;
  timestamp: number;
}

// types/wallet.ts
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string;
  networkId: number;
}
```

### 4.6 Phase 6: テストの実装
#### 4.6.1 E2Eテストの設定
```typescript
// tests/e2e/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('HomePage', () => {
  test('should display poll list', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('SimpleVote')).toBeVisible();
    await expect(page.getByText('分散型投票システム')).toBeVisible();
  });

  test('should navigate to create poll page', async ({ page }) => {
    await page.goto('/');
    
    await page.getByText('新規作成').click();
    await expect(page).toHaveURL('/create');
  });
});
```

#### 4.6.2 ユニットテストの設定
```typescript
// tests/unit/wallet-provider.test.tsx
import { render, screen } from '@testing-library/react';
import { WalletProvider } from '@/components/providers/wallet-provider';

describe('WalletProvider', () => {
  it('should render children', () => {
    render(
      <WalletProvider>
        <div>Test Content</div>
      </WalletProvider>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
```

## 5. 設定ファイル

### 5.1 Next.js設定
```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  },
};

export default nextConfig;
```

### 5.2 TypeScript設定
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 5.3 ESLint設定
```json
// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
```

## 6. 移行スケジュール

### 6.1 タイムライン
- **Week 1**: Phase 1 - 環境セットアップ
- **Week 2**: Phase 2 - コア機能の移行
- **Week 3**: Phase 3 - ページコンポーネントの移行
- **Week 4**: Phase 4 - コンポーネントの移行
- **Week 5**: Phase 5 - 型定義の作成
- **Week 6**: Phase 6 - テストの実装
- **Week 7**: 統合テストと最適化
- **Week 8**: デプロイメントと検証

### 6.2 チェックリスト
- [ ] Next.js 14プロジェクトの初期化
- [ ] 必要なパッケージのインストール
- [ ] ウォレット接続機能の実装
- [ ] コントラクト接続機能の実装
- [ ] ホームページの実装
- [ ] 投票作成ページの実装
- [ ] 動的投票ページの実装
- [ ] シンプル投票ページの実装
- [ ] 重み付け投票ページの実装
- [ ] 共通コンポーネントの実装
- [ ] 型定義の作成
- [ ] ユニットテストの実装
- [ ] E2Eテストの実装
- [ ] パフォーマンステスト
- [ ] デプロイメント設定
- [ ] 本番環境での検証

## 7. 注意点とベストプラクティス

### 7.1 パフォーマンス最適化
- **画像最適化**: Next.js Image componentの使用
- **コードスプリッティング**: 動的インポートの活用
- **キャッシュ戦略**: SWRまたはReact Queryの導入検討

### 7.2 セキュリティ
- **環境変数**: 機密情報の適切な管理
- **HTTPS**: 本番環境でのHTTPS必須
- **CSP**: Content Security Policyの設定

### 7.3 アクセシビリティ
- **ARIA**: 適切なARIA属性の設定
- **キーボード操作**: 全機能のキーボードアクセス対応
- **色覚**: 色覚に配慮したデザイン

### 7.4 国際化対応
- **多言語対応**: 将来的な多言語対応の準備
- **日付フォーマット**: 地域に応じた日付形式

## 8. 移行後の運用

### 8.1 監視
- **エラー追跡**: SentryまたはBugsnagの導入
- **アナリティクス**: 使用状況の分析
- **パフォーマンス監視**: Core Web Vitalsの監視

### 8.2 更新戦略
- **定期更新**: 依存パッケージの定期的な更新
- **セキュリティ更新**: セキュリティパッチの迅速な適用
- **機能追加**: 新機能の段階的な追加

---

この仕様書に従って、段階的にNext.jsへの移行を進めることで、安全で効率的な移行が可能になります。各フェーズの完了時には、動作確認とテストを必ず実施してください。