#!/usr/bin/env node

const { 
  updateChecklistFromTestResults, 
  showChecklistStats,
  manuallyUpdateChecklistItem 
} = require('../tests/helpers/checklist-updater.js');
const path = require('path');

// コマンドライン引数の解析
const args = process.argv.slice(2);
const command = args[0];

const checklistPath = path.join(__dirname, '../docs/playwright-test-checklist.md');
const testResultsPath = path.join(__dirname, '../test-results');

function showHelp() {
  console.log(`
🔧 SimpleVote チェックリスト更新ツール

使用方法:
  node scripts/update-checklist.js <command> [options]

コマンド:
  update    テスト結果からチェックリストを自動更新
  stats     チェックリストの統計情報を表示
  manual    手動でチェックリスト項目を更新

オプション:
  --checklist <path>    チェックリストファイルのパス (デフォルト: docs/playwright-test-checklist.md)
  --results <path>      テスト結果ディレクトリのパス (デフォルト: test-results)
  --item <id>           手動更新時の項目ID
  --checked <true|false> 手動更新時のチェック状態

例:
  # テスト結果から自動更新
  node scripts/update-checklist.js update

  # 統計情報を表示
  node scripts/update-checklist.js stats

  # 手動で項目を更新
  node scripts/update-checklist.js manual --item "wallet-connection-接続ボタンの表示" --checked true

  # カスタムパスを指定
  node scripts/update-checklist.js update --checklist ./custom-checklist.md --results ./custom-results
`);
}

async function main() {
  try {
    switch (command) {
      case 'update':
        console.log('🔄 テスト結果からチェックリストを更新中...');
        updateChecklistFromTestResults(checklistPath, testResultsPath);
        break;

      case 'stats':
        console.log('📊 チェックリスト統計情報:');
        showChecklistStats(checklistPath);
        break;

      case 'manual':
        const itemId = args.find(arg => arg.startsWith('--item='))?.split('=')[1];
        const checked = args.find(arg => arg.startsWith('--checked='))?.split('=')[1];
        
        if (!itemId || !checked) {
          console.error('❌ 手動更新には --item と --checked オプションが必要です');
          process.exit(1);
        }
        
        const isChecked = checked.toLowerCase() === 'true';
        manuallyUpdateChecklistItem(checklistPath, itemId, isChecked);
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.error('❌ 無効なコマンドです');
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみmain関数を呼び出し
if (require.main === module) {
  main();
}

module.exports = { main }; 