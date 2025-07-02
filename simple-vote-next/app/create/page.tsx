'use client';

import { useEffect, useState } from 'react';
// import { ethers } from 'ethers'; // 削除
import { useRouter } from 'next/navigation';
import { useWallet } from '@/components/WalletProvider';
import App from '@/components/App';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
    POLL_REGISTRY_ABI,
    POLL_REGISTRY_ADDRESS,
    MOCK_ERC20_ADDRESS,
    ZERO,
} from '@/lib/constants';

// ethersの取得を動的に行う
const getEthers = () => {
    if (typeof window !== 'undefined' && (window as any).ethers) {
        return (window as any).ethers;
    }
    // フォールバック: 本物のethers.js
    return require('ethers');
};

// PollRegistry を使って DynamicVote か WeightedVote を作成するフォーム
export default function CreatePage() {
    const router = useRouter();
    const { signer, showToast } = useWallet();
    const [registry, setRegistry] = useState<any>(null);
    const [pollType, setPollType] = useState('dynamic');
    const [topic, setTopic] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [token, setToken] = useState(MOCK_ERC20_ADDRESS);
    const [choices, setChoices] = useState(['', '']);
    const [txPending, setTxPending] = useState(false);
    const [loading, setLoading] = useState(true);

    // signer から PollRegistry を初期化
    useEffect(() => {
        if (!signer) {
            setLoading(false);
            return;
        }

        const ethers = getEthers();

        // ステップ1.1: モック使用状況確認のログ追加
        console.log('Current ethers object:', typeof ethers);
        console.log('Current ethers.Contract:', typeof ethers.Contract);
        console.log('Is mock applied?', ethers.isMock);
        console.log('Window.ethers:', (window as any).ethers);
        console.log('Window.mockEthers:', (window as any).mockEthers);

        const r = new ethers.Contract(POLL_REGISTRY_ADDRESS, POLL_REGISTRY_ABI, signer);
        setRegistry(r);
        setLoading(false);
    }, [signer]);

    // ページ読み込み時に現在日時を開始日時に設定
    useEffect(() => {
        const now = new Date();

        // ユーザーのローカルタイムゾーンでの現在時刻を取得
        const localTime = new Date();

        // datetime-local入力用のフォーマット（YYYY-MM-DDTHH:MM）
        const formatLocalDateTime = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        // 現在時刻を開始時刻として設定
        setStart(formatLocalDateTime(localTime));

        // 終了時刻は開始時刻から1時間後
        const endTime = new Date(localTime.getTime() + 3600000);
        setEnd(formatLocalDateTime(endTime));
    }, []);

    // 入力された日時を UNIX タイムに変換
    const toTimestamp = (value: string) => {
        return Math.floor(new Date(value).getTime() / 1000);
    };

    // 指定したインデックスの選択肢を更新
    const updateChoice = (idx: number, value: string) => {
        setChoices((prev) => {
            const arr = [...prev];
            arr[idx] = value;
            return arr;
        });
    };

    // 選択肢を追加（最大10件）
    const addChoice = () => {
        setChoices((prev) => (prev.length < 10 ? [...prev, ''] : prev));
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();

        const ethers = getEthers();

        console.log('=== SUBMIT FUNCTION START ===');
        console.log('ethers object:', typeof ethers);
        console.log('ethers.isMock:', ethers.isMock);
        console.log('signer:', signer);

        if (!ethers || !signer) {
            showToast('ウォレットが接続されていません');
            return;
        }

        const s = toTimestamp(start);
        const eTime = toTimestamp(end);

        if (Number.isNaN(s) || Number.isNaN(eTime)) {
            showToast('日時を正しく入力してください');
            return;
        }
        if (eTime <= s) {
            showToast('終了日時は開始日時より後を設定してください');
            return;
        }

        let tokenAddress = ZERO;
        let pollTypeEnum: number;

        if (pollType === 'weighted') {
            if (!token || !ethers.isAddress(token)) {
                showToast('トークンアドレスを正しく入力してください');
                return;
            }
            tokenAddress = token;
            pollTypeEnum = 1; // PollType.WEIGHTED_VOTE
        } else if (pollType === 'dynamic') {
            pollTypeEnum = 0; // PollType.DYNAMIC_VOTE
        } else if (pollType === 'simple') {
            pollTypeEnum = 2; // PollType.SIMPLE_VOTE
        } else {
            showToast('無効な投票タイプです');
            return;
        }

        setTxPending(true);
        showToast('トランザクション承認待ち…');

        try {
            console.log('=== CREATING CONTRACT INSTANCE ===');
            const registry = new ethers.Contract(POLL_REGISTRY_ADDRESS, POLL_REGISTRY_ABI, signer);
            console.log('Registry contract instance:', registry);
            console.log('Registry constructor:', registry.constructor.name);

            const filteredChoices = choices.filter((c) => c);

            console.log('=== CALLING CREATE POLL ===');
            console.log('Calling createPoll with params:', {
                pollTypeEnum,
                topic,
                s,
                eTime,
                filteredChoices,
                tokenAddress,
            });

            // トランザクションの送信
            const tx = await registry.createPoll(
                pollTypeEnum,
                topic,
                s,
                eTime,
                filteredChoices,
                tokenAddress
            );

            console.log('=== TRANSACTION RECEIVED ===');
            console.log('Transaction object received:', tx);
            console.log('Transaction hash:', tx.hash);
            console.log('Transaction wait method:', typeof tx.wait);

            // トランザクション完了の待機
            console.log('=== WAITING FOR TRANSACTION ===');
            const receipt = await tx.wait();
            console.log('Transaction confirmed:', receipt);
            console.log('Receipt events:', receipt.events);

            // イベントの処理
            console.log('=== PROCESSING EVENTS ===');
            console.log('Receipt events:', receipt.events);
            console.log('Events type:', typeof receipt.events);
            console.log('Events length:', receipt.events?.length);

            if (receipt.events) {
                console.log('=== SEARCHING FOR POLL CREATED EVENT ===');
                const pollCreatedEvent = receipt.events.find((event: any) => {
                    console.log('Checking event:', event);
                    console.log('Event event property:', event.event);
                    console.log('Event event === PollCreated:', event.event === 'PollCreated');
                    return event.event === 'PollCreated';
                });

                console.log('Found PollCreated event:', pollCreatedEvent);

                if (pollCreatedEvent) {
                    const pollId = pollCreatedEvent.args.pollId.toString();
                    console.log('Poll ID extracted:', pollId);
                    console.log('=== SHOWING SUCCESS TOAST ===');
                    showToast('議題を作成しました');

                    console.log('=== SCHEDULING REDIRECT ===');
                    setTimeout(() => {
                        console.log('=== EXECUTING REDIRECT ===');
                        console.log('Redirecting to:', `/simple/${pollId}`);
                        router.push(`/simple/${pollId}`);
                    }, 2000);
                } else {
                    console.log('PollCreated event not found');
                }
            } else {
                console.log('No events in receipt');
            }
        } catch (error) {
            console.error('=== ERROR IN POLL CREATION ===');
            console.error('Error:', error);
            console.error('Error stack:', (error as Error).stack);
            console.error('Error name:', (error as Error).name);
            console.error('Error message:', (error as Error).message);

            showToast('エラーが発生しました');
        } finally {
            setTxPending(false);
        }
    };

    if (loading) {
        return (
            <App>
                <PageHeader title="議題作成" breadcrumbs={[{ label: '議題作成' }]} />
                <LoadingSpinner size="lg" className="py-8" />
                <p className="text-center text-gray-600">読み込み中...</p>
            </App>
        );
    }

    return (
        <App>
            <PageHeader title="議題作成" breadcrumbs={[{ label: '議題作成' }]} />
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <form className="flex flex-col gap-4" onSubmit={submit}>
                    <label className="flex flex-col gap-2">
                        <span className="font-medium">投票タイプ</span>
                        <select
                            className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={pollType}
                            onChange={(e) => setPollType(e.target.value)}
                        >
                            <option value="dynamic">Dynamic Vote</option>
                            <option value="weighted">Weighted Vote</option>
                            <option value="simple">Simple Vote</option>
                        </select>
                    </label>

                    {pollType === 'weighted' && (
                        <label className="flex flex-col gap-2">
                            <span className="font-medium">トークンアドレス</span>
                            <input
                                className="border border-gray-300 px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                required
                                placeholder="0x..."
                            />
                        </label>
                    )}

                    <label className="flex flex-col gap-2">
                        <span className="font-medium">トピック</span>
                        <input
                            className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            required
                            placeholder="投票のトピックを入力してください"
                        />
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="font-medium">開始日時</span>
                        <input
                            type="datetime-local"
                            className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={start}
                            onChange={(e) => setStart(e.target.value)}
                            required
                        />
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="font-medium">終了日時</span>
                        <input
                            type="datetime-local"
                            className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={end}
                            onChange={(e) => setEnd(e.target.value)}
                            required
                        />
                    </label>

                    <div className="flex flex-col gap-3">
                        <span className="font-medium">選択肢</span>
                        {choices.map((c, i) => (
                            <input
                                key={i}
                                className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={c}
                                onChange={(e) => updateChoice(i, e.target.value)}
                                required={i < 2}
                                placeholder={`選択肢 ${i + 1}`}
                            />
                        ))}
                        <button
                            type="button"
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white w-fit hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={addChoice}
                            disabled={choices.length >= 10}
                        >
                            選択肢を追加
                        </button>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={txPending}
                        >
                            {txPending ? '作成中...' : '作成'}
                        </button>
                        <button
                            type="button"
                            className="px-6 py-3 rounded-lg bg-gray-400 text-white font-medium hover:bg-gray-500"
                            onClick={() => router.push('/')}
                        >
                            戻る
                        </button>
                    </div>
                </form>
            </div>
        </App>
    );
}
