const { parseChecklist } = require('./tests/helpers/checklist-updater');

// テスト用のチェックリストファイルパス
const checklistPath = './docs/playwright-test-checklist.md';

console.log('🔍 チェックリストパーサーのテスト開始...');

try {
  const items = parseChecklist(checklistPath);
  console.log(`📋 検出されたチェックリスト項目数: ${items.length}`);
  
  if (items.length > 0) {
    console.log('\n📝 検出された項目:');
    items.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.description} (${item.checked ? 'チェック済み' : '未チェック'})`);
    });
  } else {
    console.log('❌ チェックリスト項目が検出されませんでした');
  }
} catch (error) {
  console.error('❌ エラーが発生しました:', error.message);
} 