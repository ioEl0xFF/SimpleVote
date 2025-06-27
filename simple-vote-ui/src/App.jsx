import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import Toast from './Toast.jsx';
import PollList from './PollList.jsx';
import DynamicVote from './DynamicVote.jsx';
import WeightedVote from './WeightedVote.jsx';

function App() {
    const [signer, setSigner] = useState(null);
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

    // ウォレット接続処理
    const connectWallet = async () => {
        if (!window.ethereum) {
            alert('MetaMask をインストールしてください');
            return;
        }
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send('eth_requestAccounts', []);
            const _signer = await provider.getSigner();
            setSigner(_signer);
            showToast('ウォレット接続完了');
        } catch (err) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        }
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
                    <PollList signer={signer} onSelect={setSelected} />
                    {selected && selected.type === 'dynamic' && (
                        <DynamicVote
                            signer={signer}
                            address={selected.addr}
                            showToast={showToast}
                        />
                    )}
                    {selected && selected.type === 'weighted' && (
                        <WeightedVote
                            signer={signer}
                            address={selected.addr}
                            showToast={showToast}
                        />
                    )}
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
