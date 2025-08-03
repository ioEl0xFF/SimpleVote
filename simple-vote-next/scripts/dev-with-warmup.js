const { spawn } = require('child_process');
const { warmUpPages } = require('./warm-up-pages');

console.log('🚀 Next.js 開発サーバーを起動中...\n');

// Next.js開発サーバーを起動
const devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
});

// サーバー起動後にウォームアップを実行
setTimeout(async () => {
    try {
        console.log('⏰ サーバー起動から10秒後、ウォームアップを開始します...');
        await warmUpPages();
    } catch (error) {
        console.error('ウォームアップ中にエラーが発生:', error.message);
        console.log('💡 手動でウォームアップを実行する場合: npm run warm-pages');
    }
}, 10000); // 10秒後にウォームアップ開始

// Ctrl+C でのクリーンアップ
process.on('SIGINT', () => {
    console.log('\n🛑 サーバーを停止中...');
    devServer.kill('SIGINT');
    process.exit(0);
});

// サーバーが終了した場合
devServer.on('close', (code) => {
    console.log(`開発サーバーが終了しました (コード: ${code})`);
    process.exit(code);
});

devServer.on('error', (err) => {
    console.error('開発サーバーでエラーが発生:', err);
    process.exit(1);
});
