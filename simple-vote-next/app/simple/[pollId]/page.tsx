import { notFound } from 'next/navigation';
import App from '@/components/App';
import PageHeader from '@/components/PageHeader';
import SimpleVoteClient from '@/components/SimpleVoteClient';
import { fetchPollData } from '@/lib/poll-data';

// SimpleVote ページコンポーネント
export default async function SimpleVotePage({ params }: { params: Promise<{ pollId: string }> }) {
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
                    title="Simple Vote"
                    breadcrumbs={[
                        { label: 'Simple Vote', href: '/simple' },
                        { label: `ID: ${pollIdNum}` },
                    ]}
                />
                <SimpleVoteClient pollData={pollData} pollId={pollIdNum} />
            </App>
        );
    } catch (error) {
        // データフェッチに失敗した場合も404を表示
        notFound();
    }
}
