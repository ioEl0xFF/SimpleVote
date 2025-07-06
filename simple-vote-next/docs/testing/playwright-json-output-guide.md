# Playwright テスト結果を JSON ファイルに出力する方法

## 概要

Playwright では、テスト実行結果を JSON 形式で出力することができます。これにより、テスト結果の分析や CI/CD パイプラインでの処理が容易になります。

## 基本的な設定方法

### 1. playwright.config.ts での設定

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html'],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/results.xml' }],
    ],
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
```

### 2. コマンドラインでの実行

```bash
# JSONレポーターを指定して実行
npx playwright test --reporter=json:test-results/results.json

# 複数のレポーターを同時に使用
npx playwright test --reporter=html,json:test-results/results.json,junit:test-results/results.xml
```

## JSON 出力の詳細設定

### 出力オプション

```typescript
export default defineConfig({
    reporter: [
        [
            'json',
            {
                outputFile: 'test-results/results.json',
                // 出力する情報をカスタマイズ
                includeAttachments: true, // 添付ファイルを含める
                includeStdout: true, // 標準出力を含める
                includeStderr: true, // 標準エラーを含める
            },
        ],
    ],
});
```

### 複数の JSON ファイルに分割

```typescript
export default defineConfig({
    reporter: [
        ['json', { outputFile: 'test-results/summary.json' }],
        ['json', { outputFile: 'test-results/detailed.json' }],
    ],
});
```

## JSON 出力の構造

Playwright が生成する JSON ファイルの構造例：

```json
{
    "config": {
        "configDir": "/path/to/project",
        "globalTimeout": 30000,
        "grep": null,
        "grepInvert": null,
        "maxFailures": 0,
        "metadata": {},
        "projects": [
            {
                "name": "chromium",
                "use": {
                    "browserName": "chromium",
                    "deviceScaleFactor": 1,
                    "hasTouch": false,
                    "isMobile": false,
                    "viewport": {
                        "height": 720,
                        "width": 1280
                    }
                }
            }
        ],
        "reporter": [["json", { "outputFile": "test-results/results.json" }]],
        "rootDir": "/path/to/project",
        "testDir": "tests",
        "timeout": 30000,
        "workers": 1
    },
    "suites": [
        {
            "title": "投票機能",
            "file": "tests/e2e/voting.spec.ts",
            "line": 0,
            "column": 0,
            "specs": [
                {
                    "title": "新しい投票を作成できる",
                    "ok": true,
                    "tags": [],
                    "tests": [
                        {
                            "timeout": 30000,
                            "annotations": [],
                            "attachments": [],
                            "projectName": "chromium",
                            "results": [
                                {
                                    "workerIndex": 0,
                                    "status": "passed",
                                    "duration": 2500,
                                    "error": null,
                                    "stdout": [],
                                    "stderr": [],
                                    "attachments": [],
                                    "steps": [
                                        {
                                            "title": "ページに移動",
                                            "category": "test.step",
                                            "startTime": "2024-01-01T00:00:00.000Z",
                                            "duration": 500,
                                            "error": null
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ],
    "errors": [],
    "stats": {
        "startTime": "2024-01-01T00:00:00.000Z",
        "duration": 5000,
        "expected": 1,
        "unexpected": 0,
        "flaky": 0,
        "skipped": 0
    }
}
```

## エラー内容の出力場所

Playwright の JSON 出力では、エラー情報は複数の場所に出力されます：

### 1. テストレベルのエラー

```json
{
    "suites": [
        {
            "specs": [
                {
                    "tests": [
                        {
                            "results": [
                                {
                                    "status": "failed",
                                    "error": {
                                        "message": "Element not found: [data-testid='submit-button']",
                                        "stack": "Error: Element not found: [data-testid='submit-button']\n    at Object.<anonymous> (/path/to/test.spec.ts:15:10)",
                                        "name": "Error"
                                    },
                                    "stdout": [],
                                    "stderr": [
                                        "Error: Element not found: [data-testid='submit-button']"
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}
```

### 2. ステップレベルのエラー

```json
{
    "steps": [
        {
            "title": "ボタンをクリック",
            "category": "test.step",
            "startTime": "2024-01-01T00:00:00.000Z",
            "duration": 1000,
            "error": {
                "message": "Element not found: [data-testid='submit-button']",
                "stack": "Error: Element not found: [data-testid='submit-button']\n    at Object.<anonymous> (/path/to/test.spec.ts:15:10)",
                "name": "Error"
            }
        }
    ]
}
```

### 3. 添付ファイル（スクリーンショット、トレース）

```json
{
    "attachments": [
        {
            "name": "screenshot",
            "contentType": "image/png",
            "path": "test-results/test-failed-1.png"
        },
        {
            "name": "trace",
            "contentType": "application/octet-stream",
            "path": "test-results/trace.zip"
        }
    ]
}
```

### 4. 標準エラー出力

```json
{
    "stderr": [
        "Error: Element not found: [data-testid='submit-button']",
        "    at Object.<anonymous> (/path/to/test.spec.ts:15:10)",
        "    at async Object.<anonymous> (/path/to/test.spec.ts:10:5)"
    ]
}
```

### 5. グローバルエラー

```json
{
    "errors": [
        {
            "message": "Test timeout of 30000ms exceeded",
            "stack": "Error: Test timeout of 30000ms exceeded\n    at Object.<anonymous> (/path/to/test.spec.ts:5:1)",
            "name": "Error"
        }
    ]
}
```

## 実用的な設定例

### 開発環境用の設定

```typescript
// playwright.config.ts
export default defineConfig({
    testDir: './tests',
    reporter: process.env.CI
        ? [
              ['html'],
              ['json', { outputFile: 'test-results/ci-results.json' }],
              ['junit', { outputFile: 'test-results/ci-results.xml' }],
          ]
        : [['html'], ['json', { outputFile: 'test-results/local-results.json' }]],
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
```

### CI/CD 用の設定

```typescript
// playwright.config.ts
export default defineConfig({
    testDir: './tests',
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        [
            'json',
            {
                outputFile: 'test-results/results.json',
                includeAttachments: true,
                includeStdout: true,
                includeStderr: true,
            },
        ],
        ['junit', { outputFile: 'test-results/results.xml' }],
    ],
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
```

## JSON 結果の活用方法

### 1. 結果の分析

```typescript
// analyze-results.ts
import fs from 'fs';

interface TestResult {
    config: any;
    suites: any[];
    errors: any[];
    stats: {
        startTime: string;
        duration: number;
        expected: number;
        unexpected: number;
        flaky: number;
        skipped: number;
    };
}

function analyzeResults(filePath: string): void {
    const results: TestResult = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log('テスト結果サマリー:');
    console.log(`実行時間: ${results.stats.duration}ms`);
    console.log(`成功: ${results.stats.expected}`);
    console.log(`失敗: ${results.stats.unexpected}`);
    console.log(`不安定: ${results.stats.flaky}`);
    console.log(`スキップ: ${results.stats.skipped}`);

    // 失敗したテストの詳細
    if (results.stats.unexpected > 0) {
        console.log('\n失敗したテスト:');
        results.suites.forEach((suite) => {
            suite.specs.forEach((spec) => {
                if (!spec.ok) {
                    console.log(`- ${suite.title} > ${spec.title}`);
                }
            });
        });
    }
}

// 使用例
analyzeResults('test-results/results.json');
```

### 2. エラー詳細の分析

```typescript
// analyze-errors.ts
import fs from 'fs';

function analyzeErrors(filePath: string): void {
    const results = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log('=== エラー詳細分析 ===');

    // グローバルエラー
    if (results.errors && results.errors.length > 0) {
        console.log('\nグローバルエラー:');
        results.errors.forEach((error: any, index: number) => {
            console.log(`${index + 1}. ${error.message}`);
            console.log(`   スタック: ${error.stack}`);
        });
    }

    // テストレベルのエラー
    results.suites.forEach((suite: any) => {
        suite.specs.forEach((spec: any) => {
            spec.tests.forEach((test: any) => {
                test.results.forEach((result: any) => {
                    if (result.status === 'failed' && result.error) {
                        console.log(`\n失敗したテスト: ${suite.title} > ${spec.title}`);
                        console.log(`エラーメッセージ: ${result.error.message}`);
                        console.log(`エラースタック: ${result.error.stack}`);

                        // ステップレベルのエラー
                        if (result.steps) {
                            result.steps.forEach((step: any) => {
                                if (step.error) {
                                    console.log(
                                        `  ステップ "${step.title}" でエラー: ${step.error.message}`
                                    );
                                }
                            });
                        }

                        // 添付ファイル
                        if (result.attachments && result.attachments.length > 0) {
                            console.log('  添付ファイル:');
                            result.attachments.forEach((attachment: any) => {
                                console.log(`    - ${attachment.name}: ${attachment.path}`);
                            });
                        }
                    }
                });
            });
        });
    });
}

// 使用例
analyzeErrors('test-results/results.json');
```

### 2. CI/CD での活用

```yaml
# .github/workflows/test.yml
name: E2E Tests
on: [push, pull_request]

jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: actions/setup-node@v3
              with:
                  node-version: 18

            - name: Install dependencies
              run: npm ci

            - name: Install Playwright
              run: npx playwright install --with-deps

            - name: Run tests
              run: npx playwright test

            - name: Upload test results
              uses: actions/upload-artifact@v3
              if: always()
              with:
                  name: test-results
                  path: |
                      test-results/
                      playwright-report/

            - name: Analyze results
              if: always()
              run: |
                  if [ -f test-results/results.json ]; then
                    node scripts/analyze-results.js
                  fi
```

### 3. カスタムレポーター

```typescript
// custom-reporter.ts
import { Reporter } from '@playwright/test/reporter';

class CustomJsonReporter implements Reporter {
    private results: any[] = [];

    onTestEnd(test: any, result: any) {
        this.results.push({
            title: test.title,
            status: result.status,
            duration: result.duration,
            error: result.error?.message,
            timestamp: new Date().toISOString(),
        });
    }

    async onEnd() {
        const fs = require('fs');
        const output = {
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: {
                total: this.results.length,
                passed: this.results.filter((r) => r.status === 'passed').length,
                failed: this.results.filter((r) => r.status === 'failed').length,
                skipped: this.results.filter((r) => r.status === 'skipped').length,
            },
        };

        fs.writeFileSync('test-results/custom-results.json', JSON.stringify(output, null, 2));
    }
}

export default CustomJsonReporter;
```

## トラブルシューティング

### よくある問題と解決方法

1. **JSON ファイルが生成されない**

    - レポーターの設定を確認
    - 出力ディレクトリが存在することを確認

2. **JSON ファイルが空になる**

    - テストが実行されていることを確認
    - レポーターの設定を確認

3. **大きな JSON ファイル**
    - `includeAttachments: false` を設定
    - 必要な情報のみを出力するようにカスタマイズ

## ベストプラクティス

1. **適切な出力場所の設定**

    - `test-results/` ディレクトリを使用
    - `.gitignore` に追加

2. **CI/CD での活用**

    - アーティファクトとして保存
    - 結果の分析スクリプトを作成

3. **ファイルサイズの管理**

    - 必要な情報のみを出力
    - 定期的に古いファイルを削除

4. **セキュリティ**
    - 機密情報が含まれないよう注意
    - 必要に応じて情報をフィルタリング

## 参考リンク

-   [Playwright Reporter Documentation](https://playwright.dev/docs/test-reporters)
-   [Playwright Configuration](https://playwright.dev/docs/test-configuration)
-   [Playwright GitHub Actions](https://playwright.dev/docs/ci-intro)
