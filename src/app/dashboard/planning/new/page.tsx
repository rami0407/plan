'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewPlanPage() {
    const router = useRouter();
    const [subject, setSubject] = useState('الرياضيات');
    const [month, setMonth] = useState('1');
    const [weeks, setWeeks] = useState([{ id: 1, content: '' }]);

    const addWeek = () => {
        setWeeks([...weeks, { id: weeks.length + 1, content: '' }]);
    };

    const handleWeekChange = (id: number, content: string) => {
        setWeeks(weeks.map(w => w.id === id ? { ...w, content } : w));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert('✅ تم تقديم الخطة بنجاح!');
        router.push('/dashboard/planning');
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="mb-2">إنشاء خطة عمل جديدة ✨</h1>
                <p className="text-gray-500 text-lg">قم بملء التفاصيل أدناه لإنشاء خطة دراسية شهرية</p>
            </div>

            <form onSubmit={handleSubmit} className="glass-panel p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold mb-3 text-gray-700">الموضوع الدراسي</label>
                        <select
                            className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        >
                            <option value="الرياضيات">الرياضيات</option>
                            <option value="العلوم">العلوم</option>
                            <option value="اللغة العربية">اللغة العربية</option>
                            <option value="اللغة العبرية">اللغة العبرية</option>
                            <option value="اللغة الإنجليزية">اللغة الإنجليزية</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-3 text-gray-700">الشهر</label>
                        <select
                            className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                        >
                            {['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'].map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] rounded-lg">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" x2="16" y1="2" y2="6" />
                                <line x1="8" x2="8" y1="2" y2="6" />
                                <line x1="3" x2="21" y1="10" y2="10" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold">التخطيط الأسبوعي</h3>
                    </div>

                    {weeks.map((week, idx) => (
                        <div key={week.id} className="p-5 border-2 border-primary/20 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 hover:border-primary/40 transition-all">
                            <label className="block text-sm font-bold mb-3 text-gray-700 flex items-center gap-2">
                                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">{idx + 1}</span>
                                الأسبوع {idx + 1}
                            </label>
                            <textarea
                                className="w-full p-4 border-2 border-gray-200 rounded-xl h-28 bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium resize-none"
                                placeholder="اكتب ما سيتم تدريسه خلال هذا الأسبوع..."
                                value={week.content}
                                onChange={(e) => handleWeekChange(week.id, e.target.value)}
                                required
                            />
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addWeek}
                        className="w-full p-4 border-2 border-dashed border-primary/40 rounded-xl text-primary font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" x2="12" y1="5" y2="19" />
                            <line x1="5" x2="19" y1="12" y2="12" />
                        </svg>
                        إضافة أسبوع آخر
                    </button>
                </div>

                <div className="pt-6 border-t-2 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="btn btn-ghost border-2 border-gray-300"
                    >
                        إلغاء
                    </button>
                    <button type="submit" className="btn btn-primary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        حفظ وإرسال للموافقة
                    </button>
                </div>
            </form>
        </div>
    );
}
