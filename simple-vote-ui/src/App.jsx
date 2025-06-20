import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { SIMPLE_VOTE_ABI, SIMPLE_VOTE_ADDRESS } from './constants';

function App() {
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [topic, setTopic] = useState('');
    const [votesA, setVotesA] = useState(0n);
    const [votesB, setVotesB] = useState(0n);
    const [txPending, setTxPending] = useState(false);

    /** ① MetaMask へ接続 */
    const connectWallet = async () => {
        if (!window.ethereum) {
            alert('MetaMask をインストールしてください');
            return;
        }
        const _provider = new ethers.BrowserProvider(window.ethereum);
        await _provider.send('eth_requestAccounts', []);
        const _signer = await _provider.getSigner();
        const _contract = new ethers.Contract(SIMPLE_VOTE_ADDRESS, SIMPLE_VOTE_ABI, _signer);
        setProvider(_provider);
        setSigner(_signer);
        setContract(_contract);
    };

    /** ② 票を読み込む */
    const fetchVotes = useCallback(async () => {
        if (!contract) return;
        const [a, b] = await contract.getVotes();
        setVotesA(a);
        setVotesB(b);
        setTopic(await contract.topic());
    }, [contract]);

    /** ③ 投票トランザクション */
    const vote = async (forA) => {
        if (!contract) return;
        try {
            setTxPending(true);
            const tx = await contract.vote(forA); // A: true / B: false
            await tx.wait();
            await fetchVotes();
        } finally {
            setTxPending(false);
        }
    };

    /** ④ 初期化 & 5 秒ポーリング */
    useEffect(() => {
        if (contract) {
            fetchVotes();
            const id = setInterval(fetchVotes, 5000);
            return () => clearInterval(id);
        }
    }, [contract, fetchVotes]);

    return (
        <main className="flex flex-col items-center gap-6 p-10">
            <h1 className="text-3xl font-bold">SimpleVote DApp</h1>

            {!signer ? (
                <button
                    className="px-6 py-2 rounded-xl bg-purple-600 text-white"
                    onClick={connectWallet}
                >
                    ウォレット接続
                </button>
            ) : (
                <>
                    <p className="text-lg">議題: {topic}</p>

                    <div className="flex gap-4">
                        <button
                            className="px-4 py-2 rounded-xl bg-green-500 text-white disabled:opacity-50"
                            disabled={txPending}
                            onClick={() => vote(true)}
                        >
                            🐱 Cats ({votesA.toString()})
                        </button>
                        <button
                            className="px-4 py-2 rounded-xl bg-blue-500 text-white disabled:opacity-50"
                            disabled={txPending}
                            onClick={() => vote(false)}
                        >
                            🐶 Dogs ({votesB.toString()})
                        </button>
                    </div>

                    {txPending && <p>トランザクション承認待ち…</p>}
                </>
            )}
        </main>
    );
}

export default App;
