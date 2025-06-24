import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
    WEIGHTED_VOTE_ABI,
    WEIGHTED_VOTE_ADDRESS,
    ERC20_ABI,
} from './constants';

function WeightedVote({ signer, showToast }) {
    const [contract, setContract] = useState(null);
    const [token, setToken] = useState(null);
    const [topic, setTopic] = useState('');
    const [choices, setChoices] = useState([]);
    const [selected, setSelected] = useState(null);
    const [amount, setAmount] = useState('');
    const [votedId, setVotedId] = useState(0);
    const [txPending, setTxPending] = useState(false);

    // signer が変わったらコントラクトを初期化
    useEffect(() => {
        if (!signer) return;
        // アドレスが 0 の場合はコントラクトが未配置とみなす
        if (WEIGHTED_VOTE_ADDRESS === '0x0000000000000000000000000000000000000000') {
            console.warn('WeightedVote コントラクトアドレスが未設定です');
            return;
        }
        const vote = new ethers.Contract(
            WEIGHTED_VOTE_ADDRESS,
            WEIGHTED_VOTE_ABI,
            signer
        );
        setContract(vote);
        (async () => {
            const tokenAddr = await vote.token();
            const tok = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
            setToken(tok);
        })();
    }, [signer]);

    // 投票状況を取得
    const fetchData = useCallback(async () => {
        if (!contract) return;
        setTopic(await contract.topic());
        const count = await contract.choiceCount();
        const arr = [];
        for (let i = 1n; i <= count; i++) {
            const name = await contract.choice(i);
            const votes = await contract.voteCount(i);
            // トークンの票数は 18 桁の精度を持つので、Ether 表記へ変換
            const formatted = ethers.formatEther(votes);
            arr.push({ id: Number(i), name, votes: formatted });
        }
        setChoices(arr);
        if (signer) {
            const addr = await signer.getAddress();
            const id = await contract.votedChoiceId(addr);
            setVotedId(Number(id));

            // 取得した投票情報をコンソールに表示
            console.log('=== WeightedVote 投票状態 ===');
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

    // 初期化とイベント購読
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

    // トークンの承認
    const approve = async () => {
        if (!token || !amount) return;
        const value = ethers.parseEther(amount);
        showToast('トランザクション承認待ち…');
        try {
            const tx = await token.approve(WEIGHTED_VOTE_ADDRESS, value);
            await tx.wait();
            showToast('承認が完了しました');
        } catch (err) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        }
    };

    // 投票処理
    const vote = async () => {
        if (!contract || selected === null || !amount) return;
        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            const value = ethers.parseEther(amount);
            const tx = await contract.vote(selected, value);
            await tx.wait();
            await fetchData();
            showToast('投票が完了しました');
        } catch (err) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        } finally {
            setTxPending(false);
        }
    };

    // 投票取消
    const cancelVote = async () => {
        if (!contract) return;
        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            const tx = await contract.cancelVote();
            await tx.wait();
            await fetchData();
            showToast('投票を取り消しました');
        } catch (err) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        } finally {
            setTxPending(false);
        }
    };

    // コントラクトが未設定なら簡易メッセージを表示
    if (WEIGHTED_VOTE_ADDRESS === '0x0000000000000000000000000000000000000000') {
        return (
            <section className="flex flex-col items-center gap-4 mt-10">
                <h2 className="text-2xl font-bold">WeightedVote DApp</h2>
                <p>コントラクトがデプロイされていません</p>
            </section>
        );
    }

    return (
        <section className="flex flex-col items-center gap-4 mt-10">
            <h2 className="text-2xl font-bold">WeightedVote DApp</h2>
            <p className="text-lg">議題: {topic}</p>
            <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    vote();
                }}
            >
                {choices.map((c) => (
                    <label key={c.id} className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="weightedChoice"
                            value={c.id}
                            onChange={() => setSelected(c.id)}
                            checked={selected === c.id}
                            disabled={votedId !== 0}
                        />
                        {c.name} ({c.votes})
                    </label>
                ))}
                <input
                    type="number"
                    min="0"
                    placeholder="トークン量"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border px-2 py-1 rounded"
                    disabled={votedId !== 0}
                />
                <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-green-500 text-white disabled:opacity-50"
                    onClick={approve}
                    disabled={!amount || selected === null || votedId !== 0}
                >
                    Approve
                </button>
                <button
                    className="px-4 py-2 rounded-xl bg-blue-500 text-white disabled:opacity-50"
                    disabled={
                        txPending ||
                        selected === null ||
                        !amount ||
                        votedId !== 0
                    }
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
        </section>
    );
}

export default WeightedVote;
