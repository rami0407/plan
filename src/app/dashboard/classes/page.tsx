'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getClasses, addClass, addStudent } from '@/lib/firestoreService';
import { mockClasses, mockStudents, mockTeachers } from '@/lib/mockData';
import { ClassGroup } from '@/lib/types';

export default function ClassesPage() {
    const [classes, setClasses] = useState<ClassGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [migrating, setMigrating] = useState(false);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const availableYears = Array.from({ length: 2041 - 2024 }, (_, i) => 2024 + i);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const data = await getClasses();
            setClasses(data);
        } catch (error) {
            console.error('Failed to fetch classes', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMigrate = async () => {
        if (!confirm('سيتم نقل البيانات التجريبية إلى قاعدة البيانات. هل أنت متأكد؟')) return;

        setMigrating(true);
        try {
            // Migrate Classes
            for (const cls of mockClasses) {
                await addClass(cls);
            }

            // Migrate Students
            for (const student of mockStudents) {
                // @ts-ignore
                await addStudent(student);
            }

            alert('✅ تم نقل البيانات بنجاح!');
            fetchClasses();
        } catch (error) {
            console.error('Migration failed:', error);
            alert('❌ حدث خطأ أثناء النقل.');
        } finally {
            setMigrating(false);
        }
    };

    if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;

    return (
        <div className="animate-fade-in">
            <div className="mb-8 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="mb-2 text-3xl font-black text-gray-800">الصفوف الدراسية 📚</h1>
                    <p className="text-gray-500 text-lg">اختر الصف لإدخال وتحديث البيانات الهولستية للطلاب</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-primary mb-1">السنة الدراسية</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-gray-50 border-2 border-primary/20 rounded-xl px-4 py-2 font-bold text-primary focus:border-primary outline-none transition-all cursor-pointer"
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year} / {year + 1}</option>
                            ))}
                        </select>
                    </div>
                    {classes.length === 0 && (
                        <button
                            onClick={handleMigrate}
                            disabled={migrating}
                            className="btn btn-primary"
                        >
                            {migrating ? 'جاري النقل...' : '📥 استيراد البيانات التجريبية'}
                        </button>
                    )}
                </div>
            </div>

            {classes.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 mb-4">لا توجد صفوف مضافة بعد.</p>
                </div>
            ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                    {classes.map((cls) => (
                        <Link href={`/dashboard/classes/view?id=${cls.id}&year=${selectedYear}`} key={cls.id || Math.random()} className="block group">
                            <div className="glass-panel p-6 relative overflow-hidden h-full">
                                {/* الزخرفة */}
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[var(--primary)] to-[var(--secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />

                                {/* الأيقونة */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                                        {cls.grade}
                                    </div>
                                    <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">#{cls.id}</div>
                                </div>

                                {/* المحتوى */}
                                <h3 className="text-xl font-bold mb-3 text-gray-800">{cls.name}</h3>
                                <div className="flex items-center gap-2 text-gray-600 mb-4">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <span className="text-sm font-medium">
                                        {mockTeachers.find(t => t.id === cls.homeroomTeacherId)?.name || 'غير محدد'}
                                    </span>
                                </div>

                                {/* الزر */}
                                <div className="flex items-center text-primary text-sm font-bold gap-2 group-hover:gap-3 transition-all mt-auto pt-4 border-t border-gray-100">
                                    <span>فتح بيانات {selectedYear}</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
                                        <line x1="5" x2="19" y1="12" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
