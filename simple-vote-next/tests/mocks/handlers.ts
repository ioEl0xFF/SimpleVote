import { http, HttpResponse } from 'msw';

// Ethereum RPC メソッドの型定義
interface EthereumRPCRequest {
  jsonrpc: string;
  method: string;
  params: any[];
  id: number;
}

// 投票データのモック（実際のコントラクト構造に基づく）
const mockPolls = [
  { 
    id: 1, 
    pollType: 0, // DYNAMIC_VOTE
    topic: 'プロジェクトの方向性について', 
    owner: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' // Hardhat default account
  },
  { 
    id: 2, 
    pollType: 1, // WEIGHTED_VOTE
    topic: '技術スタックの選択', 
    owner: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8' // Second Hardhat account
  },
  { 
    id: 3, 
    pollType: 2, // SIMPLE_VOTE
    topic: 'チームリーダーの選出', 
    owner: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc' // Third Hardhat account
  },
];

// ABI エンコード形式での投票データ返却（正確な実装）
function encodeGetPollsResponse(polls: typeof mockPolls): string {
  // getPolls() 返り値: (uint256[], PollType[], address[], string[])
  
  const pollIds = polls.map(p => p.id);
  const pollTypes = polls.map(p => p.pollType);
  const owners = polls.map(p => p.owner);
  const topics = polls.map(p => p.topic);
  
  // ABI エンコード: 4つの動的配列のオフセット（0x80, 0x100, 0x180, 0x200...）
  let encoded = '';
  
  // 各配列のオフセット (4 * 0x20 bytes)
  encoded += '0000000000000000000000000000000000000000000000000000000000000080'; // pollIds offset
  encoded += '00000000000000000000000000000000000000000000000000000000000000e0'; // pollTypes offset  
  encoded += '0000000000000000000000000000000000000000000000000000000000000140'; // owners offset
  encoded += '00000000000000000000000000000000000000000000000000000000000001a0'; // topics offset
  
  // pollIds 配列 (uint256[])
  encoded += polls.length.toString(16).padStart(64, '0'); // 配列長
  polls.forEach(poll => {
    encoded += poll.id.toString(16).padStart(64, '0');
  });
  
  // pollTypes 配列 (enum → uint8)
  encoded += polls.length.toString(16).padStart(64, '0'); // 配列長
  polls.forEach(poll => {
    encoded += poll.pollType.toString(16).padStart(64, '0');
  });
  
  // owners 配列 (address[])
  encoded += polls.length.toString(16).padStart(64, '0'); // 配列長
  polls.forEach(poll => {
    encoded += poll.owner.slice(2).padStart(64, '0'); // Remove 0x prefix
  });
  
  // topics 配列 (string[]) - 簡略化版
  encoded += polls.length.toString(16).padStart(64, '0'); // 配列長
  let stringOffset = 0x20 * polls.length; // 各文字列のオフセット
  
  // 各文字列のオフセット値
  polls.forEach(() => {
    encoded += stringOffset.toString(16).padStart(64, '0');
    stringOffset += 0x40; // 各文字列は64バイトと仮定
  });
  
  // 各文字列の内容（簡略化）
  polls.forEach(poll => {
    const topicBytes = Buffer.from(poll.topic, 'utf8');
    encoded += topicBytes.length.toString(16).padStart(64, '0'); // 文字列長
    encoded += topicBytes.toString('hex').padEnd(64, '0'); // 文字列データ
  });
  
  return '0x' + encoded;
}

// eth_call のハンドラー（MSW v2 対応）
async function handleEthCall(request: EthereumRPCRequest) {
  const [callData] = request.params;
  
  // getPolls() のメソッドシグネチャを検出 (0x120fe89b は getPolls のシグネチャ)
  if (callData.data && callData.data.startsWith('0x120fe89b')) {
    console.log('[MSW] Handling getPolls() call');
    return HttpResponse.json({
      jsonrpc: '2.0',
      id: request.id,
      result: encodeGetPollsResponse(mockPolls),
    });
  }

  // デフォルトレスポンス
  console.log('[MSW] Handling unknown eth_call:', callData);
  return HttpResponse.json({
    jsonrpc: '2.0',
    id: request.id,
    result: '0x',
  });
}

// MSW ハンドラーの定義（MSW v2 対応）
export const handlers = [
  // Ethereum RPC エンドポイントのモック
  http.post('http://localhost:8545', async ({ request }) => {
    try {
      const requestBody = await request.json() as EthereumRPCRequest;
      console.log('[MSW] Intercepted RPC call:', requestBody.method);

      switch (requestBody.method) {
        case 'eth_call':
          return await handleEthCall(requestBody);
          
        case 'eth_blockNumber':
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: requestBody.id,
            result: '0x1',
          });
          
        case 'eth_chainId':
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: requestBody.id,
            result: '0x7a69', // 31337 (Hardhat default)
          });
          
        case 'eth_accounts':
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: requestBody.id,
            result: ['0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'], // Hardhat default account
          });
          
        case 'eth_getBalance':
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: requestBody.id,
            result: '0x56bc75e2d630eb20', // 約 100 ETH
          });
          
        default:
          console.log('[MSW] Unhandled RPC method:', requestBody.method);
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: requestBody.id,
            error: { code: -32601, message: 'Method not found' },
          });
      }
    } catch (error) {
      console.error('[MSW] Error handling request:', error);
      return HttpResponse.json({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32000, message: 'Internal error' },
      });
    }
  }),

  // HTTPS エンドポイント（開発環境用）
  http.post('https://localhost:8545', async ({ request }) => {
    try {
      const requestBody = await request.json() as EthereumRPCRequest;
      console.log('[MSW] Intercepted HTTPS RPC call:', requestBody.method);

      switch (requestBody.method) {
        case 'eth_call':
          return await handleEthCall(requestBody);
          
        case 'eth_blockNumber':
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: requestBody.id,
            result: '0x1',
          });
          
        case 'eth_chainId':
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: requestBody.id,
            result: '0x7a69', // 31337 (Hardhat default)
          });
          
        case 'eth_accounts':
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: requestBody.id,
            result: ['0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'], // Hardhat default account
          });
          
        case 'eth_getBalance':
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: requestBody.id,
            result: '0x56bc75e2d630eb20', // 約 100 ETH
          });
          
        default:
          console.log('[MSW] Unhandled HTTPS RPC method:', requestBody.method);
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: requestBody.id,
            error: { code: -32601, message: 'Method not found' },
          });
      }
    } catch (error) {
      console.error('[MSW] Error handling HTTPS request:', error);
      return HttpResponse.json({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32000, message: 'Internal error' },
      });
    }
  }),
];