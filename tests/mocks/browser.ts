// @ts-ignore
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// ブラウザ用MSWワーカーの設定
// @ts-ignore
export const worker = setupWorker(...handlers);

// ブラウザ環境でのMSW開始関数
export const startMSWForBrowser = async () => {
  if (typeof window !== 'undefined') {
    await worker.start({
      onUnhandledRequest: 'warn',
    });
    console.log('[MSW] Service Worker started for browser');
  }
};

// ブラウザ環境でのMSW停止関数
export const stopMSWForBrowser = async () => {
  if (typeof window !== 'undefined') {
    await worker.stop();
    console.log('[MSW] Service Worker stopped for browser');
  }
};