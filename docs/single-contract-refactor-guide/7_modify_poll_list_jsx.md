# Step 7: simple-vote-ui/src/PollList.jsx の変更

このステップでは、`simple-vote-ui/src/PollList.jsx` ファイルを変更し、`PollManager` の代わりに新しい `PollRegistry` コントラクトから投票の一覧を取得するようにします。また、各投票の詳細情報を取得し、表示に反映させます。

## 7.1. 変更内容

`simple-vote-ui/src/PollList.jsx` を開き、以下の変更を行います。

1.  インポート文を更新し、`POLL_MANAGER_ABI` と `POLL_MANAGER_ADDRESS` を `POLL_REGISTRY_ABI` と `POLL_REGISTRY_ADDRESS` に変更します。`WEIGHTED_VOTE_ABI` は不要になります。
2.  `useEffect` フック内で `PollManager` の代わりに `PollRegistry` を初期化するように変更します。
3.  `fetch` 関数内で、`manager.getPolls()` の代わりに `registry.getPolls()` を呼び出します。`getPolls` は `pollId`, `pollType`, `owner`, `topic` の配列を返すように変更されているため、それらを適切に処理します。
4.  各投票の詳細情報を取得するために、`registry.getPoll(pollId)` を呼び出します。
5.  `PollCreated` イベントを購読するように変更します。

```javascript
// simple-vote-ui/src/PollList.jsx

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
    POLL_REGISTRY_ABI,
    POLL_REGISTRY_ADDRESS,
} from './constants';

const ZERO = '0x0000000000000000000000000000000000000000';

// PollRegistry から投票コントラクトの一覧を取得して表示
function PollList({ signer, onSelect }) {
    const [registry, setRegistry] = useState(null); // manager から registry に変更
    const [polls, setPolls] = useState([]);

    // signer が用意できたら PollRegistry を初期化
    useEffect(() => {
        if (!signer) return;
        if (POLL_REGISTRY_ADDRESS === ZERO) {
            return;
        }
        const r = new ethers.Contract(
            POLL_REGISTRY_ADDRESS,
            POLL_REGISTRY_ABI,
            signer
        );
        setRegistry(r);
    }, [signer]);

    // PollRegistry から議題一覧を取得
    useEffect(() => {
        if (!registry) return; // manager から registry に変更
        const fetch = async () => {
            try {
                const [pollIds, pollTypes, owners, topics] = await registry.getPolls();
                const list = [];
                for (let i = 0; i < pollIds.length; i++) {
                    const pollId = pollIds[i];
                    const pollType = pollTypes[i];
                    const owner = owners[i];
                    const topic = topics[i];

                    // 各投票の詳細情報を取得
                    const [id, type, , , start, end, choiceNames, voteCounts] = await registry.getPoll(pollId);

                    let typeString;
                    if (type === 0) {
                        typeString = 'dynamic';
                    } else if (type === 1) {
                        typeString = 'weighted';
                    } else if (type === 2) {
                        typeString = 'simple';
                    }

                    list.push({
                        id: Number(id),
                        type: typeString,
                        owner: owner,
                        topic: topic,
                        startTime: Number(start),
                        endTime: Number(end),
                        choices: choiceNames.map((name, idx) => ({
                            name: name,
                            votes: Number(voteCounts[idx]),
                        })),
                    });
                }
                setPolls(list);
            } catch (error) {
                console.error("Failed to fetch polls:", error);
                // 読み込みに失敗してもエラーは表示しない
            }
        };
        fetch();
        registry.on('PollCreated', fetch); // DynamicCreated, WeightedCreated から PollCreated に変更
        return () => {
            registry.off('PollCreated', fetch); // DynamicCreated, WeightedCreated から PollCreated に変更
        };
    }, [registry, signer]);

    if (POLL_REGISTRY_ADDRESS === ZERO) { // POLL_MANAGER_ADDRESS から POLL_REGISTRY_ADDRESS に変更
        return (
            <div className="mt-4">
                <p>PollRegistry がデプロイされていません</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 mt-4">
            <h2 className="text-xl font-bold">Poll 一覧</h2>
            {polls.length === 0 && <p>議題が存在しません</p>}
            <ul className="flex flex-col gap-1">
                {polls.map((p) => (
                    <li key={p.id}>
                        <button
                            className="underline text-blue-600"
                            onClick={() => onSelect(p)}
                        >
                            {p.type} : {p.topic} (ID: {p.id})
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default PollList;
```