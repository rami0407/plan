'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TeachingStaffMember, IntegrationPlan, SchoolProfileRow, BookListRow, AnnualGoal } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { createNotification } from '@/lib/firestoreService';
import AIAssistant from '@/components/AIAssistant';
import { useTranslation } from '@/contexts/LanguageContext';
import { exportPlanToWord } from '@/lib/wordExport';

export default function ReviewPlanClient({ year }: { year: string }) {
    const router = useRouter();
    const { t, language } = useTranslation();
    const searchParams = useSearchParams();
    const userId = searchParams.get('userId');

    // Safety check
    if (!userId) {
        return <div className="p-8 text-center text-red-500 font-bold">{language === 'ar' ? 'خطأ: لم يتم تحديد المستخدم المطلوب (userId مفقود).' : 'שגיאה: לא נבחר משתמש (userId חסר).'}</div>;
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
    const [comments, setComments] = useState<Record<string, string>>({});
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
                    if (data.comments) setComments(data.comments);
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
        if (!confirm(language === 'ar' ? 'هل أنت متأكد من اعتماد هذه الخطة؟' : 'האם אתה בטוח שברצונך לאשר תכנית זו?')) return;
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
                senderName: language === 'ar' ? 'المدير' : 'מנהל',
                senderRole: 'principal',
                title: language === 'ar' ? 'تم اعتماد الخطة السنوية ✅' : 'תכנית העבודה השנתית אושרה ✅',
                message: language === 'ar' 
                    ? `تمت مراجعة واعتماد خطة العمل السنوية للعام ${year} بنجاح.` 
                    : `תכנית העבודה השנתית לשנת ${year} נבדקה ואושרה בהצלחה.`,
                recipientId: userId,
                link: `/dashboard/planning/edit/${year}`, // Link back to their edit page
                status: 'approved'
            });

            alert(language === 'ar' ? '✅ تم اعتماد الخطة بنجاح!' : '✅ התכנית אושרה בהצלחה!');
            router.push('/dashboard/principal');
        } catch (error) {
            console.error(error);
            alert(language === 'ar' ? 'حدث خطأ أثناء الاعتماد' : 'אירעה שגיאה במהלך האישור');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestChanges = async () => {
        const hasSectionComments = Object.values(comments).some(c => c && c.trim());
        let finalFeedback = feedback.trim();
        
        if (!finalFeedback && !hasSectionComments) {
            return alert(language === 'ar' ? 'الرجاء كتابة ملاحظات التعديل أو إضافة تعليق على أحد البنود' : 'נא לכתוב הערות לתיקון או להוסיף הערה על אחד הסעיפים');
        }

        if (!finalFeedback && hasSectionComments) {
            finalFeedback = language === 'ar' 
                ? 'تمت إضافة ملاحظات محددة على بنود الخطة. يرجى مراجعة وتعديل البنود المعنية.' 
                : 'נוספו הערות ספציפיות על סעיפי התוכנית. נא לעבור עליהן ולתקן בהתאם.';
        }

        setActionLoading(true);
        try {
            const planId = `${year}_${userId}`;
            await updateDoc(doc(db, 'annualPlans', planId), {
                status: 'changes_requested',
                feedback: finalFeedback,
                comments: comments,
                updatedAt: Date.now()
            });

            // Notify Coordinator
            await createNotification({
                type: 'FEEDBACK',
                senderName: language === 'ar' ? 'المدير' : 'מנהל',
                senderRole: 'principal',
                title: language === 'ar' ? 'مطلوب تعديلات على الخطة ⚠️' : 'נדרשים תיקונים בתכנית ⚠️',
                message: language === 'ar' ? `المدير طلب تعديلات: ${finalFeedback}` : `המנהל ביקש תיקונים: ${finalFeedback}`,
                recipientId: userId,
                link: `/dashboard/planning/edit/${year}`,
                status: 'changes_requested',
                feedback: finalFeedback
            });

            alert(language === 'ar' ? '✅ تم إرسال الملاحظات للمركز' : '✅ ההערות נשלחו לרכז בהצלחה');
            setShowFeedbackModal(false);
            router.push('/dashboard/principal');
        } catch (error) {
            console.error(error);
            alert(language === 'ar' ? 'حدث خطأ' : 'אירעה שגיאה');
        } finally {
            setActionLoading(false);
        }
    };

    const renderCommentBox = (sectionKey: string) => {
        const isApproved = planData?.status === 'approved';
        return (
            <div className="mt-4 border-t border-gray-100 pt-4 print:hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                {!isApproved ? (
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-amber-600">
                            💬 {language === 'ar' ? 'ملاحظة المدير على هذا القسم (تعديل):' : 'הערת המנהל על סעיף זה (לתיקון):'}
                        </label>
                        <textarea
                            className="w-full p-3 border-2 border-amber-100 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-sm transition-all resize-none bg-amber-50/20"
                            rows={2}
                            placeholder={language === 'ar' ? 'اكتب ملاحظتك للتعديل هنا...' : 'כתוב את הערתך לתיקון כאן...'}
                            value={comments[sectionKey] || ''}
                            onChange={(e) => setComments(prev => ({ ...prev, [sectionKey]: e.target.value }))}
                        />
                    </div>
                ) : comments[sectionKey] ? (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-amber-900">
                        <span className="block text-xs font-bold text-amber-700 mb-1">💬 {language === 'ar' ? 'ملاحظة المدير:' : 'הערת המנהל:'}</span>
                        <p className="text-sm font-medium whitespace-pre-wrap">{comments[sectionKey]}</p>
                    </div>
                ) : null}
            </div>
        );
    };

    if (loading) return <div className="p-10 text-center">{t('loading_plan')}</div>;

    if (!planData) return <div className="p-10 text-center text-gray-500">{t('plan_not_found')}</div>;

    return (
        <div className="animate-fade-in pb-20 bg-gray-50 min-h-screen">
            {/* Sticky Action Bar */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 shadow-sm mb-6 print:hidden">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 font-bold">
                            &larr; {t('back')}
                        </button>
                        <div>
                            <h2 className="font-bold text-lg">{t('review_plan')} {profile.name}</h2>
                            <span className={`text-xs px-2 py-1 rounded-full ${planData.status === 'approved' ? 'bg-green-100 text-green-700' :
                                planData.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'
                                }`}>
                                {planData.status === 'approved' ? t('approved_status') : planData.status === 'pending' ? t('pending_status') : planData.status === 'changes_requested' ? t('changes_requested_status') : t('draft_status')}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFeedbackModal(true)}
                            className="btn bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold shadow-md"
                            disabled={actionLoading}
                        >
                            ⚠️ {t('request_changes')}
                        </button>
                        <button
                            onClick={handleApprove}
                            className="btn bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-md flex items-center gap-2"
                            disabled={actionLoading}
                        >
                            {actionLoading ? (language === 'ar' ? 'جاري التنفيذ...' : 'מבצע...') : `✅ ${t('approve_plan')}`}
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
                            💾 {t('download_word')}
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="btn btn-ghost border-2 border-primary text-gray-700 hover:bg-primary hover:text-white px-4 py-2 rounded-lg font-bold"
                        >
                            🖨️ {t('print')}
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-5xl">

                {/* 1. Profile Section (Read Only) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                        👤 {t('coordinator_info')}
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <span className="block text-sm text-gray-500 mb-1">{t('name')}</span>
                            <div className="p-3 bg-gray-50 rounded-lg text-lg font-bold border border-gray-100">{profile.name}</div>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 mb-1">{t('subject_label')}</span>
                            <div className="p-3 bg-gray-50 rounded-lg text-lg font-bold border border-gray-100">{profile.subject}</div>
                        </div>
                    </div>
                </div>

                {/* 2. Teaching Staff (Read Only) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                        🧑‍🏫 {t('teaching_staff')}
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-3 text-right text-gray-600">{t('name')}</th>
                                    <th className="p-3 text-right text-gray-600">{t('email')}</th>
                                    <th className="p-3 text-right text-gray-600">{t('phone')}</th>
                                    <th className="p-3 text-right text-gray-600">{t('classes')}</th>
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
                                {teachingStaff.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">{language === 'ar' ? 'لا يوجد معلمين' : 'אין מורים'}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {renderCommentBox('teachingStaff')}
                </div>

                {/* 3. School Profile Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                        📊 {t('school_profile')}
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-2 border">{t('grade')}</th>
                                    <th className="p-2 border">{t('teacher')}</th>
                                    <th className="p-2 border">{t('students')}</th>
                                    <th className="p-2 border">{t('teaching_hours')}</th>
                                    <th className="p-2 border">{t('individual_hours')}</th>
                                    <th className="p-2 border">{t('excellent_students')}</th>
                                    <th className="p-2 border">{t('struggling_students')}</th>
                                    <th className="p-2 border">{t('notes')}</th>
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
                    {renderCommentBox('schoolProfileTable')}
                </div>

                {/* 4. Book List */}
                {bookList.filter(row => row.layer || row.bookName || row.publisher || row.author || row.year).length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                        <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                            📚 {t('book_list')}
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm text-right">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-3 border">{t('grade_level')}</th>
                                        <th className="p-3 border">{t('book_name')}</th>
                                        <th className="p-3 border">{t('publisher')}</th>
                                        <th className="p-3 border">{t('author')}</th>
                                        <th className="p-3 border text-center">{t('year')}</th>
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
                        {renderCommentBox('bookList')}
                    </div>
                )}

                {/* 5. Integration Plans */}
                {integrationPlans.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                        <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                            📑 {language === 'ar' ? 'خطط الدمج الفردية' : 'תוכניות שילוב אישיות'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {integrationPlans.map((plan) => (
                                <div key={plan.id} className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm hover:border-primary/20 transition-all flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-800">{plan.studentName} {plan.studentFamilyName}</h4>
                                        <p className="text-gray-500 text-sm mt-1">{language === 'ar' ? 'هوية' : 'ת"ז'}: {plan.studentId || '---'} | {t('grade')}: {plan.grade || '---'}</p>
                                    </div>
                                    <button
                                        onClick={() => openIntegrationModal(plan)}
                                        className="mt-4 w-full px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors"
                                    >
                                        {language === 'ar' ? 'عرض تفاصيل الخطة' : 'הצג פרטי תוכנית'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        {renderCommentBox('integrationPlans')}
                    </div>
                )}

                {/* 6. General Yearly Goals */}
                {yearlyGoals && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                        <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                            🎯 {t('annual_goals')}
                        </h3>
                        <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">{yearlyGoals}</p>
                        {renderCommentBox('yearlyGoals')}
                    </div>
                )}

                {/* 7. Detailed Goals */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                        🎯 {t('detailed_annual_goals')}
                    </h3>
                    <div className="space-y-6">
                        {goals.map((goal, idx) => (
                            <div key={goal.id} className="border border-gray-200 rounded-xl p-5 mb-4">
                                <div className="flex gap-4 mb-4 border-b border-gray-100 pb-4">
                                    <div className="flex-1">
                                        <span className="text-xs font-bold text-gray-400">{t('goal')} {idx + 1}</span>
                                        <h4 className="text-lg font-bold text-gray-800">{goal.title}</h4>
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-xs font-bold text-gray-400">{t('target_indicator')}</span>
                                        <p className="text-gray-700">{goal.objective}</p>
                                    </div>
                                </div>
                                <h5 className="font-bold text-sm text-gray-500 mb-2">{t('tasks_to_execute')}</h5>
                                <ul className="space-y-3">
                                    {goal.tasks.map(task => (
                                        <li key={task.id} className="flex gap-3 items-start bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                                            <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                task.status === 'partial' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                {task.status === 'completed' ? t('completed') : task.status === 'partial' ? t('partial') : t('not_started')}
                                            </span>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-800 text-base">{task.task}</p>
                                                {task.steps && (
                                                    <div className="text-gray-600 text-sm mt-2 bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                                                        <strong className="block mb-1 text-gray-500 text-xs">{t('action_steps')}:</strong>
                                                        {task.steps}
                                                    </div>
                                                )}
                                                <p className="text-gray-500 text-xs mt-2 font-medium flex flex-wrap gap-x-4">
                                                    <span>👤 {t('task_owner')}: <span className="text-gray-700 font-bold">{task.responsible || '---'}</span></span>
                                                    <span>📅 {t('schedule')}: <span className="text-gray-700 font-bold">{task.startDate || '---'}</span></span>
                                                    <span>🎯 {t('outcome_measures')}: <span className="text-gray-700 font-bold">{task.outcomeMeasures || '---'}</span></span>
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                {renderCommentBox('goal_' + goal.id)}
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
                            <h3 className="text-xl font-bold text-gray-800">{language === 'ar' ? 'اكتب ملاحظاتك للتعديل' : 'כתוב את הערותיך לתיקון'}</h3>
                            <button onClick={() => setShowFeedbackModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="p-6">
                            <textarea
                                className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none font-medium"
                                placeholder={t('write_feedback_placeholder')}
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                            ></textarea>
                            <p className="text-gray-500 text-sm mt-3">{t('feedback_warning')}</p>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button
                                onClick={() => setShowFeedbackModal(false)}
                                className="px-6 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleRequestChanges}
                                disabled={actionLoading}
                                className="px-6 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200 transition-transform hover:-translate-y-1"
                            >
                                {language === 'ar' ? 'إرسال الملاحظات' : 'שלח הערות'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAI && (
                <AIAssistant
                    onClose={() => setShowAI(false)}
                    context={{ planData, profile, teachingStaff, goals, schoolProfileTable, bookList }}
                    pageTitle={t('plan_review_assistant')}
                    suggestions={[
                        { 
                            label: t('professional_evaluation'), 
                            prompt: language === 'ar' ? 'قم بتقييم هذه الخطة مهنياً. هل الأهداف طموحة وواقعية؟ هل هناك فجوات في طاقم التدريس؟' : 'הערך תוכנית זו באופן מקצועי. האם היעדים שאפתניים ומציאותיים? האם ישנם פערים בצוות ההוראה?', 
                            icon: '🔍' 
                        },
                        { 
                            label: t('suggest_feedback'), 
                            prompt: language === 'ar' ? 'اقترح ملاحظات بناءة للمركز لتحسين هذه الخطة.' : 'הצע הערות בונות לרכז לשיפור תוכנית זו.', 
                            icon: '✍️' 
                        },
                        { 
                            label: t('profile_analysis'), 
                            prompt: language === 'ar' ? 'حلل البروفايل المدرسي واذكر أهم التحديات التي تواجه الصفوف بناءً على أعداد الطلاب والمتعثرين.' : 'נתח את הפרופיל הבית ספרי וציין את האתגרים המרכזיים העומדים בפני הכיתות בהתבסס על מספר התלמידים והמתקשים.', 
                            icon: '📊' 
                        }
                    ]}
                />
            )}
            {showIntegrationModal && currentIntegrationPlan && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-2xl font-black text-gray-800">{t('personal_intervention_view_only')}</h3>
                            <button onClick={() => setShowIntegrationModal(false)} className="text-gray-500 hover:text-red-500 text-2xl font-bold">✕</button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar text-right" dir="rtl">
                            {/* Student Details */}
                            <h4 className="font-bold text-lg border-b pb-2 mb-4 text-primary">👤 {t('student_info')}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">{t('student_name_label')}</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.studentName || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">{t('family_name_label')}</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.studentFamilyName || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">{t('id_number_label')}</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.studentId || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">{t('dob_label')}</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.dateOfBirth || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">{t('grade')}</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.grade || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">{t('address_label')}</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.address || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">{t('municipality_label')}</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.studentLocality || '---'}</div>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">{t('phone')}</span>
                                    <div className="p-2 bg-gray-50 rounded border">{currentIntegrationPlan.phone || '---'}</div>
                                </div>
                            </div>

                            {/* Disabilities */}
                            <h4 className="font-bold text-lg border-b pb-2 mb-4 text-primary">🩺 {t('diagnosis_performance')}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={currentIntegrationPlan.disabilities?.borderlineIntellect || false} readOnly className="w-5 h-5 pointer-events-none" />
                                    <span>{t('borderline_intelligence')}</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={currentIntegrationPlan.disabilities?.behavioralEmotional || false} readOnly className="w-5 h-5 pointer-events-none" />
                                    <span>{t('behavioral_emotional')}</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={currentIntegrationPlan.disabilities?.learningDisabilitiesADHD || false} readOnly className="w-5 h-5 pointer-events-none" />
                                    <span>{t('learning_difficulties_adhd')}</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={currentIntegrationPlan.disabilities?.developmentalDelayLanguage || false} readOnly className="w-5 h-5 pointer-events-none" />
                                    <span>{t('language_delay')}</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={currentIntegrationPlan.disabilities?.developmentalDelayFunctional || false} readOnly className="w-5 h-5 pointer-events-none" />
                                    <span>{t('functional_delay')}</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={currentIntegrationPlan.disabilities?.diagnosisProcess || false} readOnly className="w-5 h-5 pointer-events-none" />
                                    <span>{t('under_diagnosis')}</span>
                                </label>
                            </div>

                            {/* Domains strengths & focus */}
                            <h4 className="font-bold text-lg border-b pb-2 mb-4 text-primary">🧠 {t('strengths_focus_areas')}</h4>
                            <div className="space-y-4 mb-8">
                                {Object.entries(currentIntegrationPlan.domains || {}).map(([key, domain]: any) => {
                                    const labels: Record<string, string> = { 
                                        cognitive: t('cognitive_domain'), 
                                        academic: t('academic_domain'), 
                                        social: t('social_domain'), 
                                        emotional: t('emotional_domain'), 
                                        motor: t('motor_domain') 
                                    };
                                    return (
                                        <div key={key} className="border border-gray-200 p-4 rounded-xl bg-gray-50">
                                            <h5 className="font-bold text-md text-gray-800 mb-2">{labels[key] || key}</h5>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="block text-xs text-gray-500 mb-1">{t('strengths')}</span>
                                                    <div className="p-2 bg-white rounded border min-h-[50px] whitespace-pre-wrap">{domain.strengths || '---'}</div>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-gray-500 mb-1">{t('focus_areas')}</span>
                                                    <div className="p-2 bg-white rounded border min-h-[50px] whitespace-pre-wrap">{domain.focus || '---'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Domain Plans Table */}
                            <h4 className="font-bold text-lg border-b pb-2 mb-4 text-primary">📅 {t('treatment_plan_areas')}</h4>
                            <div className="overflow-x-auto mb-8">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2 w-32">{language === 'ar' ? 'المجال' : 'תחום'}</th>
                                            <th className="border p-2">{t('general_goal')}</th>
                                            <th className="border p-2">{t('practical_goal')}</th>
                                            <th className="border p-2">{t('intervention_method')}</th>
                                            <th className="border p-2 w-32">{t('duration')}</th>
                                            <th className="border p-2">{t('evaluation_criteria')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(currentIntegrationPlan.domainPlans || {}).map(([domainName, plan]: any) => {
                                            const labels: Record<string, string> = { 
                                                academic: language === 'ar' ? 'تعليمي' : 'לימודי', 
                                                social: language === 'ar' ? 'اجتماعي' : 'חברתי', 
                                                emotional: language === 'ar' ? 'عاطفي' : 'רגשי',
                                                behavioral: language === 'ar' ? 'سلوكي' : 'התנהגותי'
                                            };
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
                                {t('close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
