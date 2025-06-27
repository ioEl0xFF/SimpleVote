import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
    WEIGHTED_VOTE_ABI,
    ERC20_ABI,
} from './constants';

// WeightedVote コントラクト用の汎用コンポーネント

// 指定アドレスの WeightedVote を操作
function WeightedVote({ signer, address, showToast, onBack }) {
    const [contract, setContract] = useState(null);
    const [token, setToken] = useState(null);
    const [topic, setTopic] = useState('');
    const [choices, setChoices] = useState([]);
    const [selected, setSelected] = useState(null);
    const [amount, setAmount] = useState('');
    const [votedId, setVotedId] = useState(0);
    const [txPending, setTxPending] = useState(false);
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);

    // signer が変わったらコントラクトを初期化
    useEffect(() => {
        if (!signer || !address || address === '0x0000000000000000000000000000000000000000') return;
        const vote = new ethers.Contract(address, WEIGHTED_VOTE_ABI, signer);
        setContract(vote);
        (async () => {
            const tokenAddr = await vote.token();
            const tok = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
            setToken(tok);
        })();
    }, [signer, address]);

    // 投票状況を取得
    const fetchData = useCallback(async () => {
        if (!contract) return;
        setTopic(await contract.topic());
        const s = Number(await contract.startTime());
        const e = Number(await contract.endTime());
        setStart(s);
        setEnd(e);
        const count = await contract.choiceCount();

        // 各選択肢の取得を並列で実行し、読み込み時間を短縮
        const promises = [];
        for (let i = 1n; i <= count; i++) {
            promises.push(
                Promise.all([contract.choice(i), contract.voteCount(i)]).then(
                    ([name, votes]) => ({
                        id: Number(i),
                        name,
                        votes: ethers.formatEther(votes), // 18 桁精度を Ether 表記に変換
                    }),
                ),
            );
        }
        const arr = await Promise.all(promises);
        setChoices(arr);

        if (signer) {
            const addr = await signer.getAddress();
            const id = await contract.votedChoiceId(addr);
            setVotedId(Number(id));
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
            const tx = await token.approve(address, value);
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
    if (!address || address === '0x0000000000000000000000000000000000000000') {
        return (
            <section className="flex flex-col items-center gap-4 mt-10">
                <h2 className="text-2xl font-bold">WeightedVote DApp</h2>
                <p>コントラクトがデプロイされていません</p>
            </section>
        );
    }

    // 現在が投票期間内かどうか
    const now = Math.floor(Date.now() / 1000);
    const inPeriod = start !== 0 && now >= start && now <= end;

    return (
        <section className="flex flex-col items-center gap-4 mt-10">
            <h2 className="text-2xl font-bold">WeightedVote DApp</h2>
            <p className="text-lg">議題: {topic}</p>
            <p>開始: {start ? new Date(start * 1000).toLocaleString() : '-'}</p>
            <p>終了: {end ? new Date(end * 1000).toLocaleString() : '-'}</p>
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
                        votedId !== 0 ||
                        !inPeriod
                    }
                >
                    投票する
                </button>
            </form>
            {votedId !== 0 && (
                <button
                    className="px-4 py-2 rounded-xl bg-red-500 text-white disabled:opacity-50"
                    disabled={txPending || !inPeriod}
                    onClick={cancelVote}
                >
                    取消
                </button>
            )}
            {!inPeriod && <p className="text-red-600">投票期間外です</p>}
            {onBack && (
                <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-gray-400 text-white"
                    onClick={onBack}
                >
                    戻る
                </button>
            )}
        </section>
    );
}

export default WeightedVote;
