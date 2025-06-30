/**
 * SimpleVote コントラクトデプロイスクリプト
 *
 * このスクリプトは以下の処理を行います：
 * 1. PollRegistry コントラクトをデプロイ
 * 2. MockERC20 トークンをデプロイ
 * 3. デプロイされたアドレスを simple-vote-next/lib/constants.ts に自動更新
 * 4. 最新のABIを constants.ts に自動更新
 *
 * 使用方法：
 * npx hardhat run scripts/deploy.js --network localhost
 * npx hardhat run scripts/deploy.js --network sepolia
 *
 * 注意：
 * - デプロイ前に hardhat node を起動してください（localhostの場合）
 * - ネットワークに応じて適切な設定を行ってください
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

// ABI を取得してファイルパスを返す
const getAbi = (contractName) => {
    try {
        const dir = path.resolve(__dirname, `../artifacts/contracts/${contractName}.sol`);
        const file = fs.readFileSync(path.join(dir, `${contractName}.json`));
        const json = JSON.parse(file);
        return json.abi;
    } catch (e) {
        console.error(`Error reading ABI for ${contractName}:`, e);
        throw e;
    }
};

// 定数を更新する関数（より堅牢な実装）
const updateConstant = (content, key, value) => {
    // 複数のパターンに対応
    const patterns = [
        new RegExp(`export const ${key} = ['"][^'"]*['"];`),
        new RegExp(`export const ${key} = ['"][^'"]*['"]`),
        new RegExp(`const ${key} = ['"][^'"]*['"];`),
        new RegExp(`const ${key} = ['"][^'"]*['"]`),
    ];

    let updated = false;
    for (const pattern of patterns) {
        if (pattern.test(content)) {
            content = content.replace(pattern, `export const ${key} = '${value}';`);
            updated = true;
            break;
        }
    }

    if (!updated) {
        // パターンが見つからない場合は、ファイルの最後に追加
        console.warn(`Could not find ${key} in constants file, adding at the end`);
        content += `\nexport const ${key} = '${value}';\n`;
    }

    return content;
};

// ABI を更新する関数（より堅牢な実装）
const updateAbi = (content, key, abi) => {
    const abiString = JSON.stringify(abi, null, 4);

    // 既存のABIを探す
    const startPattern = `export const ${key} = [`;
    const startIndex = content.indexOf(startPattern);

    if (startIndex === -1) {
        // ABIが見つからない場合は、ファイルの最後に追加
        console.warn(`Could not find ${key} ABI in constants file, adding at the end`);
        content += `\nexport const ${key} = ${abiString};\n`;
        return content;
    }

    // 次のexport constの位置を探す
    const afterStart = content.substring(startIndex);
    const nextExportIndex = afterStart.indexOf('\nexport const');

    let endIndex;
    if (nextExportIndex !== -1) {
        endIndex = startIndex + nextExportIndex;
    } else {
        // ファイルの最後の場合
        endIndex = content.length;
    }

    // ABI部分を置換
    const beforeAbi = content.substring(0, startIndex);
    const afterAbi = content.substring(endIndex);

    return beforeAbi + `export const ${key} = ${abiString};` + afterAbi;
};

async function main() {
    console.log('Starting deployment...');

    const Registry = await hre.ethers.getContractFactory('PollRegistry');
    const Token = await hre.ethers.getContractFactory('MockERC20');

    // PollRegistry のデプロイ
    console.log('Deploying PollRegistry...');
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    console.log('PollRegistry deployed to:', registry.target);

    // フロントエンドのアドレス書き換え設定（Next.jsプロジェクト）
    const constantsPath = path.join(__dirname, '..', 'simple-vote-next', 'lib', 'constants.ts');

    // ファイルが存在するかチェック
    if (!fs.existsSync(constantsPath)) {
        console.error(`Constants file not found at: ${constantsPath}`);
        console.log('Please ensure the Next.js project is properly set up.');
        return;
    }

    console.log('Updating constants.ts...');
    let data = fs.readFileSync(constantsPath, 'utf8');

    // PollRegistry アドレスを更新
    data = updateConstant(data, 'POLL_REGISTRY_ADDRESS', registry.target);
    console.log('Updated POLL_REGISTRY_ADDRESS in constants.ts');

    // WeightedVote 用のトークンをデプロイ
    console.log('Deploying MockERC20...');
    const token = await Token.deploy('VoteToken', 'VTK');
    await token.waitForDeployment();
    const [deployer] = await hre.ethers.getSigners();
    await token.mint(deployer.address, hre.ethers.parseEther('1000'));

    console.log('VoteToken deployed to:', token.target);

    // MockERC20 アドレスを更新
    data = updateConstant(data, 'MOCK_ERC20_ADDRESS', token.target);
    console.log('Updated MOCK_ERC20_ADDRESS in constants.ts');

    // ABI を更新
    console.log('Updating ABIs...');
    data = updateAbi(data, 'POLL_REGISTRY_ABI', getAbi('PollRegistry'));
    data = updateAbi(data, 'ERC20_ABI', getAbi('MockERC20'));

    // ファイルに書き込み
    fs.writeFileSync(constantsPath, data);
    console.log('Successfully updated constants.ts with new addresses and ABIs');

    // デプロイされたアドレスを表示
    console.log('\n=== Deployment Summary ===');
    console.log('PollRegistry:', registry.target);
    console.log('MockERC20:', token.target);
    console.log('Constants file updated:', constantsPath);
    console.log('==========================\n');
}

main().catch((error) => {
    console.error('Deployment failed:', error);
    process.exitCode = 1;
});
