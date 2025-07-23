import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// ブラウザ用のMSWワーカーをセットアップ
export const worker = setupWorker(...handlers);

// 開発環境でのMSW起動設定
export const startMSWForDevelopment = async () => {
  if (typeof window !== 'undefined') {
    try {
      await worker.start({
        onUnhandledRequest: 'warn',
        serviceWorker: {
          url: '/mockServiceWorker.js', // MSW初期化で生成されたファイル
        },
      });
      
      console.log('[MSW Browser] Worker started for development');
      
      // デバッグ用のイベントリスナー
      worker.events.on('request:start', ({ request }) => {
        console.log('[MSW Browser] Handling request:', request.method, request.url);
      });
      
      worker.events.on('request:match', ({ request }) => {
        console.log('[MSW Browser] Request matched:', request.method, request.url);
      });
      
      worker.events.on('request:unhandled', ({ request }) => {
        console.log('[MSW Browser] Unhandled request:', request.method, request.url);
      });
      
      return worker;
    } catch (error) {
      console.error('[MSW Browser] Failed to start worker:', error);
      throw error;
    }
  } else {
    console.warn('[MSW Browser] Cannot start worker in non-browser environment');
    return null;
  }
};

// ブラウザワーカーの停止
export const stopMSW = () => {
  if (typeof window !== 'undefined') {
    worker.stop();
    console.log('[MSW Browser] Worker stopped');
  }
};