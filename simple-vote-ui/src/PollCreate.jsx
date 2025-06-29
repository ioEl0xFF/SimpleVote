import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
    POLL_MANAGER_ABI,
    POLL_MANAGER_ADDRESS,
    DYNAMIC_VOTE_ABI,
    WEIGHTED_VOTE_ABI,
    MOCK_ERC20_ADDRESS,
} from './constants';

const ZERO = '0x0000000000000000000000000000000000000000';

// PollManager を使って DynamicVote か WeightedVote を作成するフォーム
function PollCreate({ signer, onCreated, showToast, onBack }) {
    const [manager, setManager] = useState(null);
    const [pollType, setPollType] = useState('dynamic');
    const [topic, setTopic] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [token, setToken] = useState(MOCK_ERC20_ADDRESS);
    const [choices, setChoices] = useState(['', '']);
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

    // 指定したインデックスの選択肢を更新
    const updateChoice = (idx, value) => {
        setChoices((prev) => {
            const arr = [...prev];
            arr[idx] = value;
            return arr;
        });
    };

    // 選択肢を追加（最大10件）
    const addChoice = () => {
        setChoices((prev) =>
            prev.length < 10 ? [...prev, ''] : prev,
        );
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!manager) return;
        const s = toTimestamp(start);
        const eTime = toTimestamp(end);
        if (Number.isNaN(s) || Number.isNaN(eTime)) {
            showToast('日時を正しく入力してください');
            return;
        }
        if (eTime <= s) {
            showToast('終了日時は開始日時より後を設定してください');
            return;
        }
        if (pollType === 'weighted') {
            if (!token || !ethers.isAddress(token)) {
                showToast('トークンアドレスを正しく入力してください');
                return;
            }
        }
        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            let tx;
            const filteredChoices = choices.filter((c) => c);
            console.log('Submitting transaction with params:', {
                topic,
                token,
                s,
                eTime,
                filteredChoices,
            });
            if (pollType === 'weighted') {
                tx = await manager.createWeightedVote(
                    topic,
                    token,
                    s,
                    eTime,
                    filteredChoices
                );
            } else {
                tx = await manager.createDynamicVote(
                    topic,
                    s,
                    eTime,
                    filteredChoices
                );
            }
            const receipt = await tx.wait();
            const eventName =
                pollType === 'weighted'
                    ? 'WeightedCreated'
                    : 'DynamicCreated';
            const event = receipt.logs
                .map((log) => {
                    try {
                        return manager.interface.parseLog(log);
                    } catch {
                        return null;
                    }
                })
                .find((log) => log && log.name === eventName);

            if (!event) {
                showToast('作成された議題のアドレス取得に失敗しました');
                return;
            }
            showToast(`議題を作成しました: ${event.args.poll}`);
            if (onCreated) onCreated();
        } catch (err) {
            console.error('投票作成エラー', err);
            const msg = err.reason ?? err.shortMessage ?? err.message;
            showToast(`エラー: ${msg}`);
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
            <label className="flex gap-4">
                <span>種類</span>
                <select
                    className="border px-2 py-1"
                    value={pollType}
                    onChange={(e) => setPollType(e.target.value)}
                >
                    <option value="dynamic">Dynamic</option>
                    <option value="weighted">Weighted</option>
                </select>
            </label>
            {pollType === 'weighted' && (
                <label className="flex flex-col gap-1">
                    トークンアドレス
                    <input
                        className="border px-2 py-1 font-mono"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        required
                    />
                </label>
            )}
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
            <div className="flex flex-col gap-2">
                <p>選択肢</p>
                {choices.map((c, i) => (
                    <input
                        key={i}
                        className="border px-2 py-1"
                        value={c}
                        onChange={(e) => updateChoice(i, e.target.value)}
                        required={i < 2}
                    />
                ))}
                <button
                    type="button"
                    className="px-4 py-1 rounded-xl bg-blue-600 text-white w-fit"
                    onClick={addChoice}
                    disabled={choices.length >= 10}
                >
                    選択肢を追加
                </button>
            </div>
            <button
                className="px-4 py-2 rounded-xl bg-green-600 text-white disabled:opacity-50"
                disabled={txPending}
            >
                作成
            </button>
            {onBack && (
                <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-gray-400 text-white"
                    onClick={onBack}
                >
                    戻る
                </button>
            )}
        </form>
    );
}

export default PollCreate;
