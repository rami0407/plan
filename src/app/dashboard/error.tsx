'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Dashboard Error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
            <div className="bg-red-50 text-red-600 p-4 rounded-full mb-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12" y2="16"></line>
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">عذراً، حدث خطأ ما!</h2>
            <p className="text-gray-600 mb-6 max-w-md">
                واجهنا مشكلة في تحميل محتوى لوحة التحكم.
                <br />
                <span className="text-sm text-red-500 dir-ltr block mt-2 font-mono bg-red-50 p-2 rounded">
                    {error.message}
                </span>
            </p>
            <button
                onClick={reset}
                className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
                محاولة مرة أخرى
            </button>
        </div>
    );
}
