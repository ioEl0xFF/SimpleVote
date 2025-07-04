import { Page, expect } from '@playwright/test';

/**
 * ウォレット接続テスト用のヘルパー関数
 */
export class WalletTestUtils {
  /**
   * MetaMaskがインストールされている状態をシミュレート
   */
  static async mockMetaMaskInstalled(page: Page) {
    await page.evaluate(() => {
      window.ethereum = {
        isMetaMask: true,
        request: async (method: string, params: any[]) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'personal_sign') {
            return '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
          }
          throw new Error(`Unknown method: ${method}`);
        }
      };
    });
  }

  /**
   * MetaMaskが未インストールの状態をシミュレート
   */
  static async mockMetaMaskNotInstalled(page: Page) {
    await page.evaluate(() => {
      window.ethereum = undefined;
    });
  }

  /**
   * ウォレット接続を拒否する状態をシミュレート
   */
  static async mockWalletRejection(page: Page, errorMessage: string = 'User rejected the request') {
    await page.evaluate((msg) => {
      window.ethereum = {
        isMetaMask: true,
        request: async () => {
          throw new Error(msg);
        }
      };
    }, errorMessage);
  }

  /**
   * 署名を拒否する状態をシミュレート
   */
  static async mockSignatureRejection(page: Page) {
    await page.evaluate(() => {
      window.ethereum = {
        isMetaMask: true,
        request: async (method: string) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'personal_sign') {
            throw new Error('User rejected signature request');
          }
          throw new Error(`Unknown method: ${method}`);
        }
      };
    });
  }

  /**
   * ネットワークエラーをシミュレート
   */
  static async mockNetworkError(page: Page, errorMessage: string = 'Network error occurred') {
    await page.evaluate((msg) => {
      window.ethereum = {
        isMetaMask: true,
        request: async () => {
          throw new Error(msg);
        }
      };
    }, errorMessage);
  }

  /**
   * ウォレット接続を実行
   */
  static async connectWallet(page: Page) {
    const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
    await connectButton.click();
  }

  /**
   * ウォレット切断を実行
   */
  static async disconnectWallet(page: Page) {
    const disconnectButton = page.getByRole('button', { name: /切断/i });
    await disconnectButton.click();
  }

  /**
   * ウォレットが接続されている状態かチェック
   */
  static async isWalletConnected(page: Page): Promise<boolean> {
    const disconnectButton = page.getByRole('button', { name: /切断/i });
    return await disconnectButton.isVisible();
  }

  /**
   * ウォレットアドレスが表示されているかチェック
   */
  static async isWalletAddressVisible(page: Page): Promise<boolean> {
    const addressElement = page.getByText('0x1234567890123456789012345678901234567890');
    return await addressElement.isVisible();
  }

  /**
   * 成功メッセージが表示されているかチェック
   */
  static async isSuccessMessageVisible(page: Page): Promise<boolean> {
    const successMessage = page.getByText('認証が完了しました');
    return await successMessage.isVisible();
  }

  /**
   * エラーメッセージが表示されているかチェック
   */
  static async isErrorMessageVisible(page: Page, errorText?: string): Promise<boolean> {
    if (errorText) {
      const errorMessage = page.getByText(new RegExp(errorText, 'i'));
      return await errorMessage.isVisible();
    }
    const errorMessage = page.getByText(/エラー:/);
    return await errorMessage.isVisible();
  }

  /**
   * 投票一覧が表示されているかチェック
   */
  static async isPollListVisible(page: Page): Promise<boolean> {
    const pollList = page.getByText('投票一覧');
    return await pollList.isVisible();
  }

  /**
   * 新規作成ボタンが表示されているかチェック
   */
  static async isCreateButtonVisible(page: Page): Promise<boolean> {
    const createButton = page.getByText('新規作成');
    return await createButton.isVisible();
  }

  /**
   * ページタイトルが正しく表示されているかチェック
   */
  static async isPageTitleVisible(page: Page): Promise<boolean> {
    const title = page.getByRole('heading', { name: 'SimpleVote' });
    return await title.isVisible();
  }

  /**
   * ボタンのスタイルが正しく適用されているかチェック
   */
  static async checkConnectButtonStyles(page: Page) {
    const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
    await expect(connectButton).toHaveClass(/bg-purple-600/);
    await expect(connectButton).toHaveClass(/text-white/);
    await expect(connectButton).toHaveClass(/rounded-xl/);
  }

  /**
   * ボタンのスタイルが正しく適用されているかチェック
   */
  static async checkDisconnectButtonStyles(page: Page) {
    const disconnectButton = page.getByRole('button', { name: /切断/i });
    await expect(disconnectButton).toHaveClass(/bg-gray-400/);
    await expect(disconnectButton).toHaveClass(/text-white/);
    await expect(disconnectButton).toHaveClass(/rounded-xl/);
  }

  /**
   * レスポンシブデザインのテスト用ヘルパー
   */
  static async testResponsiveDesign(page: Page, viewport: { width: number; height: number }) {
    await page.setViewportSize(viewport);
    const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
    await expect(connectButton).toBeVisible();
    
    const buttonBox = await connectButton.boundingBox();
    if (viewport.width >= 1920) {
      // デスクトップ
      expect(buttonBox?.width).toBeGreaterThan(100);
    } else {
      // モバイル
      expect(buttonBox?.width).toBeGreaterThan(80);
    }
    expect(buttonBox?.height).toBeGreaterThan(30);
  }

  /**
   * キーボードナビゲーションのテスト用ヘルパー
   */
  static async testKeyboardNavigation(page: Page) {
    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab');
    
    const connectButton = page.getByRole('button', { name: /ウォレット接続/i });
    await expect(connectButton).toBeFocused();
    
    // Enterキーでボタンを押せる
    await page.keyboard.press('Enter');
    
    // ウォレット接続状態をシミュレート
    await this.mockMetaMaskInstalled(page);
    
    // 切断ボタンにフォーカスが移動できる
    await page.keyboard.press('Tab');
    const disconnectButton = page.getByRole('button', { name: /切断/i });
    await expect(disconnectButton).toBeFocused();
    
    // Enterキーで切断できる
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /ウォレット接続/i })).toBeVisible();
  }
} 