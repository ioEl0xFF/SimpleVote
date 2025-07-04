const fs = require('fs');
const path = require('path');

/**
 * チェックリストファイルを解析して構造化データに変換
 */
function parseChecklist(checklistPath) {
    const content = fs.readFileSync(checklistPath, 'utf-8');
    const lines = content.split('\n');
    const items = [];
    let currentSection = '';

    for (const line of lines) {
        const trimmedLine = line.trim();

        // セクション検出
        if (trimmedLine.startsWith('### ')) {
            currentSection = trimmedLine.replace('### ', '').trim();
            continue;
        }

        // チェックボックス項目検出（複数の形式に対応）
        if (
            trimmedLine.startsWith('- [ ]') ||
            trimmedLine.startsWith('- [x]') ||
            trimmedLine.startsWith('-   [ ]') ||
            trimmedLine.startsWith('-   [x]')
        ) {
            const isChecked = trimmedLine.includes('[x]');

            // チェックボックス部分を除去して項目名を抽出
            let description = trimmedLine
                .replace(/^- \[[x ]\]\s*/, '') // "- [ ] " または "- [x] " を除去
                .replace(/^-   \[[x ]\]\s*/, '') // "-   [ ] " または "-   [x] " を除去
                .trim();

            // **を除去
            description = description.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();

            // テストファイルとテスト名を抽出（コメント形式で記述されている場合）
            const testFileMatch = line.match(/<!-- test-file: (.+?) -->/);
            const testNameMatch = line.match(/<!-- test-name: (.+?) -->/);

            if (description) {
                items.push({
                    id: `${currentSection}-${description}`
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '-'),
                    description,
                    checked: isChecked,
                    testFile: testFileMatch?.[1],
                    testName: testNameMatch?.[1],
                });
            }
        }
    }

    return items;
}

/**
 * テスト結果をチェックリスト項目とマッチング
 */
function matchTestResultsToChecklist(testResults, checklistItems) {
    const updatedItems = checklistItems.map((item) => {
        // テストファイルとテスト名が指定されている場合
        if (item.testFile && item.testName) {
            const matchingTest = testResults.find(
                (test) =>
                    test.testName.includes(item.testName) && test.testName.includes(item.testFile)
            );

            if (matchingTest) {
                return {
                    ...item,
                    checked: matchingTest.status === 'passed',
                };
            }
        }

        // テスト名のみでマッチング
        if (item.testName) {
            const matchingTest = testResults.find((test) => test.testName.includes(item.testName));

            if (matchingTest) {
                return {
                    ...item,
                    checked: matchingTest.status === 'passed',
                };
            }
        }

        // 説明文でマッチング（より柔軟なマッチング）
        const matchingTest = testResults.find((test) => {
            const testNameLower = test.testName.toLowerCase();
            const descriptionLower = item.description.toLowerCase();

            // 完全一致
            if (testNameLower === descriptionLower) return true;

            // 部分一致（説明文がテスト名に含まれている）
            if (testNameLower.includes(descriptionLower)) return true;

            // テスト名が説明文に含まれている
            if (descriptionLower.includes(testNameLower)) return true;

            // キーワードマッチング（より厳密に）
            const descriptionWords = descriptionLower
                .split(/\s+/)
                .filter((word) => word.length > 1);
            const testNameWords = testNameLower.split(/\s+/).filter((word) => word.length > 1);

            if (descriptionWords.length === 0 || testNameWords.length === 0) return false;

            const commonWords = descriptionWords.filter((word) =>
                testNameWords.some((testWord) => testWord.includes(word) || word.includes(testWord))
            );

            // より厳密なマッチング条件
            const matchRatio =
                commonWords.length / Math.max(descriptionWords.length, testNameWords.length);
            return matchRatio >= 0.5 && commonWords.length >= 2;
        });

        if (matchingTest) {
            return {
                ...item,
                checked: matchingTest.status === 'passed',
            };
        }

        return item;
    });

    // デバッグ用: マッチング結果の詳細を表示
    console.log('\n🔍 詳細マッチング結果:');
    let matchedCount = 0;
    updatedItems.forEach((item) => {
        if (item.checked) {
            console.log(`   ✅ ${item.description}`);
            matchedCount++;
        }
    });

    if (matchedCount === 0) {
        console.log('   ⚠️  マッチした項目がありません');
        console.log('\n🔍 デバッグ情報:');
        console.log('   チェックリスト項目例:');
        checklistItems.slice(0, 5).forEach((item) => {
            console.log(`     - "${item.description}"`);
        });
        console.log('\n   テスト結果例:');
        testResults.slice(0, 5).forEach((result) => {
            console.log(`     - "${result.testName}" (${result.status})`);
        });
    }

    return updatedItems;
}

/**
 * 先頭に追加
 */
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

/**
 * チェックリストファイルを更新
 */
