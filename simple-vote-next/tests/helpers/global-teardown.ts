import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
    console.log('Starting global teardown...');

    // テスト結果の集計
    console.log('Test execution completed');
    console.log('Cleaning up test artifacts...');

    // 必要に応じてクリーンアップ処理を追加
    // 例: 一時ファイルの削除、ログの整理など

    console.log('Global teardown completed');
}

export default globalTeardown;
