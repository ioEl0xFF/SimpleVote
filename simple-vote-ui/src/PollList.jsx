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
                    const [, , , , start, end, choiceNames, voteCounts] = await registry.getPoll(pollId);

                    let typeString;
                    if (pollType === 0n) {
                        typeString = 'dynamic';
                    } else if (pollType === 1n) {
                        typeString = 'weighted';
                    } else if (pollType === 2n) {
                        typeString = 'simple';
                    }

                    list.push({
                        id: Number(pollId),
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