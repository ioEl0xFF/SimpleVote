const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    const wsUrl = process.env.WS_URL;
    const address = process.env.CONTRACT_ADDRESS;
    const abiPath = process.env.CONTRACT_ABI_PATH;

    if (!wsUrl || !address || !abiPath) {
        console.error('WS_URL, CONTRACT_ADDRESS, CONTRACT_ABI_PATHを環境変数で設定してください');
        process.exit(1);
    }

    const provider = new ethers.WebSocketProvider(wsUrl);
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
    const contract = new ethers.Contract(address, abi, provider);
    const logFile = path.join(__dirname, '..', 'event-log.json');

    function saveLog(entry) {
        let logs = [];
        if (fs.existsSync(logFile)) {
            logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        }
        logs.push(entry);
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 4));
    }

    // ABIからイベント定義を取得し、すべて監視する
    for (const fragment of contract.interface.fragments) {
        if (fragment.type === 'event') {
            contract.on(fragment.name, (...args) => {
                const event = args[args.length - 1];
                const entry = {
                    name: fragment.name,
                    args: event.args,
                    transactionHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    timestamp: Date.now(),
                };
                console.log(entry);
                saveLog(entry);
            });
        }
    }

    console.log('イベント監視を開始しました');

    // Ctrl+C で終了した際に WebSocket を閉じる
    process.on('SIGINT', () => {
        provider.destroy();
        process.exit(0);
    });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
