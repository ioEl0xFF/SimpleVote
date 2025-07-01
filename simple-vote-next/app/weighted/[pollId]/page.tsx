import { notFound } from 'next/navigation';
import App from '@/components/App';
import PageHeader from '@/components/PageHeader';
import WeightedVoteClient from '@/components/WeightedVoteClient';
import { fetchPollData } from '@/lib/poll-data';

// 動的ルーティングページコンポーネント
export default async function WeightedVotePage({
    params,
}: {
    params: Promise<{ pollId: string }>;
}) {
    const { pollId } = await params;
    const pollIdNum = Number(pollId);

    // pollIdが無効な場合の処理
    if (isNaN(pollIdNum) || pollIdNum <= 0) {
        notFound();
    }

    try {
        // サーバー側でデータフェッチ
        const pollData = await fetchPollData(pollIdNum);

        return (
            <App>
                <PageHeader
                    title="Weighted Vote"
                    breadcrumbs={[
                        { label: 'Weighted Vote', href: '/weighted' },
                        { label: `ID: ${pollIdNum}` },
                    ]}
                />
                <WeightedVoteClient pollData={pollData} pollId={pollIdNum} />
            </App>
        );
    } catch (error) {
        // データフェッチに失敗した場合も404を表示
        notFound();
    }
}
