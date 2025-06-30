# Step 10: simple-vote-ui/src/WeightedVote.jsx の変更

このステップでは、`simple-vote-ui/src/WeightedVote.jsx` ファイルを変更し、個別の `WeightedVote` コントラクトではなく、`PollRegistry` コントラクトと連携するようにします。これにより、単一の `PollRegistry` コントラクトを通じて重み付き投票の操作を行います。

## 10.1. 変更内容

`simple-vote-ui/src/WeightedVote.jsx` を開き、以下の変更を行います。

1.  インポート文を更新し、`WEIGHTED_VOTE_ABI` を削除し、`POLL_REGISTRY_ABI` と `POLL_REGISTRY_ADDRESS` をインポートします。
2.  `contract` ステートを `registry` に変更し、`PollRegistry` コントラクトのインスタンスを保持するようにします。
3.  `useEffect` フック内で `PollRegistry` を初期化するように変更します。
4.  `fetchData` 関数内で、`registry.getPoll(pollId)` を呼び出して投票の詳細情報を取得するように変更します。`votedChoiceId` も `registry.getVotedChoiceId(pollId, addr)` から取得します。
5.  `approve` 関数は、`PollRegistry` が保持するトークンアドレスに対して実行するように変更します。
6.  `vote` 関数と `cancelVote` 関数内で、`contract.vote` および `contract.cancelVote` の呼び出しを `registry.vote` および `registry.cancelVote` の呼び出しに置き換え、`pollId` を引数として渡します。
7.  イベント購読を `PollCreated`, `VoteCast`, `VoteCancelled` に変更し、`PollRegistry` のイベントをリッスンするようにします。

```javascript
// simple-vote-ui/src/WeightedVote.jsx

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
    POLL_REGISTRY_ABI,
    POLL_REGISTRY_ADDRESS,
    ERC20_ABI,
} from './constants';

const ZERO = '0x0000000000000000000000000000000000000000';

// WeightedVote コントラクト用の汎用コンポーネント

// 指定アドレスの WeightedVote を操作
function WeightedVote({ signer, pollId, showToast, onBack }) { // address から pollId に変更
    const [registry, setRegistry] = useState(null); // contract から registry に変更
    const [tokenContract, setTokenContract] = useState(null); // token から tokenContract に変更
    const [topic, setTopic] = useState('');
    const [choices, setChoices] = useState([]);
    const [selected, setSelected] = useState(null);
    const [amount, setAmount] = useState('');
    const [votedId, setVotedId] = useState(0);
    const [txPending, setTxPending] = useState(false);
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);
    const [tokenAddress, setTokenAddress] = useState(ZERO); // 新しく tokenAddress ステートを追加

    // signer が変わったらコントラクトを初期化
    useEffect(() => {
        if (!signer || POLL_REGISTRY_ADDRESS === ZERO) return; // address から POLL_REGISTRY_ADDRESS に変更
        const r = new ethers.Contract(POLL_REGISTRY_ADDRESS, POLL_REGISTRY_ABI, signer); // WEIGHTED_VOTE_ABI から POLL_REGISTRY_ABI に変更
        setRegistry(r);
    }, [signer]);

    // 投票状況を取得
    const fetchData = useCallback(async () => {
        if (!registry || pollId === undefined) return; // contract から registry に変更, address から pollId に変更
        try {
            const [id, pollType, owner, topic, startTime, endTime, choiceNames, voteCounts, tokenAddr, depositedAmount] = await registry.getPoll(pollId);
            setTopic(topic);
            setStart(Number(startTime));
            setEnd(Number(endTime));
            setTokenAddress(tokenAddr); // tokenAddress を設定

            const arr = choiceNames.map((name, idx) => ({
                id: idx + 1,
                name: name,
                votes: ethers.formatEther(voteCounts[idx]), // 18 桁精度を Ether 表記に変換
            }));
            setChoices(arr);

            if (signer) {
                const addr = await signer.getAddress();
                const id = await registry.getVotedChoiceId(pollId, addr); // contract から registry に変更, pollId を追加
                setVotedId(Number(id));
            }

            // トークンコントラクトの初期化
            if (tokenAddr !== ZERO && !tokenContract) {
                const tok = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
                setTokenContract(tok);
            }

        } catch (err) {
            console.error("Failed to fetch poll data:", err);
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        }
    }, [registry, pollId, signer, showToast, tokenContract]); // contract から registry に変更, address から pollId に変更

    // 初期化とイベント購読
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

    // トークンの承認
    const approve = async () => {
        if (!tokenContract || !amount || tokenAddress === ZERO) return; // token から tokenContract に変更
        const value = ethers.parseEther(amount);
        showToast('トランザクション承認待ち…');
        try {
            const tx = await tokenContract.approve(POLL_REGISTRY_ADDRESS, value); // address から POLL_REGISTRY_ADDRESS に変更
            await tx.wait();
            showToast('承認が完了しました');
        } catch (err) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        }
    };

    // 投票処理
    const vote = async () => {
        if (!registry || selected === null || !amount) return; // contract から registry に変更
        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            const value = ethers.parseEther(amount);
            const tx = await registry.vote(pollId, selected, value); // pollId を追加
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

    // コントラクトが未設定なら簡易メッセージを表示
    if (POLL_REGISTRY_ADDRESS === ZERO || pollId === undefined) { // address から POLL_REGISTRY_ADDRESS に変更, pollId を追加
        return (
            <section className="flex flex-col items-center gap-4 mt-10">
                <h2 className="text-2xl font-bold">WeightedVote DApp</h2>
                <p>PollRegistry コントラクトアドレスが未設定か、Poll ID が無効です</p>
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
                    disabled={!amount || selected === null || votedId !== 0 || tokenAddress === ZERO}
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
```