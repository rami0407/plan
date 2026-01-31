'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TeachingStaffMember, IntegrationPlan, SchoolProfileRow, BookListRow, AnnualGoal } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { createNotification } from '@/lib/firestoreService';
import AIAssistant from '@/components/AIAssistant';

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

                {/* 4. Goals */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                        🎯 الأهداف السنوية
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
                                <ul className="space-y-2">
                                    {goal.tasks.map(task => (
                                        <li key={task.id} className="flex gap-3 items-start bg-gray-50 p-2 rounded-lg text-sm">
                                            <span className={`px-2 py-0.5 rounded text-xs ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                task.status === 'partial' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                {task.status === 'completed' ? 'منجز' : task.status === 'partial' ? 'جزئي' : 'لم يبدأ'}
                                            </span>
                                            <div>
                                                <p className="font-bold">{task.task}</p>
                                                <p className="text-gray-500 text-xs mt-1">مسؤولية: {task.responsible} | موعد: {task.startDate}</p>
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
        </div>
    );
}
