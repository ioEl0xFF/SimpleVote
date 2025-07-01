import { ethers } from 'ethers';
import { POLL_REGISTRY_ABI, POLL_REGISTRY_ADDRESS } from './constants';

export interface PollData {
    id: number;
    topic: string;
    startTime: number;
    endTime: number;
    choiceNames: string[];
    voteCounts: number[];
    tokenAddress?: string;
}

export async function fetchPollData(pollId: number): Promise<PollData> {
    try {
        // サーバー側でプロバイダーを作成
        const provider = new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
        );
        const registry = new ethers.Contract(POLL_REGISTRY_ADDRESS, POLL_REGISTRY_ABI, provider);

        // ポールデータを取得
        const [, , , topic, startTime, endTime, choiceNames, voteCounts, tokenAddress] =
            await registry.getPoll(pollId);

        return {
            id: pollId,
            topic,
            startTime: Number(startTime),
            endTime: Number(endTime),
            choiceNames,
            voteCounts: voteCounts.map((count: any) => Number(count)),
            tokenAddress: tokenAddress || undefined,
        };
    } catch (error) {
        console.error('Failed to fetch poll data:', error);
        throw new Error('ポールデータの取得に失敗しました');
    }
}
