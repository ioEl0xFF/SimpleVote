'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { POLL_REGISTRY_ABI, POLL_REGISTRY_ADDRESS, ZERO } from '@/lib/constants';
import { useWallet } from '@/components/WalletProvider';
import App from '@/components/App';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';

// SimpleVote ページコンポーネント
export default function SimpleVotePage({ params }: { params: { pollId: string } }) {
    const router = useRouter();
    const { signer, showToast } = useWallet();
    const pollId = Number(params.pollId);

    const [registry, setRegistry] = useState<ethers.Contract | null>(null);
    const [topic, setTopic] = useState('');
    const [agreeCount, setAgreeCount] = useState(0);
    const [disagreeCount, setDisagreeCount] = useState(0);
    const [selected, setSelected] = useState<number | null>(null); // 1: 賛成, 2: 反対
    const [votedId, setVotedId] = useState(0);
    const [txPending, setTxPending] = useState(false);
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);
    const [loading, setLoading] = useState(true);

    // pollIdが無効な場合の処理
    if (isNaN(pollId) || pollId <= 0) {
        notFound();
    }

    // ウォレット接続状態の確認
    useEffect(() => {
        if (!signer) {
            showToast('ウォレットを接続してください');
            setLoading(false);
            return;
        }

        if (POLL_REGISTRY_ADDRESS === ZERO) {
            showToast('PollRegistry コントラクトアドレスが未設定です');
            setLoading(false);
            return;
        }

        const r = new ethers.Contract(POLL_REGISTRY_ADDRESS, POLL_REGISTRY_ABI, signer);
        setRegistry(r);
    }, [signer, showToast]);

    // 投票データの取得
    const fetchData = useCallback(async () => {
        if (!registry || pollId === undefined) return;

        try {
            setLoading(true);
            const [, , , topic, startTime, endTime, , voteCounts] = await registry.getPoll(pollId);
            setTopic(topic);
            setStart(Number(startTime));
            setEnd(Number(endTime));

            // SimpleVote の場合、choices[0]が賛成、choices[1]が反対と仮定
            setAgreeCount(Number(voteCounts[0] || 0));
            setDisagreeCount(Number(voteCounts[1] || 0));

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

    // データ取得とイベントリスナーの設定
    useEffect(() => {
        if (!registry) return;

        fetchData();

        // イベントリスナーの設定
        registry.on('VoteCast', fetchData);
        registry.on('VoteCancelled', fetchData);

        return () => {
            registry.off('VoteCast', fetchData);
            registry.off('VoteCancelled', fetchData);
        };
    }, [registry, fetchData]);

    // 投票実行
    const vote = async () => {
        if (!registry || selected === null) return;

        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');

            // SimpleVote の場合、amount は 0
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

    // 投票取消
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

    // エラー状態の表示
    if (POLL_REGISTRY_ADDRESS === ZERO || pollId === undefined) {
        return (
            <App>
                <PageHeader
                    title="Simple Vote"
                    breadcrumbs={[
                        { label: 'Simple Vote', href: '/simple' },
                        { label: `ID: ${pollId}` },
                    ]}
                />
                <section className="flex flex-col items-center gap-4 mt-10">
                    <p>PollRegistry コントラクトアドレスが未設定か、Poll ID が無効です</p>
                </section>
            </App>
        );
    }

    if (loading) {
        return (
            <App>
                <PageHeader
                    title="Simple Vote"
                    breadcrumbs={[
                        { label: 'Simple Vote', href: '/simple' },
                        { label: `ID: ${pollId}` },
                    ]}
                />
                <section className="flex flex-col items-center gap-4 mt-10">
                    <LoadingSpinner size="lg" className="py-8" />
                    <p className="text-center text-gray-600">投票データを読み込み中...</p>
                </section>
            </App>
        );
    }

    const now = Math.floor(Date.now() / 1000);
    const inPeriod = start !== 0 && now >= start && now <= end;

    return (
        <App>
            <PageHeader
                title="Simple Vote"
                breadcrumbs={[
                    { label: 'Simple Vote', href: '/simple' },
                    { label: `ID: ${pollId}` },
                ]}
            />
            <section className="flex flex-col items-center gap-4 mt-10">
                <h2 className="text-2xl font-bold">SimpleVote</h2>
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
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="simpleChoice"
                            value={1} // 賛成
                            onChange={() => setSelected(1)}
                            checked={selected === 1}
                            disabled={votedId !== 0}
                        />
                        賛成 ({agreeCount})
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="simpleChoice"
                            value={2} // 反対
                            onChange={() => setSelected(2)}
                            checked={selected === 2}
                            disabled={votedId !== 0}
                        />
                        反対 ({disagreeCount})
                    </label>
                    <button
                        className="px-4 py-2 rounded-xl bg-blue-500 text-white disabled:opacity-50"
                        disabled={txPending || selected === null || votedId !== 0 || !inPeriod}
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
            </section>
        </App>
    );
}
