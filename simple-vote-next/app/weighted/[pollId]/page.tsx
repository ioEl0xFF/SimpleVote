'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/components/WalletProvider';
import App from '@/components/App';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import { POLL_REGISTRY_ABI, POLL_REGISTRY_ADDRESS, ERC20_ABI, ZERO } from '@/lib/constants';

interface Choice {
    id: number;
    name: string;
    votes: string;
}

// WeightedVote コントラクト用の汎用コンポーネント
function WeightedVote({
    signer,
    pollId,
    showToast,
}: {
    signer: ethers.Signer | null;
    pollId: number;
    showToast: (msg: string) => void;
}) {
    const [registry, setRegistry] = useState<ethers.Contract | null>(null);
    const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);
    const [topic, setTopic] = useState('');
    const [choices, setChoices] = useState<Choice[]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [amount, setAmount] = useState('');
    const [votedId, setVotedId] = useState(0);
    const [txPending, setTxPending] = useState(false);
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);
    const [tokenAddress, setTokenAddress] = useState(ZERO);
    const [loading, setLoading] = useState(true);

    // signer が変わったらコントラクトを初期化
    useEffect(() => {
        if (!signer || POLL_REGISTRY_ADDRESS === ZERO) {
            setLoading(false);
            return;
        }
        const r = new ethers.Contract(POLL_REGISTRY_ADDRESS, POLL_REGISTRY_ABI, signer);
        setRegistry(r);
    }, [signer]);

    // 投票状況を取得
    const fetchData = useCallback(async () => {
        if (!registry || pollId === undefined) return;
        try {
            setLoading(true);
            const [, , , topic, startTime, endTime, choiceNames, voteCounts, tokenAddr] =
                await registry.getPoll(pollId);
            setTopic(topic);
            setStart(Number(startTime));
            setEnd(Number(endTime));
            setTokenAddress(tokenAddr);

            const arr: Choice[] = choiceNames.map((name: string, idx: number) => ({
                id: idx + 1,
                name: name,
                votes: ethers.formatEther(voteCounts[idx]), // 18 桁精度を Ether 表記に変換
            }));
            setChoices(arr);

            if (signer) {
                const addr = await signer.getAddress();
                const id = await registry.getVotedChoiceId(pollId, addr);
                setVotedId(Number(id));
            }

            // トークンコントラクトの初期化
            if (tokenAddr !== ZERO && !tokenContract) {
                const tok = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
                setTokenContract(tok);
            }
        } catch (err: any) {
            console.error('Failed to fetch poll data:', err);
            showToast(`エラー: ${err.shortMessage ?? err.message}`);
        } finally {
            setLoading(false);
        }
    }, [registry, pollId, signer, showToast, tokenContract]);

    // 初期化とイベント購読
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

    // トークンの承認
    const approve = async () => {
        if (!tokenContract || !amount || tokenAddress === ZERO) return;
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

    // コントラクトが未設定なら簡易メッセージを表示
    if (POLL_REGISTRY_ADDRESS === ZERO || pollId === undefined) {
        return (
            <section className="flex flex-col items-center gap-4 mt-10">
                <h2 className="text-2xl font-bold">WeightedVote DApp</h2>
                <p>PollRegistry コントラクトアドレスが未設定か、Poll ID が無効です</p>
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

    // 現在が投票期間内かどうか
    const now = Math.floor(Date.now() / 1000);
    const inPeriod = start !== 0 && now >= start && now <= end;

    return (
        <section className="flex flex-col items-center gap-4 mt-10">
            <h2 className="text-2xl font-bold">WeightedVote DApp</h2>
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
                    min="0"
                    placeholder="トークン量"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border px-2 py-1 rounded"
                    disabled={votedId !== 0}
                />
                <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-green-500 text-white disabled:opacity-50"
                    onClick={approve}
                    disabled={
                        !amount || selected === null || votedId !== 0 || tokenAddress === ZERO
                    }
                >
                    Approve
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

// 動的ルーティングページコンポーネント
export default function WeightedVotePage({ params }: { params: { pollId: string } }) {
    const { signer, showToast } = useWallet();
    const router = useRouter();
    const pollId = Number(params.pollId);

    // pollIdが無効な場合の処理
    if (isNaN(pollId) || pollId <= 0) {
        return (
            <App>
                <PageHeader
                    title="Weighted Vote"
                    breadcrumbs={[
                        { label: 'Weighted Vote', href: '/weighted' },
                        { label: `ID: ${params.pollId}` },
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
                title="Weighted Vote"
                breadcrumbs={[
                    { label: 'Weighted Vote', href: '/weighted' },
                    { label: `ID: ${pollId}` },
                ]}
            />
            <WeightedVote signer={signer} pollId={pollId} showToast={showToast} />
        </App>
    );
}
