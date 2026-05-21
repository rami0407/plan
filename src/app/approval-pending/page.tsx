'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function ApprovalPendingPage() {
    const { logout } = useAuth();
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                <div className="text-6xl mb-6">⏳</div>
                <h1 className="text-2xl font-bold mb-4 text-gray-800">حسابك قيد المراجعة</h1>
                <p className="text-gray-600 mb-8 leading-relaxed">
                    شكراً لتسجيلك في منصة مدرسة مشيرفة.
                    <br />
                    طلبك بانتظار موافقة مدير المدرسة. سيتم تفعيل حسابك بمجرد الموافقة عليه.
                </p>
                <div className="space-y-3">
                    <button
                        onClick={() => router.push('/')}
                        className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl hover:bg-primary-dark transition-colors"
                    >
                        تحديث الحالة
                    </button>
                    <button
                        onClick={() => logout()}
                        className="w-full text-gray-500 font-medium py-2 hover:text-gray-700"
                    >
                        تسجيل الخروج
                    </button>
                </div>
            </div>
        </div>
    );
}
