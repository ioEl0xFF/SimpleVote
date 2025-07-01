import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
                <div className="flex justify-center mb-4">
                    <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    404 - ページが見つかりません
                </h1>
                <p className="text-gray-600 mb-6">
                    お探しのページは存在しないか、移動された可能性があります。
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    ホームに戻る
                </Link>
            </div>
        </div>
    );
}
