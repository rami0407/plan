'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
    const { user } = useAuth();
    const displayName = user?.displayName || user?.email?.split('@')[0] || 'المعلم';

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="mb-2">مرحباً بك، {displayName} 👋</h1>
                <p className="text-gray-500 text-lg">نظرة عامة على نشاطاتك اليومية</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Classes */}
                <Link href="/dashboard/classes" className="glass-panel p-6 hover:shadow-xl transition-all group border-2 border-transparent hover:border-primary/20">
                    <div className="flex flex-col items-center text-center p-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">الصفوف المدرسية</h3>
                        <p className="text-gray-500 text-sm">إدارة الطلاب، الحضور والغياب، والبيانات الصفية</p>
                    </div>
                </Link>

                {/* 2. Work Plans */}
                <Link href="/dashboard/planning" className="glass-panel p-6 hover:shadow-xl transition-all group border-2 border-transparent hover:border-purple/20">
                    <div className="flex flex-col items-center text-center p-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" x2="8" y1="13" y2="13" />
                                <line x1="16" x2="8" y1="17" y2="17" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">خطط العمل</h3>
                        <p className="text-gray-500 text-sm">بناء الخطط السنوية، الأهداف، والمهام</p>
                    </div>
                </Link>

                {/* 3. Intervention Plans */}
                <Link href="/dashboard/intervention" className="glass-panel p-6 hover:shadow-xl transition-all group border-2 border-transparent hover:border-pink/20">
                    <div className="flex flex-col items-center text-center p-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-pink-500/30 group-hover:scale-110 transition-transform">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">خطط التدخل</h3>
                        <p className="text-gray-500 text-sm">متابعة الطلاب المتعثرين وخطط الدعم الفردية</p>
                    </div>
                </Link>

                {/* 4. Protocols */}
                <Link href="/dashboard/protocols" className="glass-panel p-6 hover:shadow-xl transition-all group border-2 border-transparent hover:border-green/20">
                    <div className="flex flex-col items-center text-center p-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-green-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">البروتوكلات</h3>
                        <p className="text-gray-500 text-sm">توثيق الجلسات والاجتماعات الرسمية</p>
                    </div>
                </Link>

                {/* 5. Analytics */}
                <Link href="/dashboard/analytics" className="glass-panel p-6 hover:shadow-xl transition-all group border-2 border-transparent hover:border-amber/20">
                    <div className="flex flex-col items-center text-center p-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" x2="18" y1="20" y2="10" />
                                <line x1="12" x2="12" y1="20" y2="4" />
                                <line x1="6" x2="6" y1="20" y2="14" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">التحليلات والاحصائيات</h3>
                        <p className="text-gray-500 text-sm">تقارير بيانية عن الأداء والتقدم</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
