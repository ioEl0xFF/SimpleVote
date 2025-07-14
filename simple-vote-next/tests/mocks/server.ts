// @ts-ignore
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// テスト用MSWサーバーの設定
// @ts-ignore
export const server = setupServer(...handlers);

// テスト実行前後の自動設定を提供する関数
export const getMSWSetup = () => {
  return {
    server,
    listen: () => {
      server.listen({
        onUnhandledRequest: 'warn',
      });
      console.log('[MSW] Server started');
    },
    resetHandlers: () => {
      server.resetHandlers();
    },
    close: () => {
      server.close();
      console.log('[MSW] Server closed');
    }
  };
};