import { useEffect } from 'react';

// シンプルなトースト表示用コンポーネント
function Toast({ message, onClose }) {
    // 自動的に 3 秒後に閉じる
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="toast">
            {message}
        </div>
    );
}

export default Toast;
