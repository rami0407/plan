'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/contexts/LanguageContext';

// 18 Classes
const CLASSES = [
    { id: 'class-1', name: 'الصف الأول أ', grade: 1 },
    { id: 'class-2', name: 'الصف الأول ب', grade: 1 },
    { id: 'class-3', name: 'الصف الثاني أ', grade: 2 },
    { id: 'class-4', name: 'الصف الثاني ب', grade: 2 },
    { id: 'class-5', name: 'الصف الثالث أ', grade: 3 },
    { id: 'class-6', name: 'الصف الثالث ب', grade: 3 },
    { id: 'class-7', name: 'الصف الرابع أ', grade: 4 },
    { id: 'class-8', name: 'الصف الرابع ب', grade: 4 },
    { id: 'class-9', name: 'الصف الخامس أ', grade: 5 },
    { id: 'class-10', name: 'الصف الخامس ب', grade: 5 },
    { id: 'class-11', name: 'الصف السادس أ', grade: 6 },
    { id: 'class-12', name: 'الصف السادس ب', grade: 6 },
    { id: 'class-13', name: 'الصف السابع أ', grade: 7 },
    { id: 'class-14', name: 'الصف السابع ب', grade: 7 },
    { id: 'class-15', name: 'الصف الثامن أ', grade: 8 },
    { id: 'class-16', name: 'الصف الثامن ب', grade: 8 },
    { id: 'class-17', name: 'الصف التاسع أ', grade: 9 },
    { id: 'class-18', name: 'الصف التاسع ب', grade: 9 },
];

// Generate years from 2026 to 2040
const YEARS = Array.from({ length: 15 }, (_, i) => 2026 + i);

export default function ClassesClient() {
    const router = useRouter();
    const { t } = useTranslation();
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Load last selection from localStorage
    useEffect(() => {
        const savedYear = localStorage.getItem('lastSelectedYear');
        if (savedYear) setSelectedYear(Number(savedYear));
    }, []);

    const handleClassClick = (classId: string) => {
        // Save year selection
        localStorage.setItem('lastSelectedYear', selectedYear.toString());

        // Navigate to class page
        router.push(`/dashboard/classes/${classId}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-4xl font-black text-gray-800 flex items-center gap-3">
                                <span className="text-5xl">📚</span>
                                {t('school_classes_system')}
                            </h1>
                            <p className="text-gray-600 mt-2 text-lg">{t('classes_system_desc')}</p>
                        </div>
                        <Link
                            href="/dashboard"
                            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl transition-all font-bold text-gray-700"
                        >
                            ← {t('back_to_home')}
                        </Link>
                    </div>

                    {/* Year Dropdown */}
                    <div className="flex items-center gap-4">
                        <label className="text-gray-700 font-bold">📅 {t('school_year')}</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="px-6 py-3 bg-white border-2 border-blue-300 rounded-xl font-bold text-gray-800 shadow-lg hover:border-blue-500 focus:border-blue-600 focus:outline-none transition-colors cursor-pointer"
                        >
                            {YEARS.map(year => (
                                <option key={year} value={year}>
                                    {year} - {year + 1}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Classes Grid */}
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span>🎓</span>
                        {t('select_class')}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {CLASSES.map(cls => (
                            <button
                                key={cls.id}
                                onClick={() => handleClassClick(cls.id)}
                                className="p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all transform hover:scale-105 shadow-md hover:shadow-xl cursor-pointer"
                            >
                                <div className="text-center">
                                    <div className="text-4xl mb-3">📖</div>
                                    <div className="font-bold text-gray-800 text-base">{t(cls.name)}</div>
                                    <div className="text-xs text-gray-500 mt-2">{t('click_to_enter')}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-blue-500">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-4xl">📊</span>
                            <h3 className="font-bold text-gray-800">{t('editor_power')}</h3>
                        </div>
                        <p className="text-gray-600 text-sm">
                            {t('editor_power_desc')}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-4xl">🤖</span>
                            <h3 className="font-bold text-gray-800">{t('smart_analysis')}</h3>
                        </div>
                        <p className="text-gray-600 text-sm">
                            {t('smart_analysis_desc')}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-4xl">📈</span>
                            <h3 className="font-bold text-gray-800">{t('auto_comparison')}</h3>
                        </div>
                        <p className="text-gray-600 text-sm">
                            {t('auto_comparison_desc')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
