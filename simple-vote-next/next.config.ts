import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // 基本的な最適化設定のみ
    experimental: {
        // ビルドワーカーを有効にしてコンパイル速度向上
        webpackBuildWorker: true,
    },

    // TypeScript設定
    typescript: {
        ignoreBuildErrors: false,
    },

    // ESLint設定
    eslint: {
        ignoreDuringBuilds: false,
    },

    // 開発時のキャッシュ無効化設定（ページアクセス時に毎回コンパイル）
    webpack: (config, { dev }) => {
        if (dev) {
            // 開発時のキャッシュを完全に無効化
            config.cache = false;

            // ファイル変更の監視設定を強化
            config.watchOptions = {
                poll: 1000, // 1秒ごとにファイル変更をチェック
                aggregateTimeout: 300,
                ignored: /node_modules/,
            };
        }
        return config;
    },

    // 静的ファイルの再検証設定
    onDemandEntries: {
        // ページを10秒でアンロード（強制再コンパイルのため）
        maxInactiveAge: 10 * 1000,
        // 同時に保持するページ数を制限
        pagesBufferLength: 1,
    },
};

export default nextConfig;
