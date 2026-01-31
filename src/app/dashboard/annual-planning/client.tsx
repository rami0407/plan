'use client';

import { useState, useEffect } from 'react';
import { generateAcademicYearMonths, type MonthPlan } from '@/lib/academicCalendar';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import AIAssistant from '@/components/AIAssistant';

export default function AnnualPlanningClient() {
    const [months, setMonths] = useState<MonthPlan[]>([]);
    const [sending, setSending] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showAI, setShowAI] = useState(false);
    const planId = '2025'; // Fixed ID for the 2025-2026 plan for now

    useEffect(() => {
        const loadPlan = async () => {
            try {
                // Try to fetch existing plan
                const docRef = doc(db, 'annualPlans', planId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setMonths(docSnap.data().months as MonthPlan[]);
                } else {
                    // Generate new if not exists
                    setMonths(generateAcademicYearMonths(2025));
                }
            } catch (error) {
                console.error('Error loading plan:', error);
                setMonths(generateAcademicYearMonths(2025)); // Fallback
            }
        };

        loadPlan();
    }, []);

    const updateWeekField = (monthIndex: number, weekIndex: number, field: string, value: any) => {
        setMonths(prev => prev.map((m, mi) =>
            mi === monthIndex
                ? { ...m, weeks: m.weeks.map((w, wi) => wi === weekIndex ? { ...w, [field]: value } : w) }
                : m
        ));
    };

    const handleDownload = () => {
        window.print();
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'annualPlans', planId), {
                months: months,
                updatedAt: Date.now()
            });
            alert('✅ تم حفظ الخطة بنجاح');
        } catch (error) {
            console.error('Error saving plan:', error);
            alert('❌ حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const handleSendToManager = async () => {
        // First save the plan to ensure Manager sees latest
        await handleSave();

        setSending(true);
        try {
            // Create Notification for the Principal/Manager
            await addDoc(collection(db, 'notifications'), {
                userId: 'manager-id',
                title: 'خطة سنوية جديدة',
                message: 'قام المركّز بإرسال الخطة السنوية للمراجعة.',
                read: false,
                createdAt: Date.now(),
                link: '/dashboard/annual-planning',
                type: 'SYSTEM'
            });

            // Also adding one for the current user just to see it in the demo if they are testing
            await addDoc(collection(db, 'notifications'), {
                userId: 'coordinator-id',
                title: 'تم الإرسال بنجاح',
                message: 'تم إرسال الخطة السنوية للمدير بنجاح.',
                read: false,
                createdAt: Date.now(),
                link: '/dashboard/annual-planning',
                type: 'SYSTEM'
            });

            alert('✅ تم إرسال الخطة للمدير بنجاح');
        } catch (error) {
            console.error('Error sending plan:', error);
            alert('❌ حدث خطأ أثناء الإرسال');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="animate-fade-in pb-10">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black mb-2">التخطيط السنوي</h1>
                    <p className="text-gray-500 text-lg">توزيع المواد والفعاليات على أشهر السنة</p>
                </div>
                <div className="flex gap-3 print:hidden">
                    <button
                        onClick={() => setShowAI(true)}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2 animate-pulse"
                    >
                        <span>✨</span> مساعد التخطيط
                    </button>
                    <button
                        onClick={handleDownload}
                        className="btn btn-ghost border-2 border-gray-300 hover:border-gray-800 hover:bg-gray-50 flex items-center gap-2"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        تنزيل (PDF)
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn btn-outline border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-2 flex items-center gap-2"
                    >
                        {saving ? 'جاري الحفظ...' : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                حفظ
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleSendToManager}
                        disabled={sending}
                        className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                    >
                        {sending ? (
                            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        )}
                        إرسال للمدير
                    </button>
                </div>
            </div>

            {showAI && (
                <AIAssistant
                    onClose={() => setShowAI(false)}
                    context={{ months, planId }}
                    pageTitle="مساعد التخطيط السنوي"
                    suggestions={[
                        { label: 'توزيع مواضيع', prompt: 'اقترح توزيعاً منطقياً لمواضيع اللغة العربية على مدار الفصل الأول.', icon: '📚' },
                        { label: 'تحسين الجدول', prompt: 'راجع الجدول الحالي واقترح تحسينات لفعاليات شهر ديسمبر.', icon: '📅' }
                    ]}
                />
            )}

            {/* Annual Planning Section (Detailed) */}
            <div className="glass-panel p-8 mb-8 print:border print:border-gray-300 print:shadow-none">
                <div className="space-y-12">
                    {months.map((month, monthIndex) => (
                        <div key={monthIndex} className="bg-white border-2 border-primary/10 rounded-xl overflow-hidden print:break-inside-avoid shadow-sm">
                            {/* Month Header */}
                            <div className="p-4 bg-primary/5 border-b border-primary/10 flex justify-between items-center">
                                <h3 className="font-black text-xl text-primary">{month.monthName} / {month.monthNameArabic}</h3>
                                <div className="text-sm text-gray-500 font-bold">{month.weeks.length} أسابيع</div>
                            </div>

                            {/* Month Content Table */}
                            <div className="p-0">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-sm">
                                            <th className="p-3 border-b text-right font-bold w-48 text-gray-600">الأسبوع / التاريخ</th>
                                            <th className="p-3 border-b text-right font-bold text-gray-600">المحتوى / الفعاليات</th>
                                            <th className="p-3 border-b text-right font-bold w-40 text-gray-600">حالة التنفيذ</th>
                                            <th className="p-3 border-b text-right font-bold w-64 text-gray-600">ملاحظات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {month.weeks.map((week, weekIndex) => (
                                            <tr key={weekIndex} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-3 border-b align-top bg-gray-50/30">
                                                    <div className="font-bold text-gray-800">الأسبوع {week.weekNumber}</div>
                                                    <div className="text-xs text-gray-500 mt-1 ltr font-mono" dir="ltr">{week.dateRange}</div>
                                                </td>
                                                <td className="p-3 border-b align-top">
                                                    <textarea
                                                        value={week.content || ''}
                                                        onChange={(e) => updateWeekField(monthIndex, weekIndex, 'content', e.target.value)}
                                                        className="w-full min-h-[80px] p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y text-sm bg-transparent print:border-none print:resize-none"
                                                        placeholder="اكتب التخطيط الاسبوعي..."
                                                    />
                                                </td>
                                                <td className="p-3 border-b align-top">
                                                    <select
                                                        value={week.status || 'not-started'}
                                                        onChange={(e) => updateWeekField(monthIndex, weekIndex, 'status', e.target.value)}
                                                        className={`w-full p-2 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary print:appearance-none print:border-none outline-none
                                                            ${week.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' :
                                                                week.status === 'partial' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                                                    'bg-red-100 text-red-600 border-red-300'}`}
                                                    >
                                                        <option value="not-started" className="text-red-600">لم يتم (أحمر)</option>
                                                        <option value="partial" className="text-yellow-700">جزئي (أصفر)</option>
                                                        <option value="completed" className="text-green-700">تم كاملاً (أخضر)</option>
                                                    </select>
                                                </td>
                                                <td className="p-3 border-b align-top">
                                                    <textarea
                                                        value={week.notes || ''}
                                                        onChange={(e) => updateWeekField(monthIndex, weekIndex, 'notes', e.target.value)}
                                                        className="w-full min-h-[80px] p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y text-sm bg-transparent print:border-none print:resize-none"
                                                        placeholder="ملاحظات عامة..."
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
