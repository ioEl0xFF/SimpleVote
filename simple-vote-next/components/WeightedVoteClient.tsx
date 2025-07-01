'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/components/WalletProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import { POLL_REGISTRY_ABI, POLL_REGISTRY_ADDRESS, ERC20_ABI, ZERO } from '@/lib/constants';
import { PollData } from '@/lib/poll-data';

interface Choice {
    id: number;
    name: string;
    votes: string;
}

interface WeightedVoteClientProps {
    pollData: PollData;
    pollId: number;
}

export default function WeightedVoteClient({ pollData, pollId }: WeightedVoteClientProps) {
    const { signer, showToast } = useWallet();
    const [registry, setRegistry] = useState<ethers.Contract | null>(null);
    const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);
    const [choices, setChoices] = useState<Choice[]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [amount, setAmount] = useState('');
    const [votedId, setVotedId] = useState(0);
    const [txPending, setTxPending] = useState(false);
    const [loading, setLoading] = useState(false);

    // 初期データの設定
    useEffect(() => {
        const arr: Choice[] = pollData.choiceNames.map((name: string, idx: number) => ({
            id: idx + 1,
            name: name,
            votes: ethers.formatEther(pollData.voteCounts[idx].toString()), // 18 桁精度を Ether 表記に変換
        }));
        setChoices(arr);
    }, [pollData]);

    // ウォレット接続時のコントラクト初期化
    useEffect(() => {
        if (!signer) {
            return;
        }
        const r = new ethers.Contract(POLL_REGISTRY_ADDRESS, POLL_REGISTRY_ABI, signer);
        setRegistry(r);

        // トークンコントラクトの初期化
        if (pollData.tokenAddress && pollData.tokenAddress !== ZERO) {
            const tok = new ethers.Contract(pollData.tokenAddress, ERC20_ABI, signer);
            setTokenContract(tok);
        }
    }, [signer, pollData.tokenAddress]);

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

    // トークンの承認
    const approve = async () => {
        if (!tokenContract || !amount || !pollData.tokenAddress || pollData.tokenAddress === ZERO)
            return;
        const value = ethers.parseEther(amount);
        showToast('トランザクション承認待ち…');
        try {
            const tx = await tokenContract.approve(POLL_REGISTRY_ADDRESS, value);
            await tx.wait();
            showToast('承認が完了しました');
        } catch (err: any) {
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        }
    };

    // 投票処理
    const vote = async () => {
        if (!registry || selected === null || !amount) return;
        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');
            const value = ethers.parseEther(amount);
            const tx = await registry.vote(pollId, selected, value);
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
            <h2 className="text-2xl font-bold">WeightedVote DApp</h2>
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
                    placeholder="投票量"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={votedId !== 0}
                    className="px-4 py-2 border rounded-xl"
                />
                <button
                    type="button"
                    onClick={approve}
                    disabled={!tokenContract || !amount || votedId !== 0}
                    className="px-4 py-2 rounded-xl bg-green-500 text-white disabled:opacity-50"
                >
                    承認
                </button>
                <button
                    className="px-4 py-2 rounded-xl bg-blue-500 text-white disabled:opacity-50"
                    disabled={
                        txPending || selected === null || !amount || votedId !== 0 || !inPeriod
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
        </section>
    );
}
