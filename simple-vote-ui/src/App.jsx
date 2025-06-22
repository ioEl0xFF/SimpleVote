import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
    DYNAMIC_VOTE_ABI,
    DYNAMIC_VOTE_ADDRESS,
    WEIGHTED_VOTE_ABI,
    WEIGHTED_VOTE_ADDRESS,
    WEIGHTED_TOKEN_ADDRESS,
    ERC20_ABI,
} from './constants';

function App() {
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [topic, setTopic] = useState('');
    const [choices, setChoices] = useState([]);
    const [selected, setSelected] = useState(null);
    const [votedId, setVotedId] = useState(0);
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
        const _contract = new ethers.Contract(
            DYNAMIC_VOTE_ADDRESS,
            DYNAMIC_VOTE_ABI,
            _signer
        );
        setSigner(_signer);
        setContract(_contract);
    };

    /** ② 票と選択肢を取得 */
    const fetchData = useCallback(async () => {
        if (!contract) return;
        setTopic(await contract.topic());
        const count = await contract.choiceCount();
        const arr = [];
        for (let i = 1n; i <= count; i++) {
            const name = await contract.choice(i);
            const votes = await contract.voteCount(i);
            arr.push({ id: Number(i), name, votes });
        }
        setChoices(arr);
        if (signer) {
            const addr = await signer.getAddress();
            const id = await contract.votedChoiceId(addr);
            setVotedId(Number(id));

            // 投票状態をコンソールログに出力
            console.log('=== 投票状態 ===');
            console.log('ユーザーアドレス:', addr);
            console.log('投票済み選択肢ID:', Number(id));
            console.log('投票済みかどうか:', Number(id) !== 0);
            if (Number(id) !== 0) {
                const votedChoice = arr.find((c) => c.id === Number(id));
                console.log('投票した選択肢:', votedChoice ? votedChoice.name : '不明');
            }
            console.log('選択肢一覧:', arr);
            console.log('================');
        }
    }, [contract, signer]);

    /** ③ 投票トランザクション */
    const vote = async (choiceId) => {
        if (!contract) return;
        try {
            setTxPending(true);
            const tx = await contract.vote(choiceId);
            await tx.wait();
            await fetchData();
        } finally {
            setTxPending(false);
        }
    };

    const cancelVote = async () => {
        if (!contract) return;
        try {
            setTxPending(true);
            const tx = await contract.cancelVote();
            await tx.wait();
            await fetchData();
        } finally {
            setTxPending(false);
        }
    };

    /** ④ 初期化とイベント購読 */
    useEffect(() => {
        if (!contract) return;
        fetchData();
        contract.on('VoteCast', fetchData);
        contract.on('VoteCancelled', fetchData);
        return () => {
            contract.off('VoteCast', fetchData);
            contract.off('VoteCancelled', fetchData);
        };
    }, [contract, fetchData]);

    return (
        <main className="flex flex-col items-center gap-6 p-10">
            <h1 className="text-3xl font-bold">DynamicVote DApp</h1>

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

                    <form
                        className="flex flex-col gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            vote(selected);
                        }}
                    >
                        {choices.map((c) => (
                            <label key={c.id} className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="choice"
                                    value={c.id}
                                    onChange={() => setSelected(c.id)}
                                    checked={selected === c.id}
                                    disabled={votedId !== 0}
                                />
                                {c.name} ({c.votes.toString()})
                            </label>
                        ))}
                        <button
                            className="px-4 py-2 rounded-xl bg-blue-500 text-white disabled:opacity-50"
                            disabled={txPending || selected === null || votedId !== 0}
                        >
                            投票する
                        </button>
                    </form>

                    {votedId !== 0 && (
                        <button
                            className="px-4 py-2 rounded-xl bg-red-500 text-white disabled:opacity-50"
                            disabled={txPending}
                            onClick={cancelVote}
                        >
                            取消
                        </button>
                    )}

                    {txPending && <p>トランザクション承認待ち…</p>}
                    <WeightedVotePanel signer={signer} />
                </>
            )}
        </main>
    );
}

