/**
 * アカウント情報確認スクリプト
 * 使用方法: npx hardhat run scripts/get-account-info.js --network localhost
 */

const hre = require('hardhat');

async function main() {
    // 確認したいアドレス
    const targetAddress = '0x276Befe43c6216343CeBb8675836B81F72C7140A';

    console.log('アカウント情報確認...');
    console.log('アドレス:', targetAddress);

    // 残高確認
    const balance = await hre.ethers.provider.getBalance(targetAddress);
    console.log('残高:', hre.ethers.formatEther(balance), 'ETH');

    // Hardhatのアカウント一覧を表示
    console.log('\n=== Hardhat アカウント一覧 ===');
    const accounts = await hre.ethers.getSigners();

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const accountBalance = await hre.ethers.provider.getBalance(account.address);
        console.log(
            `Account #${i}: ${account.address} (${hre.ethers.formatEther(accountBalance)} ETH)`
        );

        // 秘密鍵を表示（MetaMaskでインポート用）
        // Hardhatの設定から秘密鍵を取得
        const privateKey = hre.network.config.accounts[i];
        if (privateKey) {
            console.log(`Private Key: ${privateKey}`);
        } else {
            console.log('Private Key: Not available');
        }
        console.log('---');
    }

    // 対象アドレスがHardhatアカウントかチェック
    const isHardhatAccount = accounts.some(
        (account) => account.address.toLowerCase() === targetAddress.toLowerCase()
    );

    if (isHardhatAccount) {
        console.log('✅ このアドレスはHardhatアカウントです');
        console.log('MetaMaskで秘密鍵をインポートしてください');
    } else {
        console.log('❌ このアドレスはHardhatアカウントではありません');
        console.log('別のアカウントから送金するか、新しいアカウントを作成してください');
    }

    // 送金履歴を確認
    console.log('\n=== 最近のトランザクション確認 ===');
    const latestBlock = await hre.ethers.provider.getBlockNumber();
    console.log('最新ブロック:', latestBlock);

    // 最新の10ブロックを確認
    for (let i = 0; i < 10; i++) {
        const blockNumber = latestBlock - i;
        const block = await hre.ethers.provider.getBlock(blockNumber, true);

        if (block && block.transactions) {
            for (const tx of block.transactions) {
                if (tx.to && tx.to.toLowerCase() === targetAddress.toLowerCase()) {
                    console.log(
                        `ブロック ${blockNumber}: ${hre.ethers.formatEther(tx.value)} ETH を受信`
                    );
                }
            }
        }
    }
}

main().catch((error) => {
    console.error('エラー:', error);
    process.exitCode = 1;
});
