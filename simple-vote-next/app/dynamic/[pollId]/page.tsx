'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/components/WalletProvider';
import App from '@/components/App';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import { POLL_REGISTRY_ABI, POLL_REGISTRY_ADDRESS } from '@/lib/constants';

const ZERO = '0x0000000000000000000000000000000000000000';

interface Choice {
    id: number;
    name: string;
    votes: number;
}

// DynamicVote コントラクトを操作する汎用コンポーネント
function DynamicVote({
    signer,
    pollId,
    showToast,
}: {
    signer: ethers.Signer | null;
    pollId: number;
    showToast: (msg: string) => void;
}) {
    const [registry, setRegistry] = useState<ethers.Contract | null>(null);
    const [topic, setTopic] = useState('');
    const [choices, setChoices] = useState<Choice[]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [votedId, setVotedId] = useState(0);
    const [txPending, setTxPending] = useState(false);
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!signer) {
            setLoading(false);
            return;
        }
        const r = new ethers.Contract(POLL_REGISTRY_ADDRESS, POLL_REGISTRY_ABI, signer);
        setRegistry(r);
    }, [signer]);

    const fetchData = useCallback(async () => {
        if (!registry || pollId === undefined) return;
        try {
            setLoading(true);
            const [, , , topic, startTime, endTime, choiceNames, voteCounts] =
                await registry.getPoll(pollId);
            setTopic(topic);
            setStart(Number(startTime));
            setEnd(Number(endTime));

            const arr: Choice[] = choiceNames.map((name: string, idx: number) => ({
                id: idx + 1,
                name: name,
                votes: Number(voteCounts[idx]),
            }));
            setChoices(arr);

            if (signer) {
                const addr = await signer.getAddress();
                const id = await registry.getVotedChoiceId(pollId, addr);
                setVotedId(Number(id));
            }
        } catch (err: any) {
            console.error('Failed to fetch poll data:', err);
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        } finally {
            setLoading(false);
        }
    }, [registry, pollId, signer, showToast]);

    useEffect(() => {
        if (!registry) return;
        fetchData();
        // PollRegistry のイベントを購読
        registry.on('VoteCast', fetchData);
        registry.on('VoteCancelled', fetchData);
        return () => {
            registry.off('VoteCast', fetchData);
            registry.off('VoteCancelled', fetchData);
        };
    }, [registry, fetchData]);

    const vote = async () => {
        if (!registry || selected === null) return;
        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            const tx = await registry.vote(pollId, selected, 0);
            await tx.wait();
            await fetchData();
            showToast('投票が完了しました');
        } catch (err: any) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        } finally {
            setTxPending(false);
        }
    };

    const cancelVote = async () => {
        if (!registry) return;
        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            const tx = await registry.cancelVote(pollId);
            await tx.wait();
            await fetchData();
            showToast('投票を取り消しました');
        } catch (err: any) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        } finally {
            setTxPending(false);
        }
    };

    const handleCancelVoteKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            cancelVote();
        }
    };

    if (pollId === undefined) {
        return (
            <section className="flex flex-col items-center gap-4 mt-10">
                <p>Poll ID が無効です</p>
            </section>
        );
    }

    if (loading) {
        return (
            <section className="flex flex-col items-center gap-4 mt-10">
                <LoadingSpinner size="lg" className="py-8" />
                <p className="text-center text-gray-600">投票データを読み込み中...</p>
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
                            aria-label={`${c.name}に投票する`}
                        />
                        {c.name} ({c.votes})
                    </label>
                ))}
                <button
                    className="px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={txPending || selected === null || votedId !== 0 || !inPeriod}
                    aria-label={txPending ? '投票処理中...' : '投票を実行する'}
                    type="submit"
                >
                    投票する
                </button>
            </form>
            {votedId !== 0 && (
                <button
                    className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={txPending || !inPeriod}
                    onClick={cancelVote}
                    onKeyDown={handleCancelVoteKeyDown}
                    aria-label={txPending ? '投票取消処理中...' : '投票を取り消す'}
                    type="button"
                    tabIndex={0}
                >
                    取消
                </button>
            )}
            {!inPeriod && <p className="text-red-600">投票期間外です</p>}
        </section>
    );
}

// 動的ルーティングページコンポーネント
export default function DynamicVotePage({ params }: { params: Promise<{ pollId: string }> }) {
    const { signer, showToast } = useWallet();
    const router = useRouter();
    const resolvedParams = use(params);
    const pollId = Number(resolvedParams.pollId);

    // pollIdが無効な場合の処理
    if (isNaN(pollId) || pollId < 0) {
        return (
            <App>
                <PageHeader
                    title="Dynamic Vote"
                    breadcrumbs={[
                        { label: 'Dynamic Vote', href: '/dynamic' },
                        { label: `ID: ${resolvedParams.pollId}` },
                    ]}
                />
                <section className="flex flex-col items-center gap-4 mt-10">
                    <p>無効なPoll IDです</p>
                </section>
            </App>
        );
    }

    return (
        <App>
            <PageHeader
                title="Dynamic Vote"
                breadcrumbs={[
                    { label: 'Dynamic Vote', href: '/dynamic' },
                    { label: `ID: ${pollId}` },
                ]}
            />
            <DynamicVote signer={signer} pollId={pollId} showToast={showToast} />
        </App>
    );
}
