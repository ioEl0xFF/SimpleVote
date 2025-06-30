'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/components/WalletProvider';
import App from '@/components/App';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import { POLL_REGISTRY_ABI, POLL_REGISTRY_ADDRESS } from '@/lib/constants';

interface Choice {
    name: string;
    votes: number;
}

interface Poll {
    id: number;
    type: string;
    owner: string;
    topic: string;
    startTime: number;
    endTime: number;
    choices: Choice[];
}

// PollRegistry から投票コントラクトの一覧を取得して表示
function PollList({
    signer,
    onSelect,
}: {
    signer: ethers.Signer | null;
    onSelect: (poll: Poll) => void;
}) {
    const [registry, setRegistry] = useState<ethers.Contract | null>(null);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);

    // signer が用意できたら PollRegistry を初期化
    useEffect(() => {
        if (!signer) return;
        const r = new ethers.Contract(POLL_REGISTRY_ADDRESS, POLL_REGISTRY_ABI, signer);
        setRegistry(r);
    }, [signer]);

    // PollRegistry から議題一覧を取得
    useEffect(() => {
        if (!registry) return;
        const fetch = async () => {
            try {
                setLoading(true);
                const [pollIds, pollTypes, owners, topics] = await registry.getPolls();

                // 空の配列の場合は早期リターン
                if (!pollIds || pollIds.length === 0) {
                    setPolls([]);
                    return;
                }

                const list: Poll[] = [];
                for (let i = 0; i < pollIds.length; i++) {
                    const pollId = pollIds[i];
                    const pollType = pollTypes[i];
                    const owner = owners[i];
                    const topic = topics[i];

                    // 各投票の詳細情報を取得
                    const [, , , , start, end, choiceNames, voteCounts] = await registry.getPoll(
                        pollId
                    );

                    let typeString: string;
                    if (pollType === 0n) {
                        typeString = 'dynamic';
                    } else if (pollType === 1n) {
                        typeString = 'weighted';
                    } else if (pollType === 2n) {
                        typeString = 'simple';
                    } else {
                        typeString = 'unknown';
                    }

                    list.push({
                        id: Number(pollId),
                        type: typeString,
                        owner: owner,
                        topic: topic,
                        startTime: Number(start),
                        endTime: Number(end),
                        choices: choiceNames.map((name: string, idx: number) => ({
                            name: name,
                            votes: Number(voteCounts[idx]),
                        })),
                    });
                }
                setPolls(list);
            } catch (error) {
                console.error('Failed to fetch polls:', error);
                // エラーの場合は空の配列を設定
                setPolls([]);
            } finally {
                setLoading(false);
            }
        };
        fetch();
        registry.on('PollCreated', fetch);
        return () => {
            registry.off('PollCreated', fetch);
        };
    }, [registry, signer]);

    if (loading) {
        return (
            <div className="mt-4">
                <LoadingSpinner size="lg" className="py-8" />
                <p className="text-center text-gray-600">投票一覧を読み込み中...</p>
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
                        <button className="underline text-blue-600" onClick={() => onSelect(p)}>
                            {p.type} : {p.topic} (ID: {p.id})
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Poll 一覧ページ
function PollListPage({
    signer,
    onSelect,
    onCreate,
}: {
    signer: ethers.Signer | null;
    onSelect: (poll: Poll) => void;
    onCreate: () => void;
}) {
    return (
        <div className="flex flex-col gap-4 mt-4">
            <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-green-600 text-white" onClick={onCreate}>
                    新規作成
                </button>
            </div>
            <PollList signer={signer} onSelect={onSelect} />
        </div>
    );
}

export default function HomePage() {
    const { signer } = useWallet();
    const router = useRouter();

    const handleSelect = (poll: Poll) => {
        router.push(`/${poll.type}/${poll.id}`);
    };

    const handleCreate = () => {
        router.push('/create');
    };

    return (
        <App>
            <PageHeader title="投票一覧" showHomeButton={false} />
            <PollListPage signer={signer} onSelect={handleSelect} onCreate={handleCreate} />
        </App>
    );
}
