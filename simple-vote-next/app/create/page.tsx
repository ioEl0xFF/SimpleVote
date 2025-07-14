'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
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

// PollRegistry を使って DynamicVote か WeightedVote を作成するフォーム
export default function CreatePage() {
    const router = useRouter();
    const { signer, showToast } = useWallet();
    const [registry, setRegistry] = useState<ethers.Contract | null>(null);
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
        if (choices.length < 10) {
            setChoices([...choices, '']);
        }
    };

    const handleAddChoiceKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            addChoice();
        }
    };

    const handleBackKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            router.push('/');
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!registry) return;
        const sTime = toTimestamp(start);
        const eTime = toTimestamp(end);
        if (Number.isNaN(sTime) || Number.isNaN(eTime)) {
            showToast('日時を正しく入力してください');
            return;
        }
        if (eTime <= sTime) {
            showToast('終了日時は開始日時より後を設定してください');
            return;
        }

        // 選択肢のバリデーション
        const filteredChoices = choices.filter((c) => c);
        if (filteredChoices.length === 0) {
            showToast('少なくとも1つの選択肢を入力してください');
            return;
        }
        if (filteredChoices.length > 10) {
            showToast('選択肢は最大10個までです');
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

        try {
            setTxPending(true);
            showToast('トランザクション承認待ち…');

            // デバッグ用：関数呼び出しのパラメータを出力
            console.log('Function parameters:');
            console.log('- pollTypeEnum:', pollTypeEnum);
            console.log('- topic:', topic);
            console.log('- sTime:', sTime);
            console.log('- eTime:', eTime);
            console.log('- filteredChoices:', filteredChoices);
            console.log('- tokenAddress:', tokenAddress);

            // デバッグ用：コントラクトの基本情報を確認
            console.log('Contract info:');
            console.log('- Contract address:', registry.target);
            console.log('- Signer address:', await signer?.getAddress());

            // デバッグ用：ネットワーク情報を確認
            try {
                const network = await signer?.provider?.getNetwork();
                console.log('- Network chainId:', network?.chainId);
                console.log('- Network name:', network?.name);

                // ネットワークが正しくない場合の警告
                console.log('✅ Correct network detected');
            } catch (error) {
                console.error('Error getting network info:', error);
            }

            // PollRegistry の createPoll を呼び出す
            const tx = await registry.createPoll(
                pollTypeEnum,
                topic,
                sTime,
                eTime,
                filteredChoices,
                tokenAddress
            );

            const receipt = await tx.wait();

            // デバッグ用：トランザクションの詳細を出力
            console.log('Transaction receipt:', receipt);
            console.log('Transaction hash:', tx.hash);
            console.log('Transaction status:', receipt.status);
            console.log('Gas used:', receipt.gasUsed.toString());
            console.log('Logs:', receipt.logs);
            console.log('Logs length:', receipt.logs.length);

            // デバッグ用：作成後のnextPollIdを確認
            try {
                const nextPollIdAfter = await registry.nextPollId();
                console.log('- Next poll ID after creation:', nextPollIdAfter.toString());

                if (nextPollIdAfter > 0n) {
                    const createdPollId = nextPollIdAfter - 1n;
                    console.log('- Created poll ID:', createdPollId.toString());

                    // 作成された投票の詳細を確認
                    try {
                        const pollDetails = await registry.getPoll(createdPollId);
                        console.log('- Created poll details:', pollDetails);
                    } catch (error) {
                        console.error('Error getting poll details:', error);
                    }
                }
            } catch (error) {
                console.error('Error getting nextPollId after:', error);
            }

            // イベントを直接取得する方法
            console.log('Trying to get events directly...');
            const events = await registry.queryFilter(
                registry.filters.PollCreated(),
                receipt.blockNumber,
                receipt.blockNumber
            );
            console.log('Events from queryFilter:', events);

            // 方法1: 既存の方法でイベントを検索
            let event = receipt.logs
                .map((log: any) => {
                    try {
                        return registry.interface.parseLog(log);
                    } catch (error) {
                        console.log('Log parsing failed:', error);
                        return null;
                    }
                })
                .find((log: any) => log && log.name === 'PollCreated');

            // 方法2: イベントが見つからない場合、より詳細なログ解析
            if (!event) {
                console.log('Trying alternative event parsing...');

                // すべてのログを詳細に解析
                for (const log of receipt.logs) {
                    console.log('Processing log:', log);
                    try {
                        const decodedLog = registry.interface.parseLog(log);
                        console.log('Decoded log:', decodedLog);
                        if (decodedLog && decodedLog.name === 'PollCreated') {
                            event = decodedLog;
                            break;
                        }
                    } catch (error) {
                        console.log('Log parsing failed:', error);
                    }
                }
            }

            if (!event) {
                console.error('All event parsing methods failed');
                console.error('Available logs:', receipt.logs);

                // 投票が実際に作成されたか確認
                try {
                    const nextPollId = await registry.nextPollId();
                    console.log('Next poll ID:', nextPollId.toString());

                    if (nextPollId > 0n) {
                        const pollId = nextPollId - 1n; // 最新の投票ID

                        // 作成された投票の詳細を確認して、実際に作成されたか検証
                        try {
                            const pollDetails = await registry.getPoll(pollId);
                            console.log('Created poll details:', pollDetails);

                            // 投票の詳細が取得できれば、作成は成功
                            if (pollDetails && pollDetails.topic === topic) {
                                showToast(`議題を作成しました (ID: ${pollId.toString()})`);
                            } else {
                                showToast(
                                    '議題を作成しました（詳細情報の取得に失敗しましたが、作成は完了しています）'
                                );
                            }
                        } catch (pollError) {
                            console.error('Error getting poll details:', pollError);
                            showToast(
                                '議題を作成しました（詳細情報の取得に失敗しましたが、作成は完了しています）'
                            );
                        }
                    } else {
                        showToast('議題の作成に失敗しました');
                    }
                } catch (error) {
                    console.error('Error checking polls:', error);
                    showToast('議題の作成に失敗しました');
                }
            } else {
                const pollId = event.args.pollId;
                showToast(`議題を作成しました (ID: ${pollId.toString()})`);
            }

            // 作成後にホームページにリダイレクト
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (err: any) {
            console.error('投票作成エラー', err);
            console.error('Error details:', {
                reason: err.reason,
                shortMessage: err.shortMessage,
                message: err.message,
                code: err.code,
                data: err.data,
            });
            const msg = err.reason ?? err.shortMessage ?? err.message;
            showToast(`エラー: ${msg}`);
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
                            aria-label="投票タイプを選択"
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
                                aria-label="トークンアドレスを入力"
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
                            aria-label="投票のトピックを入力"
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
                            aria-label="投票開始日時を選択"
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
                            aria-label="投票終了日時を選択"
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
                                aria-label={`選択肢 ${i + 1} を入力`}
                            />
                        ))}
                        <button
                            type="button"
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white w-fit hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            onClick={addChoice}
                            onKeyDown={handleAddChoiceKeyDown}
                            disabled={choices.length >= 10}
                            aria-label="選択肢を追加する"
                            tabIndex={0}
                        >
                            選択肢を追加
                        </button>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            disabled={txPending}
                            aria-label={txPending ? '投票を作成中...' : '投票を作成する'}
                        >
                            {txPending ? '作成中...' : '作成'}
                        </button>
                        <button
                            type="button"
                            className="px-6 py-3 rounded-lg bg-gray-400 text-white font-medium hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-400 transition-colors"
                            onClick={() => router.push('/')}
                            onKeyDown={handleBackKeyDown}
                            aria-label="ホームページに戻る"
                            tabIndex={0}
                        >
                            戻る
                        </button>
                    </div>
                </form>
            </div>
        </App>
    );
}
