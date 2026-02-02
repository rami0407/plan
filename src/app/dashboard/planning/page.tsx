'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AIAssistant from '@/components/AIAssistant';

// Dynamic year calculation
const getCurrentYear = () => new Date().getFullYear();
const MIN_YEAR = 2023;
const MAX_YEAR = 2040;
const CURRENT_YEAR = getCurrentYear();

// Generate array of years for dropdown
const generateYearRange = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

const ALL_YEARS = generateYearRange(MIN_YEAR, MAX_YEAR);
// Show current year and next 2 years as cards
const FEATURED_YEARS = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2].filter(y => y <= MAX_YEAR);

const mockPlans = [
    { year: 2026, status: 'DRAFT', lastModified: '2026-01-20' },
    { year: 2025, status: 'APPROVED', lastModified: '2025-12-15' },
];

export default function PlanningPage() {
    const router = useRouter();
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
    const [showAI, setShowAI] = useState(false);
    const [showYearSelector, setShowYearSelector] = useState(false);

    const currentPlan = mockPlans.find(p => p.year === selectedYear);

    return (
        <div className="animate-fade-in min-h-screen">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-2xl shadow-xl">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" x2="16" y1="2" y2="6" />
                            <line x1="8" x2="8" y1="2" y2="6" />
                            <line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="mb-1">خطط العمل السنوية</h1>
                        <p className="text-gray-500 text-lg">نظام إدارة وتخطيط العمل السنوي للمركزين</p>
                    </div>
                    <div className="mr-auto">
                        <button
                            onClick={() => setShowAI(true)}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold shadow-xl hover:scale-105 transition-all flex items-center gap-2 animate-pulse"
                        >
                            <span>✨</span> مساعد التخطيط الذكي
                        </button>
                    </div>
                </div>
            </div>

            {showAI && (
                <AIAssistant
                    onClose={() => setShowAI(false)}
                    context={{ selectedYear, mockPlans, currentPlan }}
                    pageTitle="مساعد التخطيط"
                    suggestions={[
                        { label: 'اقتراح أهداف', prompt: 'اقترح 5 أهداف سنوية رئيسية لمركز تربوي بناءً على السنة الحالية.', icon: '🎯' },
                        { label: 'تحسين الخطة', prompt: 'كيف يمكنني تحسين كفاءة خطة العمل السنوية؟', icon: '📈' }
                    ]}
                />
            )}

            {/* Year Selector Card */}
            <div className="glass-panel p-8 mb-8 relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)]"></div>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                        <span className="text-3xl">📅</span>
                        اختر السنة الدراسية
                    </h2>
                    <p className="text-gray-600">قم باختيار السنة لعرض أو تعديل خطة العمل الخاصة بها</p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    {FEATURED_YEARS.map(year => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`p-6 rounded-2xl font-bold text-xl transition-all transform hover:scale-105 ${selectedYear === year
                                ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white shadow-2xl scale-105'
                                : 'bg-white border-3 border-gray-200 text-gray-700 hover:border-primary shadow-md'
                                }`}
                        >
                            <div className="text-sm opacity-75 mb-1">السنة الدراسية</div>
                            <div className="text-2xl font-black">{year}</div>
                            <div className="text-sm opacity-75 mt-1">/ {year + 1}</div>
                        </button>
                    ))}
                </div>

                {/* Year Selector Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowYearSelector(!showYearSelector)}
                        className="w-full p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl font-bold text-blue-700 hover:border-blue-400 transition-all flex items-center justify-center gap-2"
                    >
                        <span>📆</span>
                        اختر سنة أخرى ({MIN_YEAR} - {MAX_YEAR})
                        <svg className={`w-5 h-5 transition-transform ${showYearSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showYearSelector && (
                        <div className="absolute z-50 w-full mt-2 bg-gradient-to-b from-blue-50 to-white rounded-2xl shadow-2xl border-4 border-blue-300 max-h-96 overflow-y-auto">
                            <div className="p-5 grid grid-cols-3 gap-4">
                                {ALL_YEARS.map(year => (
                                    <button
                                        key={year}
                                        onClick={() => {
                                            setSelectedYear(year);
                                            setShowYearSelector(false);
                                        }}
                                        className={`p-5 rounded-xl font-bold text-xl transition-all border-2 ${selectedYear === year
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl scale-110 border-blue-800'
                                            : 'bg-white text-blue-800 border-blue-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 hover:text-white hover:scale-105 hover:shadow-lg hover:border-blue-500'
                                            }`}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Current Plan Card */}
            {currentPlan ? (
                <div className="glass-panel p-8 mb-8 relative overflow-hidden group hover:shadow-2xl transition-shadow">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--primary)]/10 to-transparent rounded-full -mr-16 -mt-16"></div>

                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" x2="8" y1="13" y2="13" />
                                    <line x1="16" x2="8" y1="17" y2="17" />
                                </svg>
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-black">خطة العمل {selectedYear}</h2>
                                    <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-md ${currentPlan.status === 'APPROVED'
                                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                                        : currentPlan.status === 'SUBMITTED'
                                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                                            : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800'
                                        }`}>
                                        {currentPlan.status === 'APPROVED' ? '✅ معتمدة ومعتمدة' :
                                            currentPlan.status === 'SUBMITTED' ? '⏳ قيد المراجعة' : '📝 مسودة'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    <span className="text-sm">آخر تحديث: {currentPlan.lastModified}</span>
                                </div>
                            </div>
                        </div>

                        <Link
                            href={`/dashboard/planning/edit/${selectedYear}`}
                            className="btn btn-primary text-lg px-8 py-4 shadow-xl hover:shadow-2xl"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            عرض وتعديل الخطة
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="glass-panel p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--secondary)]/5"></div>

                    <div className="relative z-10">
                        <div className="inline-block p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6">
                            <div className="text-7xl">📋</div>
                        </div>

                        <h3 className="text-3xl font-bold mb-3">لا توجد خطة للعام {selectedYear}</h3>
                        <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                            ابدأ الآن بإنشاء خطة عمل جديدة أو قم باستيراد خطة من عام سابق لتعديلها وإعادة استخدامها
                        </p>

                        <div className="flex gap-4 justify-center">
                            <Link
                                href={`/dashboard/planning/edit/${selectedYear}`}
                                className="btn btn-primary text-lg px-8 py-4 shadow-xl"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="12" x2="12" y1="5" y2="19" />
                                    <line x1="5" x2="19" y1="12" y2="12" />
                                </svg>
                                إنشاء خطة جديدة
                            </Link>

                            {mockPlans.length > 0 && (
                                <button className="btn btn-ghost border-3 border-primary text-lg px-8 py-4 hover:bg-primary hover:text-white">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" x2="12" y1="15" y2="3" />
                                    </svg>
                                    استيراد من عام سابق
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Previous Years */}
            {mockPlans.filter(p => p.year !== selectedYear).length > 0 && (
                <div className="glass-panel p-8">
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <span className="text-2xl">📚</span>
                        خطط السنوات السابقة
                    </h3>

                    <div className="grid gap-4">
                        {mockPlans.filter(p => p.year !== selectedYear).map(plan => (
                            <div
                                key={plan.year}
                                className="p-6 bg-gradient-to-r from-white to-gray-50 rounded-xl border-2 border-gray-100 hover:border-primary flex items-center justify-between transition-all hover:shadow-lg group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl group-hover:from-primary/10 group-hover:to-primary/20 transition-colors">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                            <line x1="16" x2="16" y1="2" y2="6" />
                                            <line x1="8" x2="8" y1="2" y2="6" />
                                        </svg>
                                    </div>

                                    <div>
                                        <span className="font-bold text-xl">خطة {plan.year} / {plan.year + 1}</span>
                                        <span className={`mr-3 px-3 py-1 rounded-full text-xs font-bold ${plan.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {plan.status === 'APPROVED' ? '✅ معتمدة' : '📝 مسودة'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedYear(plan.year)}
                                    className="text-primary font-bold hover:underline flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
                                >
                                    عرض التفاصيل
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="5" x2="19" y1="12" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
