'use client';

import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
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
            alert('MetaMask をインストールしてください');
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
            showToast('認証が完了しました');
        } catch (err: any) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        }
    };

    const signOut = () => {
        setSigner(null);
        setAccount('');
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
