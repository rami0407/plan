'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

// Tag Input Component for Group Level
const TagInput = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) => {
    const [inputValue, setInputValue] = useState('');

    const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputValue.trim()) {
                const newTags = [...tags, inputValue.trim()];
                onChange(newTags.join(', '));
                setInputValue('');
            }
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            const newTags = tags.slice(0, -1);
            onChange(newTags.join(', '));
        }
    };

    const removeTag = (indexToRemove: number) => {
        const newTags = tags.filter((_, index) => index !== indexToRemove);
        onChange(newTags.join(', '));
    };

    return (
        <div className="flex flex-wrap gap-2 p-2 border-2 border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-400 transition-all min-h-[50px]">
            {tags.map((tag, index) => (
                <span key={index} className="bg-blue-100 text-blue-800 text-sm font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                    {tag}
                    <button onClick={() => removeTag(index)} className="hover:text-blue-600 font-bold">×</button>
                </span>
            ))}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-grow outline-none bg-transparent min-w-[120px]"
                placeholder={tags.length === 0 ? placeholder : ''}
            />
        </div>
    );
};

export default function InterventionPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [managerFeedback, setManagerFeedback] = useState('');

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<string>('2026');
    const years = Array.from({ length: 15 }, (_, i) => (2026 + i).toString());

    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSection, setSelectedSection] = useState('');

    const grades = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
    const sections = ['1', '2', '3', '4']; // الشعب

    const handleSaveFeedback = async () => {
        if (!managerFeedback.trim()) return;
        if (!effectiveCoordinatorId) {
            alert('لا يمكن إرسال الملاحظات: هوية المركز غير معروفة');
            return;
        }

        try {
            const { createNotification } = await import('@/lib/firestoreService');

            // Create Notification for the Coordinator
            await createNotification({
                recipientId: effectiveCoordinatorId,
                title: 'ملاحظات مدير المدرسة',
                message: `قام المدير بإضافة تعقيب على خطة التدخل (${selectedYear}) الخاصة بطلابك (${selectedGrade} شعبه ${selectedSection}): "${managerFeedback.substring(0, 50)}..."`,
                link: `/dashboard/intervention?grade=${selectedGrade}&section=${selectedSection}&year=${selectedYear}`,
                type: 'intervention_update',
                senderName: 'الإدارة',
                senderRole: 'principal'
            });

            // Ideally we should also save the feedback string to a "Feedback" collection or update the Plan document.
            // For now, the notification serves as the delivery mechanism.

            setManagerFeedback('');
            alert('✅ تم إرسال الملاحظات للمركز بنجاح');
        } catch (error) {
            console.error('Error sending notification:', error);
            alert('❌ حدث خطأ أثناء الإرسال');
        }
    };

    const searchParams = useSearchParams();
    // In a real app, we might check if user is admin before allowing query param override. 
    // For now, if param exists, use it (Principal view), else use logged-in user (Coordinator view).
    const paramCoordinatorId = searchParams.get('coordinatorId');
    const paramYear = searchParams.get('year');
    const effectiveCoordinatorId = paramCoordinatorId || user?.uid;

    useEffect(() => {
        if (paramYear) {
            setSelectedYear(paramYear);
        }
    }, [paramYear]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Intervention Plans State
    // We store the Firestore Document ID for each level if it exists, to know whether to update or add.
    const [docIds, setDocIds] = useState<{ individual?: string, group?: string, class?: string }>({});

    const [interventionPlans, setInterventionPlans] = useState<{
        individual: any[],
        group: any[],
        class: any[]
    }>({
        individual: [],
        group: [],
        class: []
    });

    useEffect(() => {
        // Automatically select distinct if available in URL or just load
        // But for now, we wait for user selection or select defaults?
        // Let's just create empty state.
        if (effectiveCoordinatorId && selectedGrade && selectedSection) {
            loadPlans();
        } else {
            // Reset plans if selection is incomplete
            setInterventionPlans({
                individual: [createEmptyRow()],
                group: [createEmptyRow()],
                class: [createEmptyRow()]
            });
            setDocIds({});
            setLoading(false);
        }
    }, [effectiveCoordinatorId, selectedGrade, selectedSection, selectedYear]);

    const loadPlans = async () => {
        try {
            setLoading(true);
            const { getInterventionPlans } = await import('@/lib/firestoreService');
            // Fetch ALL plans for this coordinator
            const allPlans = await getInterventionPlans(effectiveCoordinatorId!);

            // Filter for current Grade/Section AND Year
            const plans = allPlans.filter((p: any) => {
                const sameGrade = p.grade === selectedGrade;
                const sameSection = p.section === selectedSection;
                // Backward compatibility: if p.year is undefined, assume '2026' or treat as current context if user selects 2026
                // For simplified logic: match p.year if exists, else match if selectedYear is 2026 (assuming old data is for 2026)
                const planYear = p.year || '2026';
                const sameYear = planYear === selectedYear;

                return sameGrade && sameSection && sameYear;
            });

            const newPlans = {
                individual: [] as any[],
                group: [] as any[],
                class: [] as any[]
            };
            const newDocIds: any = {};

            plans.forEach(plan => {
                if (plan.level && newPlans[plan.level as keyof typeof newPlans]) {
                    newPlans[plan.level as keyof typeof newPlans] = plan.students || [];
                    newDocIds[plan.level] = plan.id;
                }
            });

            // If empty, initialize with one empty row for UI
            if (newPlans.individual.length === 0) newPlans.individual.push(createEmptyRow());
            if (newPlans.group.length === 0) newPlans.group.push(createEmptyRow());
            if (newPlans.class.length === 0) newPlans.class.push(createEmptyRow());

            setInterventionPlans(newPlans);
            setDocIds(newDocIds);
        } catch (error) {
            console.error('Error loading plans:', error);
            alert('خطأ في تحميل الخطط');
        } finally {
            setLoading(false);
        }
    };

    const createEmptyRow = () => ({
        id: Date.now().toString() + Math.random().toString(), // Temp ID for UI key
        studentName: '',
        currentGrade: '',
        targetGoal: '',
        assessmentMethod: '',
        notes: ''
    });

    const handleSavePlans = async () => {
        if (!effectiveCoordinatorId) {
            alert('لا يمكن الحفظ: لم يتم التعرف على هوية المركز');
            return;
        }

        if (!selectedGrade || !selectedSection) {
            alert('الرجاء اختيار الصف والشعبة قبل الحفظ');
            return;
        }

        try {
            setSaving(true);
            const { addInterventionPlan, updateInterventionPlan } = await import('@/lib/firestoreService');

            // Save each level
            const levels = ['individual', 'group', 'class'] as const;

            for (const level of levels) {
                const rows = interventionPlans[level].filter(r => r.studentName.trim() !== ''); // Filter out empty rows

                const planData: any = {
                    coordinatorId: effectiveCoordinatorId,
                    level: level,
                    grade: selectedGrade,
                    section: selectedSection,
                    year: selectedYear, // Checking this field
                    students: rows
                };

                if (docIds[level]) {
                    // Update existing document
                    await updateInterventionPlan(docIds[level]!, planData);
                } else if (rows.length > 0) {
                    // Create new document only if there's data
                    const newId = await addInterventionPlan(planData);
                    setDocIds(prev => ({ ...prev, [level]: newId }));
                }
            }

            alert(`✅ تم حفظ خطة التدخل للصف ${selectedGrade} شعبة ${selectedSection} (סنة ${selectedYear}) بنجاح`);
        } catch (error) {
            console.error('Error saving plans:', error);
            alert('❌ حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const handleSendToPrincipal = async () => {
        if (!effectiveCoordinatorId) return;
        setSaving(true);
        try {
            // First save
            await handleSavePlans();

            const { createNotification } = await import('@/lib/firestoreService');
            await createNotification({
                recipientId: 'admin',
                title: `تقديم خطة التدخل (${selectedYear})`,
                message: `قام ${user?.displayName || 'المركز'} بتقديم خطة التدخل (${selectedYear}) الخاصة به للمراجعة.`,
                link: `/dashboard/intervention?coordinatorId=${effectiveCoordinatorId}&year=${selectedYear}`,
                type: 'plan_submission',
                senderName: user?.displayName || 'Coordinator',
                senderRole: 'coordinator'
            });
            alert('🚀 تم إرسال الخطة للمدير بنجاح');
        } catch (e) {
            console.error(e);
            alert('خطأ في الإرسال');
        } finally {
            setSaving(false);
        }
    };

    const addInterventionRow = (level: 'individual' | 'group' | 'class') => {
        setInterventionPlans({
            ...interventionPlans,
            [level]: [...interventionPlans[level], createEmptyRow()]
        });
    };

    const updateInterventionRow = (level: 'individual' | 'group' | 'class', id: string, field: string, value: string) => {
        setInterventionPlans({
            ...interventionPlans,
            [level]: interventionPlans[level].map(row =>
                row.id === id ? { ...row, [field]: value } : row
            )
        });
    };

    const deleteInterventionRow = (level: 'individual' | 'group' | 'class', id: string) => {
        setInterventionPlans({
            ...interventionPlans,
            [level]: interventionPlans[level].filter(row => row.id !== id)
        });
    };

    const exportToPDF = () => {
        window.print();
    };

    const inputClass = "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-base font-medium transition-all print:border-0 print:bg-transparent";

    // Tag Input Component for Group Level


    return (
        <div className="min-h-screen dashboard-bg">
            {/* Print-Only Header with Logo */}
            <div className="hidden print:block print:mb-6">
                <div className="text-center">
                    <img
                        src="/plan/school-logo.jpg"
                        alt="School Logo"
                        className="mx-auto mb-4"
                        style={{ maxHeight: '120px', width: 'auto' }}
                    />
                </div>
            </div>

            <div className="container py-8 print:py-4">
                {/* Header */}
                <div className="glass-panel p-6 mb-8 print:border print:border-gray-300 print:shadow-none">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-primary to-primary-dark p-4 rounded-2xl text-white print:bg-gray-800">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="mb-1">خطة التدخل ({selectedYear})</h1>
                                <p className="text-gray-600">نظام متابعة تقدم الطلاب على مستويات مختلفة</p>
                            </div>
                        </div>
                        <button onClick={exportToPDF} className="btn btn-primary px-6 py-3 print:hidden">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            تنزيل PDF
                        </button>
                    </div>
                </div>

                {/* Grade & Section Selectors */}
                <div className="bg-white p-6 mb-8 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-6 items-center print:hidden">
                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-gray-700">السنة الدراسية</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none min-w-[150px] bg-slate-50"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-gray-700">الصف الدراسي</label>
                        <select
                            value={selectedGrade}
                            onChange={(e) => setSelectedGrade(e.target.value)}
                            className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none min-w-[200px]"
                        >
                            <option value="">-- اختر الصف --</option>
                            {grades.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-gray-700">الشعبة / رقم الصف</label>
                        <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none min-w-[200px]"
                        >
                            <option value="">-- اختر الشعبة --</option>
                            {sections.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {selectedGrade && selectedSection && (
                        <div className="mr-auto text-green-600 font-bold flex items-center gap-2 animate-fade-in">
                            <span>✅ جاري عرض خطة: {selectedGrade} {selectedSection} ({selectedYear})</span>
                        </div>
                    )}
                </div>

                {(!selectedGrade || !selectedSection) ? (
                    <div className="p-12 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl mb-8">
                        <h3 className="text-xl font-bold text-gray-500 mb-2">الرجاء اختيار الصف والشعبة أولاً</h3>
                        <p className="text-gray-400">لعرض وتعديل خطة التدخل، يجب تحديد الصف الذي تعمل عليه.</p>
                    </div>
                ) : (
                    /* Intervention Plans Section */
                    <div className="bg-white p-6 mb-8 print:p-4 animate-fade-in">

                        <div className="mb-10">
                            <h3 className="text-2xl font-bold mb-4 text-blue-700">1. خطة تدخل بمستوى الفرد</h3>
                            <div className="border border-gray-400 print:border-black rounded-lg overflow-hidden">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-200 print:bg-white">
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold w-48 text-base">اسم الطالب</th>
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold w-32 text-base">العلامة الحالية</th>
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold text-base">الهدف المرجو تحقيقه</th>
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold text-base">طرق التقييم</th>
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold text-base">ملاحظات</th>
                                            <th className="border border-gray-400 print:hidden w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {interventionPlans.individual.map(row => (
                                            <tr key={row.id} className="hover:bg-blue-50 transition-colors">
                                                <td className="border border-gray-400 print:border-black p-2">
                                                    <input type="text" value={row.studentName} onChange={(e) => updateInterventionRow('individual', row.id, 'studentName', e.target.value)} className={inputClass} placeholder="اسم الطالب..." />
                                                </td>
                                                <td className="border border-gray-400 print:border-black p-2">
                                                    <input type="text" value={row.currentGrade} onChange={(e) => updateInterventionRow('individual', row.id, 'currentGrade', e.target.value)} className={inputClass} placeholder="العلامة..." />
                                                </td>
                                                <td className="border border-gray-400 print:border-black p-2">
                                                    <input type="text" value={row.targetGoal} onChange={(e) => updateInterventionRow('individual', row.id, 'targetGoal', e.target.value)} className={inputClass} placeholder="الهدف..." />
                                                </td>
                                                <td className="border border-gray-400 print:border-black p-2">
                                                    <input type="text" value={row.assessmentMethod} onChange={(e) => updateInterventionRow('individual', row.id, 'assessmentMethod', e.target.value)} className={inputClass} placeholder="طرق التقييم..." />
                                                </td>
                                                <td className="border border-gray-400 print:border-black p-2">
                                                    <input type="text" value={row.notes} onChange={(e) => updateInterventionRow('individual', row.id, 'notes', e.target.value)} className={inputClass} placeholder="ملاحظات..." />
                                                </td>
                                                <td className="border border-gray-400 print:hidden p-2 text-center">
                                                    <button onClick={() => deleteInterventionRow('individual', row.id)} className="text-red-600 hover:text-red-800 text-2xl font-bold hover:bg-red-50 rounded px-2" title="حذف">×</button>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="print:hidden bg-blue-50">
                                            <td colSpan={6} className="border border-gray-400 p-3 text-center">
                                                <button onClick={() => addInterventionRow('individual')} className="text-blue-700 hover:text-blue-900 font-bold text-base">+ إضافة طالب</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Group Level */}
                        <div className="mb-10">
                            <h3 className="text-2xl font-bold mb-4 text-green-700">2. خطة تدخل بمستوى المجموعة</h3>
                            <p className="text-gray-500 mb-2 text-sm">* اضغط Enter لإضافة أكثر من طالب في نفس المجموعة</p>
                            <div className="border border-gray-400 print:border-black rounded-lg overflow-hidden">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-200 print:bg-white">
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold w-64 text-base">أسماء الطلاب (المجموعة)</th>
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold w-32 text-base">العلامة الحالية</th>
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold text-base">الهدف المرجو تحقيقه</th>
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold text-base">طرق التقييم</th>
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold text-base">ملاحظات</th>
                                            <th className="border border-gray-400 print:hidden w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {interventionPlans.group.map(row => (
                                            <tr key={row.id} className="hover:bg-green-50 transition-colors">
                                                <td className="border border-gray-400 print:border-black p-2 align-top">
                                                    <TagInput
                                                        value={row.studentName}
                                                        onChange={(val) => updateInterventionRow('group', row.id, 'studentName', val)}
                                                        placeholder="اكتب الاسم واضغط Enter..."
                                                    />
                                                </td>
                                                <td className="border border-gray-400 print:border-black p-2 align-top">
                                                    <input type="text" value={row.currentGrade} onChange={(e) => updateInterventionRow('group', row.id, 'currentGrade', e.target.value)} className={inputClass} placeholder="العلامة..." />
                                                </td>
                                                <td className="border border-gray-400 print:border-black p-2 align-top">
                                                    <input type="text" value={row.targetGoal} onChange={(e) => updateInterventionRow('group', row.id, 'targetGoal', e.target.value)} className={inputClass} placeholder="الهدف..." />
                                                </td>
                                                <td className="border border-gray-400 print:border-black p-2 align-top">
                                                    <input type="text" value={row.assessmentMethod} onChange={(e) => updateInterventionRow('group', row.id, 'assessmentMethod', e.target.value)} className={inputClass} placeholder="طرق التقييم..." />
                                                </td>
                                                <td className="border border-gray-400 print:border-black p-2 align-top">
                                                    <input type="text" value={row.notes} onChange={(e) => updateInterventionRow('group', row.id, 'notes', e.target.value)} className={inputClass} placeholder="ملاحظات..." />
                                                </td>
                                                <td className="border border-gray-400 print:hidden p-2 text-center align-top">
                                                    <button onClick={() => deleteInterventionRow('group', row.id)} className="text-red-600 hover:text-red-800 text-2xl font-bold hover:bg-red-50 rounded px-2" title="حذف">×</button>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="print:hidden bg-green-50">
                                            <td colSpan={6} className="border border-gray-400 p-3 text-center">
                                                <button onClick={() => addInterventionRow('group')} className="text-green-700 hover:text-green-900 font-bold text-base">+ إضافة مجموعة</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Class Level */}
                        <div className="mb-10">
                            <h3 className="text-2xl font-bold mb-4 text-purple-700">3. خطة تدخل بمستوى الصف</h3>
                            <div className="border border-gray-400 print:border-black rounded-lg overflow-hidden">
                                <table className="w-full border-collapse">
                                    {/* ... existing table code ... */}
                                    <thead>
                                        <tr className="bg-gray-200 print:bg-white">
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold w-48 text-base">الصف / الشعبة</th>
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold w-32 text-base">المستوى الحالي</th>
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold text-base">الهدف المرجو تحقيقه للصف</th>
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold text-base">استراتيجيات العمل</th>
                                            <th className="border border-gray-400 print:border-black p-3 text-right font-bold text-base">ملاحظات</th>
                                            <th className="border border-gray-400 print:hidden w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {interventionPlans.class.map(row => (
                                            <tr key={row.id} className="hover:bg-purple-50 transition-colors">
                                                <td className="border border-gray-400 print:border-black p-2">
                                                    <input type="text" value={row.studentName} onChange={(e) => updateInterventionRow('class', row.id, 'studentName', e.target.value)} className={inputClass} placeholder="مثال: الخامس أ" />
                                                </td>
                                                <td className="border border-gray-400 print:border-black p-2">
                                                    <input type="text" value={row.currentGrade} onChange={(e) => updateInterventionRow('class', row.id, 'currentGrade', e.target.value)} className={inputClass} placeholder="المستوى العام..." />
                                                </td>
                                                <td className="border border-gray-400 print:border-black p-2">
                                                    <input type="text" value={row.targetGoal} onChange={(e) => updateInterventionRow('class', row.id, 'targetGoal', e.target.value)} className={inputClass} placeholder="هدف الصف..." />
                                                </td>
                                                <td className="border border-gray-400 print:border-black p-2">
                                                    <input type="text" value={row.assessmentMethod} onChange={(e) => updateInterventionRow('class', row.id, 'assessmentMethod', e.target.value)} className={inputClass} placeholder="الاستراتيجيات..." />
                                                </td>
                                                <td className="border border-gray-400 print:border-black p-2">
                                                    <input type="text" value={row.notes} onChange={(e) => updateInterventionRow('class', row.id, 'notes', e.target.value)} className={inputClass} placeholder="ملاحظات..." />
                                                </td>
                                                <td className="border border-gray-400 print:hidden p-2 text-center">
                                                    <button onClick={() => deleteInterventionRow('class', row.id)} className="text-red-600 hover:text-red-800 text-2xl font-bold hover:bg-red-50 rounded px-2" title="حذف">×</button>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="print:hidden bg-purple-50">
                                            <td colSpan={6} className="border border-gray-400 p-3 text-center">
                                                <button onClick={() => addInterventionRow('class')} className="text-purple-700 hover:text-purple-900 font-bold text-base">+ إضافة صف</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>


                    </div>
                )}

                {/* Manager Feedback Section */}
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 mb-8 print:border-black print:bg-white">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">📝</span>
                        <h3 className="text-2xl font-bold text-amber-800">ملاحظات المدير / الطاقم الإداري</h3>
                    </div>
                    {user?.email === 'rami0407@gmail.com' || user?.email === 'admin@school.edu' ? (
                        <>
                            <textarea
                                value={managerFeedback}
                                onChange={(e) => setManagerFeedback(e.target.value)}
                                className="w-full min-h-[120px] p-4 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white text-lg font-medium resize-y mb-4"
                                placeholder="اكتب ملاحظاتك وتوجيهاتك للمركّز هنا..."
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveFeedback}
                                    className="btn bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 flex items-center gap-2"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                    حفظ وإرسال تعقيب للمركّز
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white/50 p-4 rounded-lg border border-amber-100 min-h-[80px]">
                            {managerFeedback ? (
                                <p className="text-lg text-gray-800 whitespace-pre-wrap">{managerFeedback}</p>
                            ) : (
                                <p className="text-gray-400 italic">لا توجد ملاحظات من المدير بعد...</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Bar */}
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white p-5 rounded-2xl shadow-2xl border-3 border-primary/20 flex gap-4 z-50 print:hidden">
                    <button onClick={() => router.back()} className="btn btn-ghost px-6 py-3 text-lg">
                        إلغاء
                    </button>
                    <button
                        onClick={handleSendToPrincipal}
                        disabled={saving}
                        className="btn bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg disabled:opacity-50 flex items-center gap-2 shadow-lg"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"></path><path d="M22 2L15 22L11 13L2 9L22 2Z"></path></svg>
                        إرسال للمدير
                    </button>
                    <button
                        onClick={handleSavePlans}
                        disabled={saving}
                        className="btn btn-primary px-8 py-3 text-lg disabled:opacity-50 flex items-center gap-2 shadow-lg"
                    >
                        {saving && <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>}
                        {saving ? 'جارٍ الحفظ...' : 'حفظ خطة التدخل'}
                    </button>
                </div>
            </div>
        </div>
    );
}