function updateChecklistFile(checklistPath, updatedItems) {
    let content = fs.readFileSync(checklistPath, 'utf-8');
    const lines = content.split('\n');
    const updatedLines = [];
    let updateCount = 0;

    // デバッグ用: 最初の数行を表示
    console.log('\n🔍 デバッグ情報:');
    console.log('   チェックリストの最初の数行:');
    lines.slice(0, 10).forEach((line, index) => {
        console.log(`   ${index + 1}: "${line}"`);
    });

    for (const line of lines) {
        let updatedLine = line;
        let lineUpdated = false;

        for (const item of updatedItems) {
            const desc = item.description.trim();

            // 元の行から**の有無を判定
            const isMain = line.includes('**') && line.includes(desc);

            if (item.checked) {
                // チェックされていない項目をチェック済みに変更

                if (isMain) {
                    // メイン項目: -   [ ] **項目名** → -   [x] **項目名**
                    const searchStr = `-   [ ] **${desc}**`;
                    const replaceStr = `-   [x] **${desc}**`;
                    if (line.includes(searchStr)) {
                        updatedLine = line.replace(searchStr, replaceStr);
                        lineUpdated = true;
                        updateCount++;
                        console.log(`   ✅ チェック済み: **${desc}**`);
                    } else {
                        // デバッグ用: マッチしない場合の詳細を表示
                        console.log(
                            `   🔍 メイン項目マッチ失敗: 検索="${searchStr}", 行="${line}"`
                        );
                    }
                } else {
                    // サブ項目: 4スペース + -   [ ] 項目名 → 4スペース + -   [x] 項目名
                    const searchStr = `    -   [ ] ${desc}`;
                    const replaceStr = `    -   [x] ${desc}`;
                    if (line.includes(searchStr)) {
                        updatedLine = line.replace(searchStr, replaceStr);
                        lineUpdated = true;
                        updateCount++;
                        console.log(`   ✅ チェック済み: ${desc} (サブ項目)`);
                    } else {
                        // 単独項目: -   [ ] 項目名 → -   [x] 項目名
                        const searchStr2 = `-   [ ] ${desc}`;
                        const replaceStr2 = `-   [x] ${desc}`;
                        if (line.includes(searchStr2) && !line.includes('**')) {
                            updatedLine = line.replace(searchStr2, replaceStr2);
                            lineUpdated = true;
                            updateCount++;
                            console.log(`   ✅ チェック済み: ${desc}`);
                        } else {
                            // デバッグ用: マッチしない場合の詳細を表示（最初の3項目のみ）
                            if (updateCount < 3) {
                                console.log(
                                    `   🔍 サブ項目マッチ失敗: 検索1="${searchStr}", 検索2="${searchStr2}", 行="${line}"`
                                );
                            }
                        }
                    }
                }
            } else {
                // チェック済み項目をチェックされていない状態に変更

                if (isMain) {
                    // メイン項目: -   [x] **項目名** → -   [ ] **項目名**
                    const searchStr = `-   [x] **${desc}**`;
                    const replaceStr = `-   [ ] **${desc}**`;
                    if (line.includes(searchStr)) {
                        updatedLine = line.replace(searchStr, replaceStr);
                        lineUpdated = true;
                        updateCount++;
                        console.log(`   ❌ アンチェック: **${desc}**`);
                    }
                } else {
                    // サブ項目: 4スペース + -   [x] 項目名 → 4スペース + -   [ ] 項目名
                    const searchStr = `    -   [x] ${desc}`;
                    const replaceStr = `    -   [ ] ${desc}`;
                    if (line.includes(searchStr)) {
                        updatedLine = line.replace(searchStr, replaceStr);
                        lineUpdated = true;
                        updateCount++;
                        console.log(`   ❌ アンチェック: ${desc} (サブ項目)`);
                    } else {
                        // 単独項目: -   [x] 項目名 → -   [ ] 項目名
                        const searchStr2 = `-   [x] ${desc}`;
                        const replaceStr2 = `-   [ ] ${desc}`;
                        if (line.includes(searchStr2) && !line.includes('**')) {
                            updatedLine = line.replace(searchStr2, replaceStr2);
                            lineUpdated = true;
                            updateCount++;
                            console.log(`   ❌ アンチェック: ${desc}`);
                        }
                    }
                }
            }
        }

        updatedLines.push(updatedLine);
    }

    const updatedContent = updatedLines.join('\n');

    if (updatedContent !== content) {
        fs.writeFileSync(checklistPath, updatedContent, 'utf-8');
        console.log(`📝 チェックリストファイルを更新しました (${updateCount} 項目)`);
    } else {
        console.log('⚠️  更新する項目が見つかりませんでした');
    }
}

/**
 * Playwrightテスト結果を再帰的に抽出（新しい形式に対応）
 */
