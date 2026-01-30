'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html dir="rtl">
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gray-50">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">خطأ غير متوقع (System Error)</h2>
                    <p className="text-gray-700 mb-4">حدث خطأ جسيم منع التطبيق من العمل.</p>
                    <code className="bg-gray-200 p-4 rounded block mb-6 text-left dir-ltr overflow-auto max-w-2xl">
                        {error.message}
                    </code>
                    <button
                        onClick={() => reset()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-bold"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </body>
        </html>
    );
}
