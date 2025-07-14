/**
 * ETH送金スクリプト
 * 使用方法: npx hardhat run scripts/send-eth.js --network localhost
 */

const hre = require('hardhat');

async function main() {
    const [sender] = await hre.ethers.getSigners();

    // 送金先アドレス（MetaMaskのアドレスに変更してください）
    const recipientAddress = '0x276Befe43c6216343CeBb8675836B81F72C7140A';

    // 送金額（1 ETH）
    const amount = hre.ethers.parseEther('1000.0');

    console.log('送金開始...');
    console.log('送金元:', sender.address);
    console.log('送金先:', recipientAddress);
    console.log('送金額:', hre.ethers.formatEther(amount), 'ETH');

    // 送金実行
    const tx = await sender.sendTransaction({
        to: recipientAddress,
        value: amount,
    });

    await tx.wait();

    console.log('✅ 送金完了！');
    console.log('トランザクションハッシュ:', tx.hash);

    // 残高確認
    const senderBalance = await hre.ethers.provider.getBalance(sender.address);
    const recipientBalance = await hre.ethers.provider.getBalance(recipientAddress);

    console.log('送金元残高:', hre.ethers.formatEther(senderBalance), 'ETH');
    console.log('送金先残高:', hre.ethers.formatEther(recipientBalance), 'ETH');
}

main().catch((error) => {
    console.error('送金エラー:', error);
    process.exitCode = 1;
});
