'use client';

import { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';
import { ethers } from 'ethers';

// window.ethereumの型定義
declare global {
    interface Window {
        ethereum?: any;
    }
}

interface Toast {
    id: number;
    msg: string;
}

interface WalletContextType {
    signer: ethers.Signer | null;
    account: string;
    toasts: Toast[];
    connectWallet: () => Promise<void>;
    signOut: () => void;
    showToast: (msg: string) => void;
    removeToast: (id: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}

interface WalletProviderProps {
    children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [account, setAccount] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);

    // 初期化時にlocalStorageから状態を復元
    useEffect(() => {
        const savedAccount = localStorage.getItem('wallet_account');
        if (savedAccount) {
            setAccount(savedAccount);
            // ウォレット接続状態を復元
            if (window.ethereum) {
                window.ethereum
                    .request({ method: 'eth_accounts' })
                    .then((accounts: string[]) => {
                        if (accounts.length > 0 && accounts[0] === savedAccount) {
                            // 接続状態を復元
                            const provider = new ethers.BrowserProvider(window.ethereum);
                            provider.getSigner().then(setSigner);
                        }
                    })
                    .catch(console.error);
            }
        }
    }, []);

    // アカウント変更時にlocalStorageに保存
    useEffect(() => {
        if (account) {
            localStorage.setItem('wallet_account', account);
        } else {
            localStorage.removeItem('wallet_account');
        }
    }, [account]);

    // イベントリスナーの設定
    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = (accounts: string[]) => {
                if (accounts.length === 0) {
                    // アカウントが切断された
                    setSigner(null);
                    setAccount('');
                    showToast('ウォレットが切断されました');
                } else if (accounts[0] !== account) {
                    // アカウントが変更された
                    setAccount(accounts[0]);
                    showToast('アカウントが変更されました');
                }
            };

            const handleChainChanged = () => {
                // ネットワークが変更された
                showToast('ネットワークが変更されました');
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, [account]);

    // トースト表示用
    const showToast = useCallback((msg: string) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, msg }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // メタマスクへ接続し署名を行う
    const connectWallet = async () => {
        if (!window.ethereum) {
            showToast('MetaMask をインストールしてください');
            return;
        }
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send('eth_requestAccounts', []);
            const _signer = await provider.getSigner();
            const addr = await _signer.getAddress();
            await _signer.signMessage('SimpleVote login');
            setSigner(_signer);
            setAccount(addr);
            showToast('ウォレットが接続されました');
        } catch (err: any) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        }
    };

    const signOut = () => {
        setSigner(null);
        setAccount('');
        showToast('ウォレットが切断されました');
    };

    const value: WalletContextType = {
        signer,
        account,
        toasts,
        connectWallet,
        signOut,
        showToast,
        removeToast,
    };

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
