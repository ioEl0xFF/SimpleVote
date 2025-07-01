'use client';

import { useEffect } from 'react';

interface ToastProps {
    message: string;
    onClose: () => void;
    type?: 'success' | 'error' | 'info';
}

// シンプルなトースト表示用コンポーネント
function Toast({ message, onClose, type = 'info' }: ToastProps) {
    // 自動的に 3 秒後に閉じる
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const toastClasses = {
        success: 'toast toast-success',
        error: 'toast toast-error',
        info: 'toast toast-info',
    };

    return (
        <div className={toastClasses[type]} data-testid="toast">
            {message}
        </div>
    );
}

export default Toast;