function extractTestResultsFromSuite(suite, results = []) {
    if (suite.specs) {
        suite.specs.forEach((spec) => {
            if (spec.tests) {
                spec.tests.forEach((test) => {
                    if (test.results && test.results.length > 0) {
                        const result = test.results[0];
                        // テスト名をより正確に取得
                        const testName = test.title || spec.title || 'Unknown Test';
                        results.push({
                            testName: testName,
                            status: result.status || 'skipped',
                            duration: result.duration,
                            error: result.errors?.[0]?.message,
                            specTitle: spec.title,
                            fullTitle: `${spec.title} - ${testName}`,
                        });
                    }
                });
            }
        });
    }
    if (suite.suites) {
        suite.suites.forEach((child) => extractTestResultsFromSuite(child, results));
    }
    return results;
}

/**
 * Playwrightテスト結果を解析（新しい形式に対応）
 */
function parsePlaywrightResults(resultsPath) {
    const results = [];
    try {
        if (!fs.existsSync(resultsPath)) {
            console.log(`⚠️  テスト結果ディレクトリが存在しません: ${resultsPath}`);
            return results;
        }

        // results.jsonファイルを直接読み込み
        const resultsJsonPath = path.join(resultsPath, 'results.json');
        if (fs.existsSync(resultsJsonPath)) {
            const content = JSON.parse(fs.readFileSync(resultsJsonPath, 'utf-8'));

            // 新しい形式: suites配列からテスト結果を抽出
            if (content.suites) {
                content.suites.forEach((suite) => extractTestResultsFromSuite(suite, results));
            }
        } else {
            // フォールバック: ディレクトリ内のJSONファイルを探索
            const resultFiles = fs.readdirSync(resultsPath);
            for (const file of resultFiles) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(resultsPath, file);
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    if (content.suites) {
                        content.suites.forEach((suite) =>
                            extractTestResultsFromSuite(suite, results)
                        );
                    }
                }
            }
        }
    } catch (error) {
        console.error('Playwright結果の解析エラー:', error);
    }
    return results;
}

/**
 * メイン関数: テスト結果をチェックリストに反映
 */
function updateChecklistFromTestResults(checklistPath, testResultsPath) {
    console.log('🔍 チェックリストの更新を開始...');

    // チェックリストを解析
    const checklistItems = parseChecklist(checklistPath);
    console.log(`📋 チェックリスト項目数: ${checklistItems.length}`);

    // テスト結果を解析
    const testResults = parsePlaywrightResults(testResultsPath);
    console.log(`🧪 テスト結果数: ${testResults.length}`);

    // デバッグ用: テスト結果の詳細を表示
    if (testResults.length > 0) {
        console.log('📝 検出されたテスト結果:');
        testResults.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.testName} - ${result.status}`);
        });
    }

    // マッチングと更新
    const updatedItems = matchTestResultsToChecklist(testResults, checklistItems);

    // チェックリストファイルを更新
    updateChecklistFile(checklistPath, updatedItems);

    // 統計情報を表示
    const passedTests = testResults.filter((t) => t.status === 'passed').length;
    const failedTests = testResults.filter((t) => t.status === 'failed').length;
    const checkedItems = updatedItems.filter((i) => i.checked).length;

    console.log(`\n📊 最終統計:`);
    console.log(`✅ パスしたテスト: ${passedTests}`);
    console.log(`❌ 失敗したテスト: ${failedTests}`);
    console.log(`☑️ チェック済み項目: ${checkedItems}/${updatedItems.length}`);
    console.log('🎉 チェックリストの更新が完了しました！');
}

/**
 * 手動でチェックリスト項目を更新
 */
function manuallyUpdateChecklistItem(checklistPath, itemId, checked) {
    const checklistItems = parseChecklist(checklistPath);
    const item = checklistItems.find((i) => i.id === itemId);

    if (item) {
        item.checked = checked;
        updateChecklistFile(checklistPath, [item]);
        console.log(
            `✅ 項目 "${item.description}" を ${checked ? 'チェック' : 'アンチェック'} しました`
        );
    } else {
        console.error(`❌ 項目ID "${itemId}" が見つかりません`);
    }
}

/**
 * チェックリストの統計情報を表示
 */
function showChecklistStats(checklistPath) {
    const checklistItems = parseChecklist(checklistPath);
    const totalItems = checklistItems.length;
    const checkedItems = checklistItems.filter((i) => i.checked).length;
    const progress = Math.round((checkedItems / totalItems) * 100);

    console.log(`📊 チェックリスト統計:`);
    console.log(`   総項目数: ${totalItems}`);
    console.log(`   完了項目: ${checkedItems}`);
    console.log(`   進捗率: ${progress}%`);

    // 未完了項目を表示
    const uncheckedItems = checklistItems.filter((i) => !i.checked);
    if (uncheckedItems.length > 0) {
        console.log(`\n⏳ 未完了項目:`);
        uncheckedItems.forEach((item) => {
            console.log(`   - ${item.description}`);
        });
    }
}

module.exports = {
    updateChecklistFromTestResults,
    showChecklistStats,
    manuallyUpdateChecklistItem,
    parseChecklist,
    matchTestResultsToChecklist,
    updateChecklistFile,
    parsePlaywrightResults,
};
