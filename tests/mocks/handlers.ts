// @ts-ignore
import { http, HttpResponse } from 'msw';

// ABI エンコード用のユーティリティ関数（簡略版）
function encodeGetPollsResponse(polls: any[]) {
  // getPolls()の戻り値: (uint256[] pollIds, PollType[] pollTypes, address[] owners, string[] topics)
  if (polls.length === 0) {
    // 空配列の場合のABIエンコード
    return '0x' +
      '0000000000000000000000000000000000000000000000000000000000000080' + // pollIds配列のオフセット
      '00000000000000000000000000000000000000000000000000000000000000c0' + // pollTypes配列のオフセット
      '0000000000000000000000000000000000000000000000000000000000000100' + // owners配列のオフセット
      '0000000000000000000000000000000000000000000000000000000000000140' + // topics配列のオフセット
      '0000000000000000000000000000000000000000000000000000000000000000' + // pollIds.length = 0
      '0000000000000000000000000000000000000000000000000000000000000000' + // pollTypes.length = 0
      '0000000000000000000000000000000000000000000000000000000000000000' + // owners.length = 0
      '0000000000000000000000000000000000000000000000000000000000000000';  // topics.length = 0
  }

  // 簡略化されたモック投票データの場合のABIエンコード
  const pollCount = polls.length;
  const pollCountHex = pollCount.toString(16).padStart(64, '0');
  
  return '0x' +
    '0000000000000000000000000000000000000000000000000000000000000080' + // pollIds配列のオフセット
    '00000000000000000000000000000000000000000000000000000000000000e0' + // pollTypes配列のオフセット
    '0000000000000000000000000000000000000000000000000000000000000140' + // owners配列のオフセット
    '00000000000000000000000000000000000000000000000000000000000001a0' + // topics配列のオフセット
    // pollIds配列 (length + data)
    pollCountHex + // 配列の長さ
    '0000000000000000000000000000000000000000000000000000000000000001' + // pollId: 1
    '0000000000000000000000000000000000000000000000000000000000000002' + // pollId: 2
    '0000000000000000000000000000000000000000000000000000000000000003' + // pollId: 3
    // pollTypes配列 (length + data)
    pollCountHex + // 配列の長さ
    '0000000000000000000000000000000000000000000000000000000000000000' + // type: DYNAMIC_VOTE (0)
    '0000000000000000000000000000000000000000000000000000000000000001' + // type: WEIGHTED_VOTE (1)
    '0000000000000000000000000000000000000000000000000000000000000002' + // type: SIMPLE_VOTE (2)
    // owners配列 (length + data)
    pollCountHex + // 配列の長さ
    '000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266' + // owner: hardhat default address
    '000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266' + // owner: hardhat default address
    '000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266' + // owner: hardhat default address
    // topics配列 (length + data) - 簡略化
    pollCountHex + // 配列の長さ
    '0000000000000000000000000000000000000000000000000000000000000060' + // 1つ目の文字列のオフセット
    '00000000000000000000000000000000000000000000000000000000000000a0' + // 2つ目の文字列のオフセット
    '00000000000000000000000000000000000000000000000000000000000000e0' + // 3つ目の文字列のオフセット
    // 1つ目の文字列: "Test Poll 1"
    '000000000000000000000000000000000000000000000000000000000000000b' + // 文字列の長さ 
    '54657374506f6c6c31000000000000000000000000000000000000000000000000' + // "TestPoll1"
    // 2つ目の文字列: "Test Poll 2"
    '000000000000000000000000000000000000000000000000000000000000000b' + // 文字列の長さ
    '54657374506f6c6c32000000000000000000000000000000000000000000000000' + // "TestPoll2"
    // 3つ目の文字列: "Test Poll 3"
    '000000000000000000000000000000000000000000000000000000000000000b' + // 文字列の長さ
    '54657374506f6c6c33000000000000000000000000000000000000000000000000'; // "TestPoll3"
}

// Ethereum RPC メソッドハンドラー
function handleEthCall(request: any) {
  const params = request.params;
  
  if (!params || !params[0] || !params[0].data) {
    return HttpResponse.json({ result: '0x' });
  }

  const data = params[0].data;
  
  // getPolls() メソッドシグネチャ（0x5c01f867）を検出
  if (data.startsWith('0x5c01f867')) {
    // モック投票データを返却
    const mockPolls = [
      { id: 1, type: 'dynamic', topic: 'TestPoll1' },
      { id: 2, type: 'weighted', topic: 'TestPoll2' },
      { id: 3, type: 'simple', topic: 'TestPoll3' },
    ];
    
    console.log('[MSW] getPolls() detected, returning mock data');
    return HttpResponse.json({
      result: encodeGetPollsResponse(mockPolls)
    });
  }

  // その他のコントラクト呼び出し
  return HttpResponse.json({ result: '0x' });
}

export const handlers = [
  // Ethereum RPC エンドポイントのモック
  http.post('http://localhost:8545', async ({ request }) => {
    // @ts-ignore
    const body = await request.json() as any;
    const { method, params, id } = body;

    console.log(`[MSW] Ethereum RPC: ${method}`, params);

    switch (method) {
      case 'eth_call':
        return handleEthCall({ params });
        
      case 'eth_blockNumber':
        return HttpResponse.json({ 
          id,
          result: '0x1' 
        });
        
      case 'eth_chainId':
        return HttpResponse.json({ 
          id,
          result: '0x7a69' // Hardhat default chain ID
        });
        
      case 'eth_accounts':
        return HttpResponse.json({ 
          id,
          result: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'] // Hardhat default account
        });
        
      case 'eth_getBalance':
        return HttpResponse.json({ 
          id,
          result: '0x21e19e0c9bab2400000' // 10000 ETH
        });
        
      case 'net_version':
        return HttpResponse.json({ 
          id,
          result: '31337' // Hardhat network ID
        });
        
      case 'eth_requestAccounts':
        return HttpResponse.json({ 
          id,
          result: ['0xf39Fd6e51aad88F6F4ce6aB8827279cfffb92266']
        });

      default:
        console.log(`[MSW] Unhandled method: ${method}`);
        return HttpResponse.json({ 
          id,
          result: null 
        });
    }
  }),
];