# Step 9: simple-vote-ui/src/DynamicVote.jsx の変更

このステップでは、`simple-vote-ui/src/DynamicVote.jsx` ファイルを変更し、個別の `DynamicVote` コントラクトではなく、`PollRegistry` コントラクトと連携するようにします。これにより、単一の `PollRegistry` コントラクトを通じて投票の操作を行います。

## 9.1. 変更内容

`simple-vote-ui/src/DynamicVote.jsx` を開き、以下の変更を行います。

1.  インポート文を更新し、`DYNAMIC_VOTE_ABI` を削除し、`POLL_REGISTRY_ABI` と `POLL_REGISTRY_ADDRESS` をインポートします。
2.  `contract` ステートを `registry` に変更し、`PollRegistry` コントラクトのインスタンスを保持するようにします。
3.  `useEffect` フック内で `PollRegistry` を初期化するように変更します。
4.  `fetchData` 関数内で、`registry.getPoll(pollId)` を呼び出して投票の詳細情報を取得するように変更します。`votedChoiceId` も `registry.getVotedChoiceId(pollId, addr)` から取得します。
5.  `vote` 関数と `cancelVote` 関数内で、`contract.vote` および `contract.cancelVote` の呼び出しを `registry.vote` および `registry.cancelVote` の呼び出しに置き換え、`pollId` を引数として渡します。
6.  イベント購読を `PollCreated`, `VoteCast`, `VoteCancelled` に変更し、`PollRegistry` のイベントをリッスンするようにします。

```javascript
// simple-vote-ui/src/DynamicVote.jsx

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { POLL_REGISTRY_ABI, POLL_REGISTRY_ADDRESS } from './constants';

const ZERO = '0x0000000000000000000000000000000000000000';

// DynamicVote コントラクトを操作する汎用コンポーネント
function DynamicVote({ signer, pollId, showToast, onBack }) { // address から pollId に変更
    const [registry, setRegistry] = useState(null); // contract から registry に変更
    const [topic, setTopic] = useState('');
    const [choices, setChoices] = useState([]);
    const [selected, setSelected] = useState(null);
    const [votedId, setVotedId] = useState(0);
    const [txPending, setTxPending] = useState(false);
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);

    useEffect(() => {
        if (!signer || POLL_REGISTRY_ADDRESS === ZERO) return; // address から POLL_REGISTRY_ADDRESS に変更
        const r = new ethers.Contract(POLL_REGISTRY_ADDRESS, POLL_REGISTRY_ABI, signer); // DYNAMIC_VOTE_ABI から POLL_REGISTRY_ABI に変更
        setRegistry(r);
    }, [signer]);

    const fetchData = useCallback(async () => {
        if (!registry || pollId === undefined) return; // contract から registry に変更, address から pollId に変更
        try {
            const [id, pollType, owner, topic, startTime, endTime, choiceNames, voteCounts, tokenAddress, depositedAmount] = await registry.getPoll(pollId);
            setTopic(topic);
            setStart(Number(startTime));
            setEnd(Number(endTime));

            const arr = choiceNames.map((name, idx) => ({
                id: idx + 1,
                name: name,
                votes: Number(voteCounts[idx]),
            }));
            setChoices(arr);

            if (signer) {
                const addr = await signer.getAddress();
                const id = await registry.getVotedChoiceId(pollId, addr); // contract から registry に変更, pollId を追加
                setVotedId(Number(id));
            }
        } catch (err) {
            console.error("Failed to fetch poll data:", err);
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        }
    }, [registry, pollId, signer, showToast]); // contract から registry に変更, address から pollId に変更

    useEffect(() => {
        if (!registry) return; // contract から registry に変更
        fetchData();
        // PollRegistry のイベントを購読
        registry.on('VoteCast', fetchData);
        registry.on('VoteCancelled', fetchData);
        return () => {
            registry.off('VoteCast', fetchData);
            registry.off('VoteCancelled', fetchData);
        };
    }, [registry, fetchData]); // contract から registry に変更

    const vote = async () => {
        if (!registry || selected === null) return; // contract から registry に変更
        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            const tx = await registry.vote(pollId, selected, 0); // pollId を追加, amount は 0
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
        if (!registry) return; // contract から registry に変更
        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            const tx = await registry.cancelVote(pollId); // pollId を追加
            await tx.wait();
            await fetchData();
            showToast('投票を取り消しました');
        } catch (err) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        } finally {
            setTxPending(false);
        }
    };

    if (POLL_REGISTRY_ADDRESS === ZERO || pollId === undefined) { // address から POLL_REGISTRY_ADDRESS に変更, pollId を追加
        return (
            <section className="flex flex-col items-center gap-4 mt-10">
                <p>PollRegistry コントラクトアドレスが未設定か、Poll ID が無効です</p>
            </section>
        );
    }

    // 現在が投票期間内かどうかを判定
    const now = Math.floor(Date.now() / 1000);
    const inPeriod = start !== 0 && now >= start && now <= end;

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
                    disabled={
                        txPending ||
                        selected === null ||
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

export default DynamicVote;
```