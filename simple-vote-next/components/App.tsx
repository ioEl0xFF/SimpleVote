'use client';

import { useWallet } from './WalletProvider';
import Toast from './Toast';

interface AppProps {
    children: React.ReactNode;
}

export default function App({ children }: AppProps) {
    const { signer, account, toasts, connectWallet, signOut, removeToast } = useWallet();

    return (
        <main className="flex flex-col items-center gap-6 p-10">
            <h1 className="text-3xl font-bold">SimpleVote</h1>
            {!signer ? (
                <button
                    className="px-6 py-2 rounded-xl bg-purple-600 text-white"
                    onClick={connectWallet}
                >
                    ウォレット接続
                </button>
            ) : (
                <>
                    <div className="flex items-center gap-4">
                        <p className="font-mono">{account}</p>
                        <button
                            className="px-4 py-1 rounded-xl bg-gray-400 text-white"
                            onClick={signOut}
                        >
                            切断
                        </button>
                    </div>
                    {children}
                </>
            )}
            <div className="toast-container">
                {toasts.map((t) => (
                    <Toast key={t.id} message={t.msg} onClose={() => removeToast(t.id)} />
                ))}
            </div>
        </main>
    );
}
