'use client';

import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
    return (
        <nav className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`}>
            <Link
                href="/"
                className="flex items-center gap-1 hover:text-gray-900 transition-colors"
            >
                <HomeIcon className="w-4 h-4" />
                ホーム
            </Link>
            {items.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                    <ChevronRightIcon className="w-4 h-4" />
                    {item.href ? (
                        <Link href={item.href} className="hover:text-gray-900 transition-colors">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-900 font-medium">{item.label}</span>
                    )}
                </div>
            ))}
        </nav>
    );
}
