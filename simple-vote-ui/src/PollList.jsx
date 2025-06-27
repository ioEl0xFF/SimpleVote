import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
    POLL_MANAGER_ABI,
    POLL_MANAGER_ADDRESS,
    WEIGHTED_VOTE_ABI,
} from './constants';

const ZERO = '0x0000000000000000000000000000000000000000';

// PollManager から投票コントラクトの一覧を取得して表示
function PollList({ signer, onSelect }) {
    const [manager, setManager] = useState(null);
    const [polls, setPolls] = useState([]);

    // signer が用意できたら PollManager を初期化
    useEffect(() => {
        if (!signer) return;
        if (POLL_MANAGER_ADDRESS === ZERO) {
            return;
        }
        const m = new ethers.Contract(
            POLL_MANAGER_ADDRESS,
            POLL_MANAGER_ABI,
            signer
        );
        setManager(m);
    }, [signer]);

    // PollManager から議題一覧を取得
    useEffect(() => {
        if (!manager) return;
        const fetch = async () => {
            try {
                const addrs = await manager.getPolls();
                const list = [];
                for (const a of addrs) {
                    const cont = new ethers.Contract(a, WEIGHTED_VOTE_ABI, signer);
                    try {
                        await cont.token();
                        list.push({ addr: a, type: 'weighted' });
                    } catch {
                        list.push({ addr: a, type: 'dynamic' });
                    }
                }
                setPolls(list);
            } catch {
                // 読み込みに失敗してもエラーは表示しない
            }
        };
        fetch();
        manager.on('DynamicCreated', fetch);
        manager.on('WeightedCreated', fetch);
        return () => {
            manager.off('DynamicCreated', fetch);
            manager.off('WeightedCreated', fetch);
        };
    }, [manager, signer]);

    if (POLL_MANAGER_ADDRESS === ZERO) {
        return (
            <div className="mt-4">
                <p>PollManager がデプロイされていません</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 mt-4">
            <h2 className="text-xl font-bold">Poll 一覧</h2>
            {polls.length === 0 && <p>議題が存在しません</p>}
            <ul className="flex flex-col gap-1">
                {polls.map((p) => (
                    <li key={p.addr}>
                        <button
                            className="underline text-blue-600"
                            onClick={() => onSelect(p)}
                        >
                            {p.type} : {p.addr}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default PollList;
