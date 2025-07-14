'use client';

import { useEffect } from 'react';

interface ToastProps {
    message: string;
    onClose: () => void;
}

// シンプルなトースト表示用コンポーネント
function Toast({ message, onClose }: ToastProps) {
    // 自動的に 3 秒後に閉じる
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    return (
        <div
            className="toast bg-white border border-gray-200 rounded-lg shadow-lg p-4 mb-2 max-w-sm"
            role="alert"
            aria-live="assertive"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            aria-label={`通知: ${message}`}
        >
            {message}
        </div>
    );
}

export default Toast;
