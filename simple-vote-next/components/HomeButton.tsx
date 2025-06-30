'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface HomeButtonProps {
    className?: string;
}

export default function HomeButton({ className = '' }: HomeButtonProps) {
    return (
        <Link
            href="/"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors ${className}`}
        >
            <ArrowLeftIcon className="w-4 h-4" />
            ホームに戻る
        </Link>
    );
}
