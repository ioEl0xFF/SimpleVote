import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { DYNAMIC_VOTE_ABI } from './constants';

const ZERO = '0x0000000000000000000000000000000000000000';

// DynamicVote コントラクトを操作する汎用コンポーネント
function DynamicVote({ signer, address, showToast }) {
    const [contract, setContract] = useState(null);
    const [topic, setTopic] = useState('');
    const [choices, setChoices] = useState([]);
    const [selected, setSelected] = useState(null);
    const [votedId, setVotedId] = useState(0);
    const [txPending, setTxPending] = useState(false);
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);

    useEffect(() => {
        if (!signer || !address || address === ZERO) return;
        const c = new ethers.Contract(address, DYNAMIC_VOTE_ABI, signer);
        setContract(c);
    }, [signer, address]);

    const fetchData = useCallback(async () => {
        if (!contract) return;
        setTopic(await contract.topic());
        setStart(Number(await contract.startTime()));
        setEnd(Number(await contract.endTime()));
        const count = await contract.choiceCount();
        const arr = [];
        for (let i = 1n; i <= count; i++) {
            const name = await contract.choice(i);
            const votes = await contract.voteCount(i);
            arr.push({ id: Number(i), name, votes: votes.toString() });
        }
        setChoices(arr);
        if (signer) {
            const addr = await signer.getAddress();
            const id = await contract.votedChoiceId(addr);
            setVotedId(Number(id));
        }
    }, [contract, signer]);

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

    const vote = async () => {
        if (!contract || selected === null) return;
        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            const tx = await contract.vote(selected);
            await tx.wait();
            await fetchData();
            showToast('投票が完了しました');
        } catch (err) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        } finally {
            setTxPending(false);
        }
    };

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

    if (!address || address === ZERO) {
        return (
            <section className="flex flex-col items-center gap-4 mt-10">
                <p>DynamicVote コントラクトアドレスが未設定です</p>
            </section>
        );
    }

    return (
        <section className="flex flex-col items-center gap-4 mt-10">
            <h2 className="text-2xl font-bold">DynamicVote</h2>
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
                            name="choice"
                            value={c.id}
                            onChange={() => setSelected(c.id)}
                            checked={selected === c.id}
                            disabled={votedId !== 0}
                        />
                        {c.name} ({c.votes})
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
        </section>
    );
}

export default DynamicVote;
