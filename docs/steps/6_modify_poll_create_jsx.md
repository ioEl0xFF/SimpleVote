# Step 6: simple-vote-ui/src/PollCreate.jsx の変更

このステップでは、`simple-vote-ui/src/PollCreate.jsx` ファイルを変更し、新しい `PollRegistry` コントラクトの `createPoll` 関数を呼び出すようにします。これにより、単一のコントラクトで異なる種類の投票を作成できるようになります。

## 6.1. 変更内容

`simple-vote-ui/src/PollCreate.jsx` を開き、以下の変更を行います。

1.  インポート文を更新し、`POLL_MANAGER_ABI` と `POLL_MANAGER_ADDRESS` を `POLL_REGISTRY_ABI` と `POLL_REGISTRY_ADDRESS` に変更します。
2.  `useEffect` フック内で `PollManager` の代わりに `PollRegistry` を初期化するように変更します。
3.  `submit` 関数内で、`manager.createWeightedVote` および `manager.createDynamicVote` の呼び出しを `manager.createPoll` の呼び出しに置き換えます。
4.  `createPoll` 関数に渡す引数を、`PollRegistry.sol` の `createPoll` 関数定義に合わせて調整します。特に、`pollType` と `_tokenAddress` の扱いを注意深く変更します。
5.  イベントのログ解析部分も `PollCreated` イベントを検出するように変更します。

```javascript
// simple-vote-ui/src/PollCreate.jsx

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
    POLL_REGISTRY_ABI,
    POLL_REGISTRY_ADDRESS,
    MOCK_ERC20_ADDRESS,
} from './constants';

const ZERO = '0x0000000000000000000000000000000000000000';

// PollRegistry を使って DynamicVote か WeightedVote を作成するフォーム
function PollCreate({ signer, onCreated, showToast, onBack }) {
    const [registry, setRegistry] = useState(null); // manager から registry に変更
    const [pollType, setPollType] = useState('dynamic');
    const [topic, setTopic] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [token, setToken] = useState(MOCK_ERC20_ADDRESS);
    const [choices, setChoices] = useState(['', '']);
    const [txPending, setTxPending] = useState(false);

    // signer から PollRegistry を初期化
    useEffect(() => {
        if (!signer || POLL_REGISTRY_ADDRESS === ZERO) return;
        const r = new ethers.Contract(
            POLL_REGISTRY_ADDRESS,
            POLL_REGISTRY_ABI,
            signer,
        );
        setRegistry(r);
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
        if (!registry) return; // manager から registry に変更
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

        let tokenAddress = ZERO;
        let pollTypeEnum;

        if (pollType === 'weighted') {
            if (!token || !ethers.isAddress(token)) {
                showToast('トークンアドレスを正しく入力してください');
                return;
            }
            tokenAddress = token;
            pollTypeEnum = 1; // PollType.WEIGHTED_VOTE
        } else if (pollType === 'dynamic') {
            pollTypeEnum = 0; // PollType.DYNAMIC_VOTE
        } else if (pollType === 'simple') {
            pollTypeEnum = 2; // PollType.SIMPLE_VOTE
        }

        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            const filteredChoices = choices.filter((c) => c);

            // PollRegistry の createPoll を呼び出す
            const tx = await registry.createPoll(
                pollTypeEnum,
                topic,
                s,
                eTime,
                filteredChoices,
                tokenAddress
            );

            const receipt = await tx.wait();

            const event = receipt.logs
                .map((log) => {
                    try {
                        return registry.interface.parseLog(log); // manager から registry に変更
                    } catch {
                        return null;
                    }
                })
                .find((log) => log && log.name === 'PollCreated'); // イベント名を PollCreated に変更

            if (!event) {
                showToast('作成された議題のアドレス取得に失敗しました');
                return;
            }
            const pollId = event.args.pollId; // pollId を取得
            showToast(`議題を作成しました (ID: ${pollId})`);
            if (onCreated) onCreated();
        } catch (err) {
            console.error('投票作成エラー', err);
            const msg = err.reason ?? err.shortMessage ?? err.message;
            showToast(`エラー: ${msg}`);
        } finally {
            setTxPending(false);
        }
    };

    if (POLL_REGISTRY_ADDRESS === ZERO) { // POLL_MANAGER_ADDRESS から POLL_REGISTRY_ADDRESS に変更
        return <p>PollRegistry がデプロイされていません</p>;
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
                    <option value="simple">Simple</option> {/* SimpleVote を追加 */}
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
                        required={i < 2} // 少なくとも2つの選択肢を必須とする
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
