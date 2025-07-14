/**
 * 新しいアカウントを作成して送金するスクリプト
 * 使用方法: npx hardhat run scripts/create-and-send.js --network localhost
 */

const hre = require('hardhat');

async function main() {
    // 新しいアカウントを作成
    const wallet = hre.ethers.Wallet.createRandom();
    const newAddress = wallet.address;
    const privateKey = wallet.privateKey;

    console.log('新しいアカウントを作成しました:');
    console.log('アドレス:', newAddress);
    console.log('秘密鍵:', privateKey);
    console.log('');

    // 送金元アカウント
    const [sender] = await hre.ethers.getSigners();

    // 送金額（100 ETH）
    const amount = hre.ethers.parseEther('100.0');

    console.log('送金開始...');
    console.log('送金元:', sender.address);
    console.log('送金先:', newAddress);
    console.log('送金額:', hre.ethers.formatEther(amount), 'ETH');

    // 送金実行
    const tx = await sender.sendTransaction({
        to: newAddress,
        value: amount,
    });

    await tx.wait();

    console.log('✅ 送金完了！');
    console.log('トランザクションハッシュ:', tx.hash);

    // 残高確認
    const senderBalance = await hre.ethers.provider.getBalance(sender.address);
    const recipientBalance = await hre.ethers.provider.getBalance(newAddress);

    console.log('送金元残高:', hre.ethers.formatEther(senderBalance), 'ETH');
    console.log('送金先残高:', hre.ethers.formatEther(recipientBalance), 'ETH');

    console.log('\n=== MetaMaskでインポートしてください ===');
    console.log('1. MetaMaskを開く');
    console.log('2. アカウントアイコン → 「アカウントをインポート」');
    console.log('3. 「秘密鍵」を選択');
    console.log('4. 上記の秘密鍵を入力');
    console.log('5. インポート完了後、Localhost 8545ネットワークに切り替え');
}

main().catch((error) => {
    console.error('エラー:', error);
    process.exitCode = 1;
});
