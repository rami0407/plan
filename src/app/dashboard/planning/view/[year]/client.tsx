'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TeachingStaffMember, IntegrationPlan, SchoolProfileRow, BookListRow, AnnualGoal } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { createNotification } from '@/lib/firestoreService';
import AIAssistant from '@/components/AIAssistant';
import { exportPlanToWord } from '@/lib/wordExport';

export default function ReviewPlanClient({ year }: { year: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userId = searchParams.get('userId');

    // Safety check
    if (!userId) {
        return <div className="p-8 text-center text-red-500 font-bold">خطأ: لم يتم تحديد المستخدم المطلوب (userId مفقود).</div>;
    }

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [planData, setPlanData] = useState<any>(null); // Store full plan data

    const [profile, setProfile] = useState({
        name: '',
        subject: '',
        teachers: [] as string[],
        phone: '',
        email: ''
    });

    const [teachingStaff, setTeachingStaff] = useState<TeachingStaffMember[]>([]);
    const [integrationPlans, setIntegrationPlans] = useState<IntegrationPlan[]>([]);
    const [schoolProfileTable, setSchoolProfileTable] = useState<SchoolProfileRow[]>([]);
    const [bookList, setBookList] = useState<BookListRow[]>([]);
    const [goals, setGoals] = useState<AnnualGoal[]>([]);
    const [yearlyGoals, setYearlyGoals] = useState('');

    // Feedback State
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [showAI, setShowAI] = useState(false);

    // Integration modal state
    const [showIntegrationModal, setShowIntegrationModal] = useState(false);
    const [currentIntegrationPlan, setCurrentIntegrationPlan] = useState<IntegrationPlan | null>(null);

    const openIntegrationModal = (plan: IntegrationPlan) => {
        setCurrentIntegrationPlan(plan);
        setShowIntegrationModal(true);
    };

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const planId = `${year}_${userId}`;
                const docRef = doc(db, 'annualPlans', planId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setPlanData(data);
                    if (data.profile) setProfile(data.profile);
                    if (data.teachingStaff) setTeachingStaff(data.teachingStaff);
                    if (data.schoolProfileTable) setSchoolProfileTable(data.schoolProfileTable);
                    if (data.bookList) setBookList(data.bookList);
                    if (data.yearlyGoals) setYearlyGoals(data.yearlyGoals);
                    if (data.goals) setGoals(data.goals);
                    if (data.integrationPlans) setIntegrationPlans(data.integrationPlans);
                }
            } catch (error) {
                console.error("Error fetching plan:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlan();
    }, [year, userId]);

    // Actions
    const handleApprove = async () => {
        if (!confirm('هل أنت متأكد من اعتماد هذه الخطة؟')) return;
        setActionLoading(true);
        try {
            const planId = `${year}_${userId}`;
            await updateDoc(doc(db, 'annualPlans', planId), {
                status: 'approved',
                updatedAt: Date.now()
            });

            // Notify Coordinator
            await createNotification({
                type: 'SYSTEM',
                senderName: 'المدير',
                senderRole: 'principal',
                title: 'تم اعتماد الخطة السنوية ✅',
                message: `تمت مراجعة واعتماد خطة العمل السنوية للعام ${year} بنجاح.`,
                recipientId: userId,
                link: `/dashboard/planning/edit/${year}`, // Link back to their edit page
                status: 'approved'
            });

            alert('✅ تم اعتماد الخطة بنجاح!');
            router.push('/dashboard/principal');
        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء الاعتماد');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestChanges = async () => {
        if (!feedback.trim()) return alert('الرجاء كتابة ملاحظات التعديل');
        setActionLoading(true);
        try {
            const planId = `${year}_${userId}`;
            await updateDoc(doc(db, 'annualPlans', planId), {
                status: 'changes_requested',
                feedback: feedback,
                updatedAt: Date.now()
            });

            // Notify Coordinator
            await createNotification({
                type: 'FEEDBACK',
                senderName: 'المدير',
                senderRole: 'principal',
                title: 'مطلوب تعديلات على الخطة ⚠️',
                message: `المدير طلب تعديلات: ${feedback}`,
                recipientId: userId,
                link: `/dashboard/planning/edit/${year}`,
                status: 'changes_requested',
                feedback: feedback
            });

            alert('✅ تم إرسال الملاحظات للمركز');
            setShowFeedbackModal(false);
            router.push('/dashboard/principal');
        } catch (error) {
            console.error(error);
            alert('حدث خطأ');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">جاري تحميل الخطة...</div>;

    if (!planData) return <div className="p-10 text-center text-gray-500">لم يتم العثور على خطة لهذا المركز.</div>;

    return (
        <div className="animate-fade-in pb-20 bg-gray-50 min-h-screen">
            {/* Sticky Action Bar */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 shadow-sm mb-6 print:hidden">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 font-bold">
                            &larr; عودة
                        </button>
                        <div>
                            <h2 className="font-bold text-lg">مراجعة خطة: {profile.name}</h2>
                            <span className={`text-xs px-2 py-1 rounded-full ${planData.status === 'approved' ? 'bg-green-100 text-green-700' :
                                planData.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'
                                }`}>
                                {planData.status === 'approved' ? 'معتمدة' : planData.status === 'pending' ? 'بانتظار المراجعة' : planData.status}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFeedbackModal(true)}
                            className="btn bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold shadow-md"
                            disabled={actionLoading}
                        >
                            ⚠️ طلب تعديلات
                        </button>
                        <button
                            onClick={handleApprove}
                            className="btn bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-md flex items-center gap-2"
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'جاري التنفيذ...' : '✅ اعتماد الخطة'}
                        </button>
                        <button
                            onClick={() => setShowAI(true)}
                            className="btn bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 animate-pulse"
                        >
                            <span>✨</span> AI
                        </button>
                        <button
                            onClick={() => exportPlanToWord(planData, year)}
                            className="btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2"
                        >
                            💾 تنزيل Word
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="btn btn-ghost border-2 border-primary text-gray-700 hover:bg-primary hover:text-white px-4 py-2 rounded-lg font-bold"
                        >
                            🖨️ طباعة
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-5xl">

                {/* 1. Profile Section (Read Only) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                        👤 معلومات المركز
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <span className="block text-sm text-gray-500 mb-1">الاسم</span>
                            <div className="p-3 bg-gray-50 rounded-lg text-lg font-bold border border-gray-100">{profile.name}</div>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 mb-1">المادة</span>
                            <div className="p-3 bg-gray-50 rounded-lg text-lg font-bold border border-gray-100">{profile.subject}</div>
                        </div>
                    </div>
                </div>

                {/* 2. Teaching Staff (Read Only) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                        🧑‍🏫 طاقم التدريس
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-3 text-right text-gray-600">الاسم</th>
                                    <th className="p-3 text-right text-gray-600">الإيميل</th>
                                    <th className="p-3 text-right text-gray-600">الهاتف</th>
                                    <th className="p-3 text-right text-gray-600">الصفوف</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teachingStaff.map(staff => (
                                    <tr key={staff.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                        <td className="p-3 font-bold">{staff.name}</td>
                                        <td className="p-3 text-gray-600" dir="ltr">{staff.email}</td>
                                        <td className="p-3 text-gray-600" dir="ltr">{staff.phone}</td>
                                        <td className="p-3">{staff.classes}</td>
                                    </tr>
                                ))}
                                {teachingStaff.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">لا يوجد معلمين</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. School Profile Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                        📊 البروفايل المدرسي
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-2 border">الصف</th>
                                    <th className="p-2 border">المعلم</th>
                                    <th className="p-2 border">الطلاب</th>
                                    <th className="p-2 border">س. تعليمية</th>
                                    <th className="p-2 border">س. فردية</th>
                                    <th className="p-2 border">متميزون</th>
                                    <th className="p-2 border">متعثرون</th>
                                    <th className="p-2 border">ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schoolProfileTable.map(row => (
                                    <tr key={row.id}>
                                        <td className="p-2 border">{row.className}</td>
                                        <td className="p-2 border">{row.teacherName}</td>
                                        <td className="p-2 border text-center">{row.studentCount}</td>
                                        <td className="p-2 border text-center">{row.teachingHours}</td>
                                        <td className="p-2 border text-center">{row.individualHours}</td>
                                        <td className="p-2 border text-center">{row.outstandingCount}</td>
                                        <td className="p-2 border text-center">{row.strugglingCount}</td>
                                        <td className="p-2 border">{row.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 4. Book List */}
                {bookList.filter(row => row.layer || row.bookName || row.publisher || row.author || row.year).length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                        <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                            📚 قائمة الكتب الدراسية (Book List)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm text-right">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-3 border">الصف/الطبقة</th>
                                        <th className="p-3 border">اسم الكتاب</th>
                                        <th className="p-3 border">الناشر</th>
                                        <th className="p-3 border">المؤلف</th>
                                        <th className="p-3 border text-center">السنة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookList.filter(row => row.layer || row.bookName || row.publisher || row.author || row.year).map(row => (
                                        <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                            <td className="p-3 border font-bold">{row.layer}</td>
                                            <td className="p-3 border text-gray-800">{row.bookName}</td>
                                            <td className="p-3 border text-gray-600">{row.publisher}</td>
                                            <td className="p-3 border text-gray-600">{row.author}</td>
                                            <td className="p-3 border text-gray-600 text-center">{row.year}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 5. Integration Plans */}
                {integrationPlans.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                        <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                            📑 خطط الدمج الفردية
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {integrationPlans.map((plan) => (
                                <div key={plan.id} className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm hover:border-primary/20 transition-all flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-800">{plan.studentName} {plan.studentFamilyName}</h4>
                                        <p className="text-gray-500 text-sm mt-1">هوية: {plan.studentId || '---'} | الصف: {plan.grade || '---'}</p>
                                    </div>
                                    <button
                                        onClick={() => openIntegrationModal(plan)}
                                        className="mt-4 w-full px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors"
                                    >
                                        عرض تفاصيل الخطة
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 6. General Yearly Goals */}
                {yearlyGoals && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                        <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                            🎯 الأهداف العامة للسنة
                        </h3>
                        <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">{yearlyGoals}</p>
                    </div>
                )}

                {/* 7. Detailed Goals */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                        🎯 الأهداف السنوية التفصيلية
                    </h3>
                    <div className="space-y-6">
                        {goals.map((goal, idx) => (
                            <div key={goal.id} className="border border-gray-200 rounded-xl p-5 mb-4">
                                <div className="flex gap-4 mb-4 border-b border-gray-100 pb-4">
                                    <div className="flex-1">
                                        <span className="text-xs font-bold text-gray-400">الهدف {idx + 1}</span>
                                        <h4 className="text-lg font-bold text-gray-800">{goal.title}</h4>
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-xs font-bold text-gray-400">الغاية الاستراتيجية</span>
                                        <p className="text-gray-700">{goal.objective}</p>
                                    </div>
                                </div>
                                <h5 className="font-bold text-sm text-gray-500 mb-2">مهام التنفيذ:</h5>
                                <ul className="space-y-3">
                                    {goal.tasks.map(task => (
                                        <li key={task.id} className="flex gap-3 items-start bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                                            <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                task.status === 'partial' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                {task.status === 'completed' ? 'منجز' : task.status === 'partial' ? 'جزئي' : 'لم يبدأ'}
                                            </span>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-800 text-base">{task.task}</p>
                                                {task.steps && (
                                                    <div className="text-gray-600 text-sm mt-2 bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                                                        <strong className="block mb-1 text-gray-500 text-xs">خطوات التنفيذ:</strong>
                                                        {task.steps}
                                                    </div>
                                                )}
                                                <p className="text-gray-500 text-xs mt-2 font-medium">
                                                    👤 المسؤول: <span className="text-gray-700 font-bold">{task.responsible || '---'}</span> | 📅 الموعد: <span className="text-gray-700 font-bold">{task.startDate || '---'}</span>
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">اكتب ملاحظاتك للتعديل</h3>
                            <button onClick={() => setShowFeedbackModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="p-6">
                            <textarea
                                className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none font-medium"
                                placeholder="اكتب بالتفصيل ما يجب تعديله على الخطة..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                            ></textarea>
                            <p className="text-gray-500 text-sm mt-3">سيتم إرسال هذه الملاحظات للمركز وتغيير حالة الخطة إلى "مطلوب تعديلات".</p>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button
                                onClick={() => setShowFeedbackModal(false)}
                                className="px-6 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleRequestChanges}
                                disabled={actionLoading}
                                className="px-6 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200 transition-transform hover:-translate-y-1"
                            >
                                إرسال الملاحظات
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAI && (
                <AIAssistant
                    onClose={() => setShowAI(false)}
                    context={{ planData, profile, teachingStaff, goals, schoolProfileTable, bookList }}
                    pageTitle="مساعد مراجعة الخطط"
                    suggestions={[
                        { label: 'تقييم مهني', prompt: 'قم بتقييم هذه الخطة مهنياً. هل الأهداف طموحة وواقعية؟ هل هناك فجوات في طاقم التدريس؟', icon: '🔍' },
                        { label: 'اقتراح ملاحظات', prompt: 'اقترح ملاحظات بناءة للمركز لتحسين هذه الخطة.', icon: '✍️' },
                        { label: 'تحليل البروفايل', prompt: 'حلل البروفايل المدرسي واذكر أهم التحديات التي تواجه الصفوف بناءً على أعداد الطلاب والمتعثرين.', icon: '📊' }
                    ]}
                />
            )}
            {showIntegrationModal && currentIntegrationPlan && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-2xl font-black text-gray-800">خطة دمج شخصية (הورאה פרטנית) - عرض فقط</h3>
                            <button onClick={() => setShowIntegrationModal(false)} className="text-gray-500 hover:text-red-500 text-2xl font-bold">✕</button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar text-right" dir="rtl">
                            {/* Student Details */}
                            <h4 className="font-bold text-lg border-b pb-2 mb-4 text-primary">👤 معلومات الطالب</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">اسم الطالب</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.studentName || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">اسم العائلة</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.studentFamilyName || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">رقم الهوية</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.studentId || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">تاريخ الميلاد</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.dateOfBirth || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">الصف</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.grade || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">العنوان</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.address || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">البلدية</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.studentLocality || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">الهاتف</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.phone || '---'}</div>
                                </div>
                            </div>

                            {/* Disabilities */}
                            <h4 className="font-bold text-lg border-b pb-2 mb-4 text-primary">🩺 التشخيص / وصف الأداء</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={currentIntegrationPlan.disabilities?.borderlineIntellect || false} readOnly className="w-5 h-5 pointer-events-none" />
                                    <span>ذكاء حدودي</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={currentIntegrationPlan.disabilities?.behavioralEmotional || false} readOnly className="w-5 h-5 pointer-events-none" />
                                    <span>اضطرابات سلوكية وعاطفية</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={currentIntegrationPlan.disabilities?.learningDisabilitiesADHD || false} readOnly className="w-5 h-5 pointer-events-none" />
                                    <span>صعوبات تعلم / ADHD</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={currentIntegrationPlan.disabilities?.developmentalDelayLanguage || false} readOnly className="w-5 h-5 pointer-events-none" />
                                    <span>تأخر لغوي</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={currentIntegrationPlan.disabilities?.developmentalDelayFunctional || false} readOnly className="w-5 h-5 pointer-events-none" />
                                    <span>تأخر وظيفي</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={currentIntegrationPlan.disabilities?.diagnosisProcess || false} readOnly className="w-5 h-5 pointer-events-none" />
                                    <span>في مرحلة التشخيص</span>
                                </label>
                            </div>

                            {/* Domains strengths & focus */}
                            <h4 className="font-bold text-lg border-b pb-2 mb-4 text-primary">🧠 جوانب القوة والتركيز حسب المجالات</h4>
                            <div className="space-y-4 mb-8">
                                {Object.entries(currentIntegrationPlan.domains || {}).map(([key, domain]: any) => {
                                    const labels: Record<string, string> = { cognitive: 'المجال الإدراكي', academic: 'المجال الأكاديمي/التعليمي', social: 'المجال الاجتماعي', emotional: 'المجال العاطفي', motor: 'المجال الحركي/الحسي' };
                                    return (
                                        <div key={key} className="border border-gray-200 p-4 rounded-xl bg-gray-50">
                                            <h5 className="font-bold text-md text-gray-800 mb-2">{labels[key] || key}</h5>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="block text-xs text-gray-500 mb-1">نقاط القوة</span>
                                                    <div className="p-2 bg-white rounded border min-h-[50px] whitespace-pre-wrap">{domain.strengths || '---'}</div>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-gray-500 mb-1">نقاط للتركيز والعمل</span>
                                                    <div className="p-2 bg-white rounded border min-h-[50px] whitespace-pre-wrap">{domain.focus || '---'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Domain Plans Table */}
                            <h4 className="font-bold text-lg border-b pb-2 mb-4 text-primary">📅 الخطة العلاجية للمجالات المختارة</h4>
                            <div className="overflow-x-auto mb-8">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2 w-32">المجال</th>
                                            <th className="border p-2">الهدف العام</th>
                                            <th className="border p-2">الهدف العملي</th>
                                            <th className="border p-2">طريقة التدخل والوسائل</th>
                                            <th className="border p-2 w-32">المدى الزمني</th>
                                            <th className="border p-2">معايير التقييم</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(currentIntegrationPlan.domainPlans || {}).map(([domainName, plan]: any) => {
                                            const labels: Record<string, string> = { academic: 'تعليمي', social: 'اجتماعي', emotional: 'عاطفي', behavioral: 'سلوكي' };
                                            return (
                                                <tr key={domainName}>
                                                    <td className="border p-2 bg-gray-50 font-bold text-center">{labels[domainName] || domainName}</td>
                                                    <td className="border p-2 whitespace-pre-wrap">{plan.goal || '---'}</td>
                                                    <td className="border p-2 whitespace-pre-wrap">{plan.objective || '---'}</td>
                                                    <td className="border p-2 whitespace-pre-wrap">{plan.method || '---'}</td>
                                                    <td className="border p-2 text-center">{plan.timeframe || '---'}</td>
                                                    <td className="border p-2 whitespace-pre-wrap">{plan.evaluation || '---'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setShowIntegrationModal(false)} className="btn bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-bold shadow-md">
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
