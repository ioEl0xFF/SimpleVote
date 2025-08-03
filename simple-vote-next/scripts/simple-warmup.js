const http = require('http');

async function testConnection() {
    console.log('🔍 localhost:3000 への接続をテスト中...');

    return new Promise((resolve) => {
        const request = http.get('http://localhost:3000', (res) => {
            console.log(`✅ 接続成功! ステータス: ${res.statusCode}`);
            resolve(true);
        });

        request.on('error', () => {
            console.log('❌ サーバーに接続できません。まず `npm run dev` を実行してください。');
            resolve(false);
        });

        request.setTimeout(5000, () => {
            console.log('⏰ 接続タイムアウト');
            resolve(false);
        });
    });
}

async function warmupPage(path) {
    return new Promise((resolve) => {
        console.log(`🔄 ウォームアップ中: ${path}`);

        const request = http.get(`http://localhost:3000${path}`, (res) => {
            if (res.statusCode === 200) {
                console.log(`✅ 成功: ${path}`);
            } else {
                console.log(`⚠️  警告: ${path} (ステータス: ${res.statusCode})`);
            }
            resolve();
        });

        request.on('error', (err) => {
            console.log(`❌ エラー: ${path} - ${err.message}`);
            resolve();
        });

        request.setTimeout(15000, () => {
            console.log(`⏰ タイムアウト: ${path}`);
            resolve();
        });
    });
}

async function main() {
    const isConnected = await testConnection();

    if (!isConnected) {
        process.exit(1);
    }

    console.log('\n🚀 ページのウォームアップを開始...');

    const pages = ['/', '/create'];

    for (const page of pages) {
        await warmupPage(page);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機
    }

    console.log('\n🎉 ウォームアップ完了!');
}

main().catch(console.error);
