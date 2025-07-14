'use client';

import { useWallet } from './WalletProvider';
import Toast from './Toast';
import { useRef } from 'react';

interface AppProps {
    children: React.ReactNode;
}

export default function App({ children }: AppProps) {
    const { signer, account, toasts, connectWallet, signOut, removeToast } = useWallet();
    const connectButtonRef = useRef<HTMLButtonElement>(null);

    const handleConnectKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            connectWallet();
        }
        // Tabキーの処理を削除 - ブラウザのデフォルト動作に任せる
    };

    const handleSignOutKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            signOut();
        }
    };

    return (
        <main className="flex flex-col items-center gap-6 p-10">
            <h1 className="text-3xl font-bold">SimpleVote</h1>
            {!signer ? (
                <button
                    ref={connectButtonRef}
                    className="px-6 py-2 rounded-xl bg-purple-600 text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-600 hover:bg-purple-700 transition-colors"
                    onClick={connectWallet}
                    onKeyDown={handleConnectKeyDown}
                    aria-label="ウォレットを接続する"
                    type="button"
                >
                    ウォレット接続
                </button>
            ) : (
                <>
                    <div className="flex items-center gap-4">
                        <p
                            className="font-mono"
                            aria-label={`接続中のウォレットアドレス: ${account}`}
                        >
                            {account}
                        </p>
                        <button
                            className="px-4 py-1 rounded-xl bg-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-400 hover:bg-gray-500 transition-colors"
                            onClick={signOut}
                            onKeyDown={handleSignOutKeyDown}
                            aria-label="ウォレットを切断する"
                            type="button"
                        >
                            切断
                        </button>
                    </div>
                    {children}
                </>
            )}
            <div className="toast-container" role="status" aria-live="polite">
                {toasts.map((t) => (
                    <Toast key={t.id} message={t.msg} onClose={() => removeToast(t.id)} />
                ))}
            </div>
        </main>
    );
}
