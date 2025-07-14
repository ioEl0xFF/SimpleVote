'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    const handleResetKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            reset();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
                <div className="flex justify-center mb-4">
                    <ExclamationTriangleIcon
                        className="w-16 h-16 text-red-500"
                        aria-hidden="true"
                    />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">エラーが発生しました</h1>
                <p className="text-gray-600 mb-6">
                    予期しないエラーが発生しました。もう一度お試しください。
                </p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={reset}
                        onKeyDown={handleResetKeyDown}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-colors"
                        aria-label="エラーをリセットして再試行する"
                        type="button"
                        tabIndex={0}
                    >
                        再試行
                    </button>
                    <Link
                        href="/"
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-600 transition-colors"
                        aria-label="ホームページに戻る"
                        tabIndex={0}
                    >
                        ホームに戻る
                    </Link>
                </div>
            </div>
        </div>
    );
}
