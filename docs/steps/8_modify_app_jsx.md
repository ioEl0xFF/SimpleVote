# Step 8: simple-vote-ui/src/App.jsx の変更

このステップでは、`simple-vote-ui/src/App.jsx` ファイルを変更し、`PollRegistry` の導入に伴う変更を反映させます。具体的には、選択された投票の `address` の代わりに `pollId` を使用するように変更し、各投票タイプへの遷移ロジックを調整します。

## 8.1. 変更内容

`simple-vote-ui/src/App.jsx` を開き、以下の変更を行います。

1.  `DynamicVote` と `WeightedVote` コンポーネントへの `address` プロップの代わりに `pollId` プロップを渡すように変更します。
2.  `selected` ステートの構造が `PollList.jsx` から返される新しい構造（`id`, `type`, `topic` などを含むオブジェクト）に対応するようにします。

```javascript
// simple-vote-ui/src/App.jsx

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import Toast from './Toast.jsx';
import PollListPage from './PollListPage.jsx';
import PollCreate from './PollCreate.jsx';
import DynamicVote from './DynamicVote.jsx';
import WeightedVote from './WeightedVote.jsx';
import SimpleVote from './SimpleVote.jsx'; // SimpleVote コンポーネントをインポート

function App() {
    const [signer, setSigner] = useState(null);
    const [account, setAccount] = useState('');
    const [page, setPage] = useState('list');
    const [selected, setSelected] = useState(null); // selected は { id, type, topic, ... } のオブジェクトになる
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
                    onBack={() => setPage('list')}
                />
            );
        }
        // selected.type に応じて適切なコンポーネントをレンダリング
        if (selected) {
            if (selected.type === 'dynamic') {
                return (
                    <DynamicVote
                        signer={signer}
                        pollId={selected.id} // address の代わりに pollId を渡す
                        showToast={showToast}
                        onBack={() => setPage('list')}
                    />
                );
            } else if (selected.type === 'weighted') {
                return (
                    <WeightedVote
                        signer={signer}
                        pollId={selected.id} // address の代わりに pollId を渡す
                        showToast={showToast}
                        onBack={() => setPage('list')}
                    />
                );
            } else if (selected.type === 'simple') { // SimpleVote の追加
                return (
                    <SimpleVote
                        signer={signer}
                        pollId={selected.id}
                        showToast={showToast}
                        onBack={() => setPage('list')}
                    />
                );
            }
        }
        return (
            <PollListPage
                signer={signer}
                onSelect={(p) => {
                    setSelected(p);
                    setPage(p.type); // p.type は 'dynamic', 'weighted', 'simple' のいずれか
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
```