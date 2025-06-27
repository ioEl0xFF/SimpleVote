import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { POLL_MANAGER_ABI, POLL_MANAGER_ADDRESS } from './constants';

const ZERO = '0x0000000000000000000000000000000000000000';

// PollManager を使って新しい DynamicVote を作成するフォーム
function PollCreate({ signer, onCreated, showToast }) {
    const [manager, setManager] = useState(null);
    const [topic, setTopic] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [txPending, setTxPending] = useState(false);

    // signer から PollManager を初期化
    useEffect(() => {
        if (!signer || POLL_MANAGER_ADDRESS === ZERO) return;
        const m = new ethers.Contract(
            POLL_MANAGER_ADDRESS,
            POLL_MANAGER_ABI,
            signer,
        );
        setManager(m);
    }, [signer]);

    // 入力された日時を UNIX タイムに変換
    const toTimestamp = (value) => {
        return Math.floor(new Date(value).getTime() / 1000);
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!manager) return;
        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            const tx = await manager.createDynamicVote(
                topic,
                toTimestamp(start),
                toTimestamp(end),
            );
            await tx.wait();
            showToast('議題を作成しました');
            if (onCreated) onCreated();
        } catch (err) {
            console.error('create poll error', err);
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        } finally {
            setTxPending(false);
        }
    };

    if (POLL_MANAGER_ADDRESS === ZERO) {
        return <p>PollManager がデプロイされていません</p>;
    }

    return (
        <form className="flex flex-col gap-2" onSubmit={submit}>
            <h2 className="text-xl font-bold">新しい議題を作成</h2>
            <label className="flex flex-col gap-1">
                トピック
                <input
                    className="border px-2 py-1"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                />
            </label>
            <label className="flex flex-col gap-1">
                開始日時
                <input
                    type="datetime-local"
                    className="border px-2 py-1"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    required
                />
            </label>
            <label className="flex flex-col gap-1">
                終了日時
                <input
                    type="datetime-local"
                    className="border px-2 py-1"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    required
                />
            </label>
            <button
                className="px-4 py-2 rounded-xl bg-green-600 text-white disabled:opacity-50"
                disabled={txPending}
            >
                作成
            </button>
        </form>
    );
}

export default PollCreate;
