const { spawn } = require('child_process');
const http = require('http');

// プリコンパイルしたいページのリスト（存在が確認されたページのみ）
const PAGES_TO_WARM = [
    '/',
    '/create',
    // 動的ルートページはpollIdパラメータが必要で存在しない可能性があるため除外
    // '/simple/1',
    // '/weighted/1',
    // '/dynamic/1',
    // /test ページは存在しないため除外
];

// サーバーがレスポンドするまで待機
function waitForServer(url, timeout = 60000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        let retryCount = 0;

        function check() {
            const elapsed = Date.now() - startTime;
            if (elapsed > timeout) {
                reject(new Error('サーバーの起動がタイムアウトしました'));
                return;
            }

            const request = http.get(url, (res) => {
                if (res.statusCode === 200) {
                    console.log(`✅ サーバーが応答しました (${(elapsed / 1000).toFixed(1)}秒後)`);
                    resolve();
                } else {
                    console.log(`⏳ サーバー準備中... (ステータス: ${res.statusCode})`);
                    setTimeout(check, 2000);
                }
            });

            request.on('error', () => {
                retryCount++;
                if (retryCount % 10 === 0) {
                    console.log(
                        `⏳ サーバーの起動を待機中... (${(elapsed / 1000).toFixed(1)}秒経過)`
                    );
                }
                setTimeout(check, 2000);
            });

            request.setTimeout(8000);
        }

        check();
    });
}

// ページにアクセスしてプリコンパイル
async function warmUpPage(path) {
    return new Promise((resolve, reject) => {
        const url = `http://localhost:3000${path}`;
        console.log(`🔄 プリコンパイル中: ${path}`);

        const request = http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ 完了: ${path}`);
                    resolve();
                } else {
                    console.log(`⚠️  警告: ${path} (ステータス: ${res.statusCode})`);
                    resolve(); // エラーでも続行
                }
            });
        });

        request.on('error', (err) => {
            console.log(`❌ エラー: ${path} - ${err.message}`);
            resolve(); // エラーでも続行
        });

        request.setTimeout(10000, () => {
            console.log(`⏰ タイムアウト: ${path}`);
            resolve(); // タイムアウトでも続行
        });
    });
}

// メイン処理
async function warmUpPages() {
    console.log('🚀 Next.js ページプリコンパイルを開始...\n');

    try {
        // サーバーの起動を待機
        console.log('⏳ サーバーの起動を待機中...');
        await waitForServer('http://localhost:3000');

        console.log('\n📝 以下のページをプリコンパイルします:');
        PAGES_TO_WARM.forEach((page) => console.log(`   - ${page}`));
        console.log('');

        // 各ページを順次プリコンパイル
        for (const page of PAGES_TO_WARM) {
            await warmUpPage(page);
            // 少し間隔を空ける
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        console.log('\n🎉 プリコンパイル完了！すべてのページが準備されました。');
        console.log('💡 ブラウザでアクセスすると即座にページが表示されます。\n');
    } catch (error) {
        console.error('❌ プリコンパイル中にエラーが発生:', error.message);
        process.exit(1);
    }
}

// スクリプトが直接実行された場合
if (require.main === module) {
    warmUpPages();
}

module.exports = { warmUpPages, waitForServer };
