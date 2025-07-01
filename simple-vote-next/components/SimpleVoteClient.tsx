'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/components/WalletProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import { POLL_REGISTRY_ABI, POLL_REGISTRY_ADDRESS } from '@/lib/constants';
import { PollData } from '@/lib/poll-data';

interface SimpleVoteClientProps {
    pollData: PollData;
    pollId: number;
}

export default function SimpleVoteClient({ pollData, pollId }: SimpleVoteClientProps) {
    const { signer, showToast } = useWallet();
    const [registry, setRegistry] = useState<ethers.Contract | null>(null);
    const [agreeCount, setAgreeCount] = useState(0);
    const [disagreeCount, setDisagreeCount] = useState(0);
    const [selected, setSelected] = useState<number | null>(null); // 1: 賛成, 2: 反対
    const [votedId, setVotedId] = useState(0);
    const [txPending, setTxPending] = useState(false);
    const [loading, setLoading] = useState(false);

    // 初期データの設定
    useEffect(() => {
        // SimpleVote の場合、choices[0]が賛成、choices[1]が反対と仮定
        setAgreeCount(pollData.voteCounts[0] || 0);
        setDisagreeCount(pollData.voteCounts[1] || 0);
    }, [pollData]);

    // ウォレット接続時のコントラクト初期化
    useEffect(() => {
        if (!signer) {
            return;
        }
        const r = new ethers.Contract(POLL_REGISTRY_ADDRESS, POLL_REGISTRY_ABI, signer);
        setRegistry(r);
    }, [signer]);

    // 投票状況の取得
    const fetchVoteStatus = useCallback(async () => {
        if (!registry || !signer) return;
        try {
            setLoading(true);
            const addr = await signer.getAddress();
            const id = await registry.getVotedChoiceId(pollId, addr);
            setVotedId(Number(id));
        } catch (err: any) {
            console.error('Failed to fetch vote status:', err);
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        } finally {
            setLoading(false);
        }
    }, [registry, pollId, signer, showToast]);

    // 投票状況の更新
    useEffect(() => {
        if (!registry) return;
        fetchVoteStatus();

        // イベントリスナーの設定
        registry.on('VoteCast', fetchVoteStatus);
        registry.on('VoteCancelled', fetchVoteStatus);

        return () => {
            registry.off('VoteCast', fetchVoteStatus);
            registry.off('VoteCancelled', fetchVoteStatus);
        };
    }, [registry, fetchVoteStatus]);

    // 投票実行
    const vote = async () => {
        if (!registry || selected === null) return;
        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            const tx = await registry.vote(pollId, selected, 0);
            await tx.wait();
            await fetchVoteStatus();
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
            await fetchVoteStatus();
            showToast('投票を取り消しました');
        } catch (err: any) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        } finally {
            setTxPending(false);
        }
    };

    if (loading) {
        return (
            <section className="flex flex-col items-center gap-4 mt-10">
                <LoadingSpinner size="lg" className="py-8" />
                <p className="text-center text-gray-600">投票状況を読み込み中...</p>
            </section>
        );
    }

    // 現在が投票期間内かどうかを判定
    const now = Math.floor(Date.now() / 1000);
    const inPeriod =
        pollData.startTime !== 0 && now >= pollData.startTime && now <= pollData.endTime;

    return (
        <section className="flex flex-col items-center gap-4 mt-10">
            <h2 className="text-2xl font-bold">SimpleVote</h2>
            <p className="text-lg">議題: {pollData.topic}</p>
            <p>
                開始:{' '}
                {pollData.startTime ? new Date(pollData.startTime * 1000).toLocaleString() : '-'}
            </p>
            <p>
                終了: {pollData.endTime ? new Date(pollData.endTime * 1000).toLocaleString() : '-'}
            </p>

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
    );
}
