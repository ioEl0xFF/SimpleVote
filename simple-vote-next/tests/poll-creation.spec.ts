import { test, expect } from '@playwright/test';
import {
    setupEthersMock,
    simulateCompleteWalletConnection,
    waitForToast,
} from './helpers/ethers-mock';

test.describe('投票作成テスト', () => {
    test.beforeEach(async ({ page }) => {
        // コンソールログをキャプチャ
        page.on('console', (msg) => {
            console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
        });

        page.on('pageerror', (error) => {
            console.log(`Browser page error: ${error.message}`);
        });

        // ethers.jsのモックを設定
        await setupEthersMock(page);

        // ホームページに移動
        await page.goto('/');

        // ウォレット接続
        await simulateCompleteWalletConnection(page);

        // 新規作成ページに移動
        await page.getByRole('button', { name: '新規作成' }).click();
        await page.waitForURL('/create');
    });

    test('ページの基本表示', async ({ page }) => {
        // ページが完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle');

        // ページタイトルの確認（議題作成のh1を特定）
        await expect(page.locator('h1:has-text("議題作成")')).toHaveText('議題作成');

        // フォーム要素の確認（より柔軟なセレクターを使用）
        await expect(page.locator('select')).toBeVisible();
        await expect(page.locator('input[placeholder*="投票のトピック"]')).toBeVisible();
        await expect(page.locator('input[type="datetime-local"]')).toHaveCount(2);
        await expect(page.locator('input[placeholder*="選択肢"]')).toHaveCount(2);

        // 初期状態ではトークンアドレスフィールドが非表示
        await expect(page.locator('input[placeholder*="0x"]')).not.toBeVisible();
    });

    test('フォームバリデーション', async ({ page }) => {
        // ページが完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle');

        // 必須項目のバリデーション
        await page.getByRole('button', { name: '作成' }).click();

        // エラーメッセージの確認
        await expect(page.locator('input[placeholder*="投票のトピック"]')).toHaveAttribute(
            'required'
        );

        // 日時のバリデーション
        const now = new Date();
        const pastTime = new Date(now.getTime() - 3600000); // 1時間前

        // 開始時刻を現在に設定
        await page
            .locator('input[type="datetime-local"]')
            .nth(0)
            .fill(now.toISOString().slice(0, 16));
        // 終了時刻を過去に設定
        await page
            .locator('input[type="datetime-local"]')
            .nth(1)
            .fill(pastTime.toISOString().slice(0, 16));

        // トピックを入力してから作成ボタンをクリック
        await page.locator('input[placeholder*="投票のトピック"]').fill('バリデーションテスト');
        await page.locator('input[placeholder="選択肢 1"]').fill('選択肢1');
        await page.locator('input[placeholder="選択肢 2"]').fill('選択肢2');
        await page.getByRole('button', { name: '作成' }).click();

        // 日時エラーの確認
        await waitForToast(page, '終了日時は開始日時より後を設定してください');
    });

    test('Dynamic Vote作成', async ({ page }) => {
        // ページが完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle');

        // 投票タイプをDynamic Voteに設定
        await page.locator('select').selectOption('dynamic');

        // 日時を設定（開始時刻は現在、終了時刻は1時間後）
        const now = new Date();
        const startTime = now.toISOString().slice(0, 16);
        const endTime = new Date(now.getTime() + 3600000).toISOString().slice(0, 16);

        console.log('Setting start time:', startTime);
        console.log('Setting end time:', endTime);

        await page.locator('input[type="datetime-local"]').nth(0).fill(startTime);
        await page.locator('input[type="datetime-local"]').nth(1).fill(endTime);

        // フォーム入力
        await page.locator('input[placeholder*="投票のトピック"]').fill('テスト投票');
        await page.locator('input[placeholder="選択肢 1"]').fill('選択肢1');
        await page.locator('input[placeholder="選択肢 2"]').fill('選択肢2');

        // コンソールログをキャプチャするためのリスナーを追加
        page.on('console', (msg) => {
            console.log('Browser console:', msg.text());
        });

        // 作成実行前にパラメータを確認
        const params = await page.evaluate(() => {
            // フォームの値を取得
            const startInput = document.querySelector(
                'input[type="datetime-local"]'
            ) as HTMLInputElement;
            const endInput = document.querySelectorAll(
                'input[type="datetime-local"]'
            )[1] as HTMLInputElement;
            const topicInput = document.querySelector(
                'input[placeholder*="投票のトピック"]'
            ) as HTMLInputElement;

            return {
                start: startInput?.value,
                end: endInput?.value,
                topic: topicInput?.value,
                pollType: (document.querySelector('select') as HTMLSelectElement)?.value,
            };
        });

        console.log('Form values before submit:', params);

        // 作成実行
        await page.getByRole('button', { name: '作成' }).click();

        // 成功メッセージの確認
        await waitForToast(page, '議題を作成しました');

        // ホームページへのリダイレクト確認
        await page.waitForURL('/');
    });

    test('Weighted Vote作成', async ({ page }) => {
        // ページが完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle');

        // 投票タイプをWeighted Voteに設定
        await page.locator('select').selectOption('weighted');

        // トークンアドレス入力フィールドの表示確認
        await expect(page.locator('input[placeholder*="0x"]')).toBeVisible();

        // 無効なトークンアドレスのテスト
        await page.locator('input[placeholder*="0x"]').fill('invalid-address');

        // 他の必須項目を入力
        await page
            .locator('input[placeholder*="投票のトピック"]')
            .fill('Weighted Voteバリデーションテスト');
        await page.locator('input[placeholder="選択肢 1"]').fill('選択肢1');
        await page.locator('input[placeholder="選択肢 2"]').fill('選択肢2');

        // 日時を設定
        const now2 = new Date();
        const startTime2 = now2.toISOString().slice(0, 16);
        const endTime2 = new Date(now2.getTime() + 3600000).toISOString().slice(0, 16);
        await page.locator('input[type="datetime-local"]').nth(0).fill(startTime2);
        await page.locator('input[type="datetime-local"]').nth(1).fill(endTime2);

        await page.getByRole('button', { name: '作成' }).click();

        // エラーメッセージの確認
        await waitForToast(page, 'トークンアドレスを正しく入力してください');

        // 有効なトークンアドレスでテスト
        await page
            .locator('input[placeholder*="0x"]')
            .fill('0x1234567890123456789012345678901234567890');
        await page.locator('input[placeholder*="投票のトピック"]').fill('Weighted Voteテスト');
        await page.locator('input[placeholder="選択肢 1"]').fill('選択肢1');
        await page.locator('input[placeholder="選択肢 2"]').fill('選択肢2');

        // 日時を設定（開始時刻は現在、終了時刻は1時間後）
        const now = new Date();
        const startTime = now.toISOString().slice(0, 16);
        const endTime = new Date(now.getTime() + 3600000).toISOString().slice(0, 16);

        await page.locator('input[type="datetime-local"]').nth(0).fill(startTime);
        await page.locator('input[type="datetime-local"]').nth(1).fill(endTime);

        await page.getByRole('button', { name: '作成' }).click();

        // 成功メッセージの確認
        await waitForToast(page, '議題を作成しました');

        // ホームページへのリダイレクト確認
        await page.waitForURL('/');
    });

    test('Simple Vote作成', async ({ page }) => {
        // ページが完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle');

        // 投票タイプをSimple Voteに設定
        await page.locator('select').selectOption('simple');

        // 日時を設定（開始時刻は現在、終了時刻は1時間後）
        const now = new Date();
        const startTime = now.toISOString().slice(0, 16);
        const endTime = new Date(now.getTime() + 3600000).toISOString().slice(0, 16);

        await page.locator('input[type="datetime-local"]').nth(0).fill(startTime);
        await page.locator('input[type="datetime-local"]').nth(1).fill(endTime);

        // フォーム入力
        await page.locator('input[placeholder*="投票のトピック"]').fill('Simple Voteテスト');
        await page.locator('input[placeholder="選択肢 1"]').fill('選択肢1');
        await page.locator('input[placeholder="選択肢 2"]').fill('選択肢2');

        // 作成実行
        await page.getByRole('button', { name: '作成' }).click();

        // 成功メッセージの確認
        await waitForToast(page, '議題を作成しました');

        // ホームページへのリダイレクト確認
        await page.waitForURL('/');
    });

    test('選択肢の追加・削除', async ({ page }) => {
        // ページが完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle');

        // 初期選択肢数の確認
        await expect(page.locator('input[placeholder*="選択肢"]')).toHaveCount(2);

        // 選択肢を追加
        await page.getByRole('button', { name: '選択肢を追加' }).click();
        await expect(page.locator('input[placeholder*="選択肢"]')).toHaveCount(3);

        // 最大10個まで追加
        for (let i = 0; i < 7; i++) {
            await page.getByRole('button', { name: '選択肢を追加' }).click();
        }

        // 最大数に達したらボタンが無効化される
        await expect(page.getByRole('button', { name: '選択肢を追加' })).toBeDisabled();

        // 選択肢に値を入力
        for (let i = 0; i < 10; i++) {
            await page.locator(`input[placeholder="選択肢 ${i + 1}"]`).fill(`選択肢${i + 1}`);
        }

        // 日時を設定（開始時刻は現在、終了時刻は1時間後）
        const now = new Date();
        const startTime = now.toISOString().slice(0, 16);
        const endTime = new Date(now.getTime() + 3600000).toISOString().slice(0, 16);

        await page.locator('input[type="datetime-local"]').nth(0).fill(startTime);
        await page.locator('input[type="datetime-local"]').nth(1).fill(endTime);

        // トピックを入力
        await page.locator('input[placeholder*="投票のトピック"]').fill('選択肢テスト');

        // 作成実行
        await page.getByRole('button', { name: '作成' }).click();

        // 成功メッセージの確認
        await waitForToast(page, '議題を作成しました');
    });

    test('トランザクションエラーハンドリング', async ({ page }) => {
        // ページが完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle');

        // モックでエラーを発生させる
        await page.addInitScript(() => {
            // createPollメソッドでエラーを発生させるモック
            const originalCreatePoll = (window as any).ethers.Contract.prototype.createPoll;
            (window as any).ethers.Contract.prototype.createPoll = async () => {
                throw new Error('Transaction failed');
            };
        });

        // 日時を設定（開始時刻は現在、終了時刻は1時間後）
        const now = new Date();
        const startTime = now.toISOString().slice(0, 16);
        const endTime = new Date(now.getTime() + 3600000).toISOString().slice(0, 16);

        await page.locator('input[type="datetime-local"]').nth(0).fill(startTime);
        await page.locator('input[type="datetime-local"]').nth(1).fill(endTime);

        // フォーム入力
        await page.locator('input[placeholder*="投票のトピック"]').fill('エラーテスト');
        await page.locator('input[placeholder="選択肢 1"]').fill('選択肢1');
        await page.locator('input[placeholder="選択肢 2"]').fill('選択肢2');

        await page.getByRole('button', { name: '作成' }).click();

        // エラーメッセージの確認
        await waitForToast(page, 'エラー: Transaction failed');
    });

    test('投票タイプ変更時のUI更新', async ({ page }) => {
        // ページが完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle');

        // 初期状態ではトークンアドレスフィールドが非表示
        await expect(page.locator('input[placeholder*="0x"]')).not.toBeVisible();

        // Weighted Voteに変更
        await page.locator('select').selectOption('weighted');
        await expect(page.locator('input[placeholder*="0x"]')).toBeVisible();

        // Dynamic Voteに戻す
        await page.locator('select').selectOption('dynamic');
        await expect(page.locator('input[placeholder*="0x"]')).not.toBeVisible();

        // Simple Voteに変更
        await page.locator('select').selectOption('simple');
        await expect(page.locator('input[placeholder*="0x"]')).not.toBeVisible();
    });

    test('戻るボタンの動作', async ({ page }) => {
        // ページが完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle');

        // 戻るボタンをクリック
        await page.getByRole('button', { name: '戻る' }).click();

        // ホームページに戻ることを確認
        await page.waitForURL('/');
    });

    test('トランザクション承認待ち状態の表示', async ({ page }) => {
        // ページが完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle');

        // 日時を設定（開始時刻は現在、終了時刻は1時間後）
        const now = new Date();
        const startTime = now.toISOString().slice(0, 16);
        const endTime = new Date(now.getTime() + 3600000).toISOString().slice(0, 16);

        await page.locator('input[type="datetime-local"]').nth(0).fill(startTime);
        await page.locator('input[type="datetime-local"]').nth(1).fill(endTime);

        // フォーム入力
        await page.locator('input[placeholder*="投票のトピック"]').fill('承認待ちテスト');
        await page.locator('input[placeholder="選択肢 1"]').fill('選択肢1');
        await page.locator('input[placeholder="選択肢 2"]').fill('選択肢2');

        // 作成ボタンをクリック
        await page.getByRole('button', { name: '作成' }).click();

        // 承認待ちメッセージの確認
        await waitForToast(page, 'トランザクション承認待ち…');

        // ボタンが無効化されることを確認
        await expect(page.getByRole('button', { name: '作成中...' })).toBeDisabled();
    });
});
