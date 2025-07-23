import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// テスト用のMSWサーバーをセットアップ
export const server = setupServer(...handlers);

// サーバーの設定をより詳細にログ出力
server.events.on('request:start', ({ request }) => {
  console.log('[MSW Server] Handling request:', request.method, request.url);
});

server.events.on('request:match', ({ request }) => {
  console.log('[MSW Server] Request matched:', request.method, request.url);
});

server.events.on('request:unhandled', ({ request }) => {
  console.log('[MSW Server] Unhandled request:', request.method, request.url);
});

// デフォルトでエラーレスポンスを詳細化
export const setupMSWForTesting = () => {
  // サーバー開始
  server.listen({
    onUnhandledRequest: 'warn', // 未処理のリクエストを警告
  });
  
  console.log('[MSW Server] Test server started');
  
  return {
    // テスト後のクリーンアップ
    resetHandlers: () => server.resetHandlers(),
    restoreHandlers: () => server.restoreHandlers(),
    close: () => {
      server.close();
      console.log('[MSW Server] Test server closed');
    },
  };
};