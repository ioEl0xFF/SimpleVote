import { notFound } from 'next/navigation';
import App from '@/components/App';
import PageHeader from '@/components/PageHeader';
import DynamicVoteClient from '@/components/DynamicVoteClient';
import { fetchPollData } from '@/lib/poll-data';

// 動的ルーティングページコンポーネント
export default async function DynamicVotePage({ params }: { params: Promise<{ pollId: string }> }) {
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
                    title="Dynamic Vote"
                    breadcrumbs={[
                        { label: 'Dynamic Vote', href: '/dynamic' },
                        { label: `ID: ${pollIdNum}` },
                    ]}
                />
                <DynamicVoteClient pollData={pollData} pollId={pollIdNum} />
            </App>
        );
    } catch (error) {
        // データフェッチに失敗した場合も404を表示
        notFound();
    }
}
