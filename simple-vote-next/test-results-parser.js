const { parsePlaywrightResults } = require('./tests/helpers/checklist-updater');

// テスト用のテスト結果ディレクトリパス
const testResultsPath = './test-results';

console.log('🔍 テスト結果パーサーのテスト開始...');

try {
  const results = parsePlaywrightResults(testResultsPath);
  console.log(`🧪 検出されたテスト結果数: ${results.length}`);
  
  if (results.length > 0) {
    console.log('\n📝 検出されたテスト結果:');
    results.forEach((result, index) => {
      const statusIcon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏸️';
      console.log(`   ${index + 1}. ${statusIcon} ${result.testName} (${result.status})`);
    });
    
    const passedCount = results.filter(r => r.status === 'passed').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    console.log(`\n📊 統計: 成功 ${passedCount}, 失敗 ${failedCount}`);
  } else {
    console.log('❌ テスト結果が検出されませんでした');
  }
} catch (error) {
  console.error('❌ エラーが発生しました:', error.message);
} 