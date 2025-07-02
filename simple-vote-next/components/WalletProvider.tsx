'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { ERROR_MESSAGES } from '../lib/constants';
import { useToast } from './Toast';

// window.ethereumの型定義
declare global {
    interface Window {
        ethereum?: any;
    }
}

interface WalletState {
    isConnected: boolean;
    isConnecting: boolean;
    account: string | null;
    error: string | null;
    showConnectButton: boolean;
}

interface WalletContextType {
    account: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    error: string | null;
    clearError: () => void;
    showConnectButton: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [walletState, setWalletState] = useState<WalletState>({
        isConnected: false,
        isConnecting: false,
        account: null,
        error: null,
        showConnectButton: true,
    });

    // Toast機能を使用
    const { showToast } = useToast();

    const clearError = () => {
        setWalletState((prev) => ({
            ...prev,
            error: null,
        }));
    };

    const resetErrorState = () => {
        setWalletState((prev) => ({
            ...prev,
            error: null,
            isConnecting: false,
            showConnectButton: true,
        }));
    };

    const showErrorToast = (message: string) => {
        // Toast表示の確実な実行
        if (typeof window !== 'undefined') {
            // ブラウザ環境でのみ実行
            console.error('Wallet Error:', message);

            // 遅延処理でToast表示を確実にする
            setTimeout(() => {
                showToast(message, 'error');
            }, 100);
        }
    };

    const connect = async () => {
        try {
            clearError();

            setWalletState((prev) => ({
                ...prev,
                isConnecting: true,
                showConnectButton: false,
            }));

            // MetaMaskがインストールされているかチェック
            if (!window.ethereum) {
                throw new Error(ERROR_MESSAGES.METAMASK_NOT_INSTALLED);
            }

            // アカウントを要求
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts',
            });

            if (accounts.length === 0) {
                throw new Error(ERROR_MESSAGES.CONNECTION_REJECTED);
            }

            // ネットワークチェック
            const chainId = await window.ethereum.request({
                method: 'eth_chainId',
            });

            // サポートされているネットワークかチェック
            const supportedNetworks = ['0x1', '0x5', '0xaa36a7']; // Mainnet, Goerli, Sepolia
            if (!supportedNetworks.includes(chainId)) {
                throw new Error(ERROR_MESSAGES.UNSUPPORTED_NETWORK);
            }

            // 接続成功時の状態更新
            setWalletState((prev) => ({
                ...prev,
                isConnected: true,
                isConnecting: false,
                account: accounts[0],
                error: null,
                showConnectButton: false,
            }));
        } catch (err: any) {
            console.error('Wallet connection error:', err);

            // エラーメッセージの分類をより詳細に
            let errorMessage: string = ERROR_MESSAGES.UNEXPECTED_ERROR;

            if (err.message.includes('ネットワークエラーが発生しました')) {
                errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
            } else if (err.message.includes('MetaMaskがインストールされていません')) {
                errorMessage = ERROR_MESSAGES.METAMASK_NOT_INSTALLED;
            } else if (
                err.message.includes('User rejected') ||
                err.message.includes('ウォレット接続が拒否されました')
            ) {
                errorMessage = ERROR_MESSAGES.CONNECTION_REJECTED;
            } else if (
                err.message.includes('Network error') ||
                err.message.includes('Failed to fetch')
            ) {
                errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
            } else if (
                err.message.includes('timeout') ||
                err.message.includes('Request timeout') ||
                err.message.includes('接続がタイムアウトしました')
            ) {
                errorMessage = ERROR_MESSAGES.TIMEOUT_ERROR;
            } else if (
                err.message.includes('サポートされていないネットワーク') ||
                err.message.includes('unsupported network')
            ) {
                errorMessage = ERROR_MESSAGES.UNSUPPORTED_NETWORK;
            }

            setWalletState((prev) => ({
                ...prev,
                isConnecting: false,
                error: errorMessage,
                showConnectButton: true,
                account: null,
            }));

            showErrorToast(errorMessage);
        }
    };

    const disconnect = () => {
        setWalletState((prev) => ({
            ...prev,
            account: null,
            isConnected: false,
            error: null,
            showConnectButton: true,
        }));
    };

    // アカウント変更の監視
    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = (accounts: string[]) => {
                if (accounts.length === 0) {
                    disconnect();
                } else {
                    setWalletState((prev) => ({
                        ...prev,
                        account: accounts[0],
                    }));
                }
            };

            const handleChainChanged = () => {
                // チェーン変更時はページをリロード
                window.location.reload();
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, []);

    return (
        <WalletContext.Provider
            value={{
                account: walletState.account,
                isConnected: walletState.isConnected,
                isConnecting: walletState.isConnecting,
                connect,
                disconnect,
                error: walletState.error,
                clearError,
                showConnectButton: walletState.showConnectButton,
            }}
        >
            {children}
            {walletState.showConnectButton && (
                <button
                    data-testid="wallet-connect-button"
                    onClick={connect}
                    disabled={walletState.isConnecting}
                    className="wallet-connect-button"
                >
                    {walletState.isConnecting ? '接続中...' : 'ウォレット接続'}
                </button>
            )}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}
