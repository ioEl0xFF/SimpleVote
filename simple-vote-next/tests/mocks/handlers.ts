// @ts-ignore
import { http, HttpResponse } from 'msw';

// 簡単なモック投票データを返す関数
function getSimpleMockResponse() {
  // 簡単な固定レスポンス（デバッグ用）
  return '0x' +
    '0000000000000000000000000000000000000000000000000000000000000080' +
    '00000000000000000000000000000000000000000000000000000000000000c0' +
    '0000000000000000000000000000000000000000000000000000000000000100' +
    '0000000000000000000000000000000000000000000000000000000000000140' +
    '0000000000000000000000000000000000000000000000000000000000000003' + // pollIds.length = 3
    '0000000000000000000000000000000000000000000000000000000000000001' + // pollId: 1
    '0000000000000000000000000000000000000000000000000000000000000002' + // pollId: 2
    '0000000000000000000000000000000000000000000000000000000000000003' + // pollId: 3
    '0000000000000000000000000000000000000000000000000000000000000003' + // pollTypes.length = 3
    '0000000000000000000000000000000000000000000000000000000000000000' + // type: 0
    '0000000000000000000000000000000000000000000000000000000000000001' + // type: 1
    '0000000000000000000000000000000000000000000000000000000000000002' + // type: 2
    '0000000000000000000000000000000000000000000000000000000000000003' + // owners.length = 3
    '000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266' + // owner: hardhat default
    '000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266' + // owner: hardhat default
    '000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266' + // owner: hardhat default
    '0000000000000000000000000000000000000000000000000000000000000003' + // topics.length = 3
    '0000000000000000000000000000000000000000000000000000000000000060' + // topic 1 offset
    '00000000000000000000000000000000000000000000000000000000000000a0' + // topic 2 offset
    '00000000000000000000000000000000000000000000000000000000000000e0' + // topic 3 offset
    '0000000000000000000000000000000000000000000000000000000000000009' + // topic 1 length
    '546573745f506f6c6c5f3100000000000000000000000000000000000000000000' + // "Test_Poll_1"
    '0000000000000000000000000000000000000000000000000000000000000009' + // topic 2 length
    '546573745f506f6c6c5f3200000000000000000000000000000000000000000000' + // "Test_Poll_2"
    '0000000000000000000000000000000000000000000000000000000000000009' + // topic 3 length
    '546573745f506f6c6c5f3300000000000000000000000000000000000000000000'; // "Test_Poll_3"
}

export const handlers = [
  // Ethereum RPC エンドポイントのモック
  http.post('http://localhost:8545', async ({ request }) => {
    try {
      // @ts-ignore
      const body = await request.json() as any;
      const { method, params, id } = body;

      console.log(`[MSW] Ethereum RPC: ${method}`, params);

      switch (method) {
        case 'eth_call':
          const data = params && params[0] && params[0].data;
          // getPolls() メソッドシグネチャを検出
          if (data && data.startsWith('0x5c01f867')) {
            console.log('[MSW] getPolls() method detected, returning mock data');
            return HttpResponse.json({
              id,
              result: getSimpleMockResponse()
            });
          }
          return HttpResponse.json({ id, result: '0x' });
          
        case 'eth_blockNumber':
          return HttpResponse.json({ id, result: '0x1' });
          
        case 'eth_chainId':
          return HttpResponse.json({ id, result: '0x7a69' });
          
        case 'eth_accounts':
          return HttpResponse.json({ id, result: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'] });
          
        case 'eth_getBalance':
          return HttpResponse.json({ id, result: '0x21e19e0c9bab2400000' });
          
        case 'net_version':
          return HttpResponse.json({ id, result: '31337' });
          
        case 'eth_requestAccounts':
          return HttpResponse.json({ id, result: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'] });

        default:
          console.log(`[MSW] Unhandled method: ${method}`);
          return HttpResponse.json({ id, result: null });
      }
    } catch (error) {
      console.error('[MSW] Error handling request:', error);
      return HttpResponse.json({ id: 1, error: 'Internal error' });
    }
  }),
];