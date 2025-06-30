'use client';

import HomeButton from './HomeButton';
import Breadcrumb from './Breadcrumb';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    breadcrumbs?: BreadcrumbItem[];
    showHomeButton?: boolean;
    className?: string;
}

export default function PageHeader({
    title,
    breadcrumbs = [],
    showHomeButton = true,
    className = '',
}: PageHeaderProps) {
    return (
        <div className={`mb-6 ${className}`}>
            {breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} className="mb-4" />}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {showHomeButton && <HomeButton />}
            </div>
        </div>
    );
}
