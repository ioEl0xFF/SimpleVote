/**
 * MSW 統合用テストヘルパー
 * 既存のモック機能と段階的に統合するためのヘルパー関数
 */

import { Page } from '@playwright/test';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

export interface MSWTestConfig {
  useMSW?: boolean;
  polls?: Array<{
    id: number;
    pollType: 0 | 1 | 2; // DYNAMIC_VOTE=0, WEIGHTED_VOTE=1, SIMPLE_VOTE=2
    topic: string;
    owner: string;
  }>;
  rpcEndpoint?: string;
}

/**
 * MSW を使用したテスト環境のセットアップ
 */
export async function setupMSWForTest(page: Page, config: MSWTestConfig = {}) {
  const {
    useMSW = true,
    polls = [
      {
        id: 1,
        pollType: 0,
        topic: 'プロジェクトの方向性について',
        owner: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
      }
    ],
    rpcEndpoint = 'http://localhost:8545'
  } = config;

  if (!useMSW) {
    console.log('[MSW Helper] MSW is disabled, skipping setup');
    return;
  }

  console.log('[MSW Helper] Setting up MSW for test');

  // 動的にハンドラーを追加（デフォルトのものに加えて）
  const customHandler = http.post(rpcEndpoint, async ({ request }) => {
    try {
      const requestBody = await request.json() as any;
      console.log('[MSW Helper] Custom handler - intercepted RPC call:', requestBody.method);

      if (requestBody.method === 'eth_call') {
        const [callData] = requestBody.params;
        
        // getPolls() のメソッドシグネチャを検出
        if (callData.data && callData.data.startsWith('0x120fe89b')) {
          console.log('[MSW Helper] Handling getPolls() call with custom data');
          
          // カスタム投票データでレスポンス生成
          const response = generateGetPollsResponse(polls, requestBody.id);
          return HttpResponse.json(response);
        }
      }

      // その他のメソッドはデフォルトハンドラーに委譲
      return;
    } catch (error) {
      console.error('[MSW Helper] Error in custom handler:', error);
      return HttpResponse.json({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32000, message: 'Internal error' },
      });
    }
  });

  // 一時的にハンドラーを追加
  server.use(customHandler);
  
  // ページにMSWフラグを設定（アプリケーション側で参照可能）
  await page.addInitScript(() => {
    (window as any).__MSW_ENABLED__ = true;
    console.log('[MSW Helper] MSW enabled flag set in browser');
  });

  console.log('[MSW Helper] MSW setup completed');
}

/**
 * getPolls レスポンスの生成（簡略版）
 */
function generateGetPollsResponse(polls: MSWTestConfig['polls'] = [], requestId: number) {
  // 簡略版のABIエンコード（テスト用）
  // 実際のプロダクションではより正確な実装が必要
  
  if (polls.length === 0) {
    // 空の配列を返す
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: '0x0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000080'
    };
  }

  // 簡略版エンコード（最小限のテストデータ）
  let encoded = '';
  
  // 4つの配列のオフセット
  encoded += '0000000000000000000000000000000000000000000000000000000000000080'; // pollIds offset
  encoded += '00000000000000000000000000000000000000000000000000000000000000c0'; // pollTypes offset  
  encoded += '0000000000000000000000000000000000000000000000000000000000000100'; // owners offset
  encoded += '0000000000000000000000000000000000000000000000000000000000000140'; // topics offset
  
  // pollIds 配列
  encoded += polls.length.toString(16).padStart(64, '0');
  polls.forEach(poll => {
    encoded += poll.id.toString(16).padStart(64, '0');
  });
  
  // pollTypes 配列
  encoded += polls.length.toString(16).padStart(64, '0');
  polls.forEach(poll => {
    encoded += poll.pollType.toString(16).padStart(64, '0');
  });
  
  // owners 配列（簡略版）
  encoded += polls.length.toString(16).padStart(64, '0');
  polls.forEach(poll => {
    encoded += poll.owner.slice(2).padStart(64, '0');
  });
  
  // topics 配列（簡略版 - 固定長と仮定）
  encoded += polls.length.toString(16).padStart(64, '0');
  encoded += '0000000000000000000000000000000000000000000000000000000000000020'; // 各文字列のオフセット
  
  // 文字列データ（最初の投票のみ簡略実装）
  if (polls.length > 0) {
    const topicBytes = Buffer.from(polls[0].topic.slice(0, 20), 'utf8'); // 20文字に制限
    encoded += topicBytes.length.toString(16).padStart(64, '0');
    encoded += topicBytes.toString('hex').padEnd(64, '0');
  }

  return {
    jsonrpc: '2.0',
    id: requestId,
    result: '0x' + encoded,
  };
}

/**
 * テスト終了後のクリーンアップ
 */
export function cleanupMSWForTest() {
  server.resetHandlers();
  console.log('[MSW Helper] Test cleanup completed');
}