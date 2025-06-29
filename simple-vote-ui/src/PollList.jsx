import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
    POLL_MANAGER_ABI,
    POLL_MANAGER_ADDRESS,
    WEIGHTED_VOTE_ABI,
    DYNAMIC_VOTE_ABI,
} from './constants';

const ZERO = '0x0000000000000000000000000000000000000000';

// PollManager から投票コントラクトの一覧を取得して表示
function PollList({ signer, onSelect, showToast }) {
    const [manager, setManager] = useState(null);
    const [polls, setPolls] = useState([]);
    const [hiddenPolls, setHiddenPolls] = useState(() => {
        const stored = localStorage.getItem('hiddenPolls');
        return stored ? JSON.parse(stored) : [];
    });

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
    const fetchPolls = useCallback(async () => {
        if (!manager || !signer) return;
        try {
            const addrs = await manager.getPolls();
            const currentAccount = await signer.getAddress();
            const list = [];
            for (const a of addrs) {
                let type = 'dynamic';
                let owner = '';
                try {
                    const weightedCont = new ethers.Contract(a, WEIGHTED_VOTE_ABI, signer);
                    await weightedCont.token(); // Check if it's a WeightedVote contract
                    type = 'weighted';
                    owner = await weightedCont.owner();
                } catch {
                    const dynamicCont = new ethers.Contract(a, DYNAMIC_VOTE_ABI, signer);
                    owner = await dynamicCont.owner();
                }
                list.push({ addr: a, type, owner, isOwner: owner.toLowerCase() === currentAccount.toLowerCase() });
            }
            setPolls(list.filter(p => !hiddenPolls.includes(p.addr)));
        } catch (e) {
            console.error("Failed to fetch polls:", e);
            // 読み込みに失敗してもエラーは表示しない
        }
    }, [manager, signer, hiddenPolls]);

    useEffect(() => {
        fetchPolls();
        if (manager) {
            manager.on('DynamicCreated', fetchPolls);
            manager.on('WeightedCreated', fetchPolls);
            return () => {
                manager.off('DynamicCreated', fetchPolls);
                manager.off('WeightedCreated', fetchPolls);
            };
        }
    }, [manager, fetchPolls]);

    const handleDelete = useCallback((pollAddress) => {
        if (window.confirm("このPollを一覧から非表示にしますか？")) {
            setHiddenPolls((prev) => {
                const newHidden = [...prev, pollAddress];
                localStorage.setItem('hiddenPolls', JSON.stringify(newHidden));
                return newHidden;
            });
            setPolls((prev) => prev.filter((p) => p.addr !== pollAddress));
            showToast('Pollを非表示にしました');
        }
    }, [showToast]);

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
                    <li key={p.addr} className="flex items-center gap-2">
                        <button
                            className="underline text-blue-600"
                            onClick={() => onSelect(p)}
                        >
                            {p.type} : {p.addr}
                        </button>
                        {p.isOwner && (
                            <button
                                className="px-2 py-1 rounded-md bg-red-500 text-white text-sm"
                                onClick={() => handleDelete(p.addr)}
                            >
                                削除
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default PollList;
