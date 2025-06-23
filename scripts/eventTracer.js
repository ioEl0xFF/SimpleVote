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

    if (!/^wss?:\/\//.test(wsUrl)) {
        console.error('WS_URL は ws:// または wss:// で始まる URL を指定してください');
        process.exit(1);
    }

    if (!ethers.isAddress(address)) {
        console.error('CONTRACT_ADDRESS が正しくありません');
        process.exit(1);
    }

    if (!fs.existsSync(abiPath)) {
        console.error('CONTRACT_ABI_PATH が存在しません');
        process.exit(1);
    }

    const provider = new ethers.WebSocketProvider(wsUrl);

    provider.websocket.on('open', () => {
        console.log('WebSocket に接続しました');
    });

    provider.websocket.on('error', (err) => {
        console.error('WebSocket エラー:', err.message);
        if (err.message.includes('SSL')) {
            console.error('SSL 接続に失敗しました。WS_URL が正しいか確認してください');
        }
    });

    provider.websocket.on('close', (code, reason) => {
        console.error(`WebSocket が終了しました: ${code} ${reason || ''}`);
        process.exit(1);
    });
    let abi;
    try {
        abi = JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
    } catch (err) {
        console.error('ABI の読み込みに失敗しました:', err.message);
        process.exit(1);
    }

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
