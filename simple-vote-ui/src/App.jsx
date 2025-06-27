import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import Toast from './Toast.jsx';
import PollListPage from './PollListPage.jsx';
import PollCreate from './PollCreate.jsx';
import DynamicVote from './DynamicVote.jsx';
import WeightedVote from './WeightedVote.jsx';

function App() {
    const [signer, setSigner] = useState(null);
    const [account, setAccount] = useState('');
    const [page, setPage] = useState('list');
    const [selected, setSelected] = useState(null);
    const [toasts, setToasts] = useState([]);

    // トースト表示用
    const showToast = useCallback((msg) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, msg }]);
    }, []);

    const removeToast = useCallback((id) => {
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
        } catch (err) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        }
    };

    const signOut = () => {
        setSigner(null);
        setAccount('');
        setSelected(null);
        setPage('list');
    };

    const renderContent = () => {
        if (page === 'create') {
            return (
                <PollCreate
                    signer={signer}
                    onCreated={() => setPage('list')}
                    showToast={showToast}
                />
            );
        }
        if (page === 'dynamic' && selected) {
            return (
                <DynamicVote
                    signer={signer}
                    address={selected.addr}
                    showToast={showToast}
                />
            );
        }
        if (page === 'weighted' && selected) {
            return (
                <WeightedVote
                    signer={signer}
                    address={selected.addr}
                    showToast={showToast}
                />
            );
        }
        return (
            <PollListPage
                signer={signer}
                onSelect={(p) => {
                    setSelected(p);
                    setPage(p.type);
                }}
                onCreate={() => setPage('create')}
            />
        );
    };

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
                    {renderContent()}
                </>
            )}
            <div className="toast-container">
                {toasts.map((t) => (
                    <Toast
                        key={t.id}
                        message={t.msg}
                        onClose={() => removeToast(t.id)}
                    />
                ))}
            </div>
        </main>
    );
}

export default App;