function WeightedVotePanel({ signer }) {
    const [contract, setContract] = useState(null);
    const [token, setToken] = useState(null);
    const [topic, setTopic] = useState('');
    const [agree, setAgree] = useState(0n);
    const [disagree, setDisagree] = useState(0n);
    const [amount, setAmount] = useState('');
    const [votedId, setVotedId] = useState(0);
    const [allowance, setAllowance] = useState(0n);
    const [txPending, setTxPending] = useState(false);

    const init = useCallback(async () => {
        if (!signer) return;
        const c = new ethers.Contract(
            WEIGHTED_VOTE_ADDRESS,
            WEIGHTED_VOTE_ABI,
            signer,
        );
        const t = new ethers.Contract(
            WEIGHTED_TOKEN_ADDRESS,
            ERC20_ABI,
            signer,
        );
        setContract(c);
        setToken(t);
    }, [signer]);

    const fetchData = useCallback(async () => {
        if (!contract || !token) return;
        setTopic(await contract.topic());
        const [a, d] = await contract.getVotes();
        setAgree(a);
        setDisagree(d);
        const addr = await signer.getAddress();
        setVotedId(Number(await contract.votedChoiceId(addr)));
        setAllowance(await token.allowance(addr, WEIGHTED_VOTE_ADDRESS));
    }, [contract, token, signer]);

    useEffect(() => {
        init();
    }, [init]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const approve = async () => {
        if (!token) return;
        try {
            setTxPending(true);
            const value = BigInt(amount);
            const tx = await token.approve(WEIGHTED_VOTE_ADDRESS, value);
            await tx.wait();
            await fetchData();
        } finally {
            setTxPending(false);
        }
    };

    const vote = async (agreeVote) => {
        if (!contract) return;
        try {
            setTxPending(true);
            const value = BigInt(amount);
            const tx = await contract.vote(agreeVote, value);
            await tx.wait();
            await fetchData();
        } finally {
            setTxPending(false);
        }
    };

    const cancel = async () => {
        if (!contract) return;
        try {
            setTxPending(true);
            const tx = await contract.cancelVote();
            await tx.wait();
            await fetchData();
        } finally {
            setTxPending(false);
        }
    };

    return (
        <section className="flex flex-col gap-4 mt-10 items-center">
            <h2 className="text-2xl font-bold">WeightedVote</h2>
            <p>議題: {topic}</p>
            <p>
                賛成: {agree.toString()} / 反対: {disagree.toString()}
            </p>
            <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    vote(true);
                }}
            >
                <input
                    className="border px-2 py-1"
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
                {allowance < BigInt(amount || 0) && (
                    <button
                        className="px-4 py-2 rounded-xl bg-green-500 text-white disabled:opacity-50"
                        onClick={approve}
                        type="button"
                        disabled={txPending || !amount}
                    >
                        Approve
                    </button>
                )}
                <div className="flex gap-2">
                    <button
                        className="px-4 py-2 rounded-xl bg-blue-500 text-white disabled:opacity-50"
                        disabled={txPending || !amount}
                    >
                        賛成
                    </button>
                    <button
                        type="button"
                        className="px-4 py-2 rounded-xl bg-yellow-500 text-white disabled:opacity-50"
                        disabled={txPending || !amount}
                        onClick={() => vote(false)}
                    >
                        反対
                    </button>
                </div>
            </form>
            {votedId !== 0 && (
                <button
                    className="px-4 py-2 rounded-xl bg-red-500 text-white disabled:opacity-50"
                    onClick={cancel}
                    disabled={txPending}
                >
                    取消
                </button>
            )}
            {txPending && <p>トランザクション承認待ち…</p>}
        </section>
    );
}

export default App;
