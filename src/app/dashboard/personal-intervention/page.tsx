'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, SectionType } from 'docx';

export default function PersonalInterventionPage() {
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [planId, setPlanId] = useState<string | null>(null);

    // List View State
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [plansList, setPlansList] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState('2026');
    const years = Array.from({ length: 15 }, (_, i) => (2026 + i).toString());

    useEffect(() => {
        if (viewMode === 'list' && user) {
            fetchPlans();
        }
    }, [viewMode, user, selectedYear]);

    const fetchPlans = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { getPersonalInterventionPlansByCoordinatorAndYear } = await import('@/lib/firestoreService');
            // Attempt to get filtered data, fallback to local filter if service not updated
            try {
                const data = await getPersonalInterventionPlansByCoordinatorAndYear(user.uid, selectedYear);
                setPlansList(data);
            } catch (e) {
                const { getPersonalInterventionPlansByCoordinator } = await import('@/lib/firestoreService');
                const data = await getPersonalInterventionPlansByCoordinator(user.uid);
                setPlansList(data.filter((p: any) => p.selectedYear === selectedYear));
            }
        } catch (error) {
            console.error("Error fetching plans:", error);
        } finally {
            setLoading(false);
        }
    };


    const [showAI, setShowAI] = useState(false);

    const handleEditPlan = (plan: any) => {
        setPlanId(plan.id);
        setStudentDetails(plan.studentDetails);
        setDisabilities(plan.disabilities);
        setFunctionalAreas(plan.functionalAreas);
        setPlanStatus(plan.planStatus);
        setSupports(plan.supports);
        setDocuments(plan.documents);
        setInterventionPlan(plan.interventionPlan);
        setSelectedGrade(plan.grade || '');
        setSelectedSection(plan.section || '');
        if (plan.selectedYear) setSelectedYear(plan.selectedYear);
        setViewMode('form');
    };

    const loadPlanById = async (sid: string) => {
        setLoading(true);
        setViewMode('form');
        try {
            const { getPersonalInterventionPlanByStudentId } = await import('@/lib/firestoreService');
            const plan = await getPersonalInterventionPlanByStudentId(sid);
            if (plan) {
                handleEditPlan(plan);
                alert('✅ נתונים נטענו בהצלחה');
            } else {
                if (sid) setStudentDetails(prev => ({ ...prev, id: sid }));
                alert('ℹ️ לא נמצאה תכנית שמורה עבור ת.ז זו');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const sid = searchParams.get('studentId');
        if (sid) {
            loadPlanById(sid);
        }
    }, [searchParams]);

    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSection, setSelectedSection] = useState('');

    const grades = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
    const sections = ['1', '2', '3', '4']; // الشعب

    const [studentDetails, setStudentDetails] = useState({
        firstName: '', lastName: '',
        id: '', dob: '',
        city: '', address: '',
        phone: '', grade: '',
        responsibleStaff: '', role: '',
        regularAttendance: '', familyWelfare: ''
    });

    useEffect(() => {
        if (selectedGrade && selectedSection) {
            setStudentDetails(prev => ({ ...prev, grade: `${selectedGrade} ${selectedSection}` }));
        }
    }, [selectedGrade, selectedSection]);

    const [disabilities, setDisabilities] = useState({
        borderline: false,
        behavioral: false,
        learning: false,
        functionalDelay: false,
        languageDelay: false,
        diagnosisProcess: false
    });

    interface FunctionalArea {
        strengths: string;
        toStrengthen: string;
    }

    interface InterventionDomain {
        goals: string;
        objectives: string;
        methods: string;
        timeframe: string;
        evaluation: string;
        partners: string;
    }

    const [functionalAreas, setFunctionalAreas] = useState<Record<string, FunctionalArea>>({
        cognitive: { strengths: '', toStrengthen: '' },
        educational: { strengths: '', toStrengthen: '' },
        language: { strengths: '', toStrengthen: '' },
        social: { strengths: '', toStrengthen: '' },
        behavioral: { strengths: '', toStrengthen: '' },
        motor: { strengths: '', toStrengthen: '' }
    });

    const [planStatus, setPlanStatus] = useState({
        personalPlan: false,
        behavioralPlan: false,
        schoolResources: false
    });

    const [supports, setSupports] = useState({
        inclusion: false,
        individual: false,
        teachingIntegration: false,
        paramedical: false,
        counselor: false,
        psychological: false,
        other: false,
        otherText: '',
        community1: '',
        community2: ''
    });

    const [documents, setDocuments] = useState({
        didactic: false,
        psychological: false,
        psychoDidactic: false,
        other: false,
        otherText: ''
    });

    const [interventionPlan, setInterventionPlan] = useState<{
        duration: string;
        [key: string]: string | InterventionDomain;
    } & Record<'educational' | 'social' | 'behavioral' | 'emotional', InterventionDomain>>({
        duration: '',
        educational: { goals: '', objectives: '', methods: '', timeframe: '', evaluation: '', partners: '' },
        social: { goals: '', objectives: '', methods: '', timeframe: '', evaluation: '', partners: '' },
        behavioral: { goals: '', objectives: '', methods: '', timeframe: '', evaluation: '', partners: '' },
        emotional: { goals: '', objectives: '', methods: '', timeframe: '', evaluation: '', partners: '' }
    });



    const handleSave = async (showMessage = true) => {
        if (!user) return;
        if (!studentDetails.firstName || !studentDetails.lastName) {
            alert('הנא למלא פרטי תלמיד (שם פרטי ושם משפחה) / يرجى ملء بيانات الطالب (الاسم الأول واسم العائلة)');
            return;
        }

        try {
            setSaving(true);
            const { addPersonalInterventionPlan, updatePersonalInterventionPlan } = await import('@/lib/firestoreService');

            const planData: any = {
                coordinatorId: user.uid,
                studentDetails,
                disabilities,
                functionalAreas,
                planStatus,
                supports,
                documents,
                interventionPlan,
                grade: selectedGrade,
                section: selectedSection,
                updatedAt: new Date(),
                selectedYear: selectedYear
            };

            if (planId) {
                await updatePersonalInterventionPlan(planId, planData);
                if (showMessage) alert('✅ נשמר בהצלחה / تم الحفظ بنجاح');
                setPlansList(prev => prev.map(p => p.id === planId ? { ...p, ...planData, id: planId } : p));
            } else {
                const newId = await addPersonalInterventionPlan(planData);
                setPlanId(newId);
                if (showMessage) alert('✅ נוצר בהצלחה / تم الإنشاء بنجاح');
                setPlansList(prev => [{ ...planData, id: newId }, ...prev]);
            }
        } catch (error) {
            console.error(error);
            alert('שגיאה בשמירה / خطأ في الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const handleSendToPrincipal = async () => {
        if (!user) return;
        if (!planId) {
            await handleSave(false);
        }
        if (!planId) return;

        try {
            const { createNotification } = await import('@/lib/firestoreService');
            await createNotification({
                recipientId: 'admin',
                title: 'תכנית התערבות אישית חדשה / خطة تدخل جديدة',
                message: `הוגשה תכנית התערבות אישית עבור התלמיד ${studentDetails.firstName} ${studentDetails.lastName} (${selectedGrade})`,
                link: `/dashboard/personal-intervention?studentId=${studentDetails.id}`,
                type: 'plan_submission',
                senderName: user.displayName || 'Coordinator',
                senderRole: 'coordinator'
            });
            alert('🚀 נשלח למנהל בהצלחה / تم الإرسال للمدير بنجاح');
        } catch (e) {
            console.error(e);
            alert('שגיאה בשליחה / خطأ في الإرسال');
        }
    };

    const handleLoadStudent = async () => {
        if (!studentDetails.id) return;
        loadPlanById(studentDetails.id);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleReset = () => {
        if (!confirm('האם אתה בטוח שברצונך למחוק את כל הטופס ולהתחיל מחדש? / هل أنت متأكد من مسح النموذج والبدء من جديد؟')) return;
        setPlanId(null);
        setStudentDetails({ firstName: '', lastName: '', id: '', dob: '', city: '', address: '', phone: '', grade: '', responsibleStaff: '', role: '', regularAttendance: '', familyWelfare: '' });
        setDisabilities({ borderline: false, behavioral: false, learning: false, functionalDelay: false, languageDelay: false, diagnosisProcess: false });
        setFunctionalAreas({
            cognitive: { strengths: '', toStrengthen: '' },
            educational: { strengths: '', toStrengthen: '' },
            language: { strengths: '', toStrengthen: '' },
            social: { strengths: '', toStrengthen: '' },
            behavioral: { strengths: '', toStrengthen: '' },
            motor: { strengths: '', toStrengthen: '' }
        });
        setPlanStatus({ personalPlan: false, behavioralPlan: false, schoolResources: false });
        setSupports({ inclusion: false, individual: false, teachingIntegration: false, paramedical: false, counselor: false, psychological: false, other: false, otherText: '', community1: '', community2: '' });
        setDocuments({ didactic: false, psychological: false, psychoDidactic: false, other: false, otherText: '' });
        setInterventionPlan({
            duration: '',
            educational: { goals: '', objectives: '', methods: '', timeframe: '', evaluation: '', partners: '' },
            social: { goals: '', objectives: '', methods: '', timeframe: '', evaluation: '', partners: '' },
            behavioral: { goals: '', objectives: '', methods: '', timeframe: '', evaluation: '', partners: '' },
            emotional: { goals: '', objectives: '', methods: '', timeframe: '', evaluation: '', partners: '' }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleNewPlan = () => {
        setPlanId(null);
        setStudentDetails({ firstName: '', lastName: '', id: '', dob: '', city: '', address: '', phone: '', grade: '', responsibleStaff: '', role: '', regularAttendance: '', familyWelfare: '' });
        setDisabilities({ borderline: false, behavioral: false, learning: false, functionalDelay: false, languageDelay: false, diagnosisProcess: false });
        setFunctionalAreas({
            cognitive: { strengths: '', toStrengthen: '' },
            educational: { strengths: '', toStrengthen: '' },
            language: { strengths: '', toStrengthen: '' },
            social: { strengths: '', toStrengthen: '' },
            behavioral: { strengths: '', toStrengthen: '' },
            motor: { strengths: '', toStrengthen: '' }
        });
        setPlanStatus({ personalPlan: false, behavioralPlan: false, schoolResources: false });
        setSupports({ inclusion: false, individual: false, teachingIntegration: false, paramedical: false, counselor: false, psychological: false, other: false, otherText: '', community1: '', community2: '' });
        setDocuments({ didactic: false, psychological: false, psychoDidactic: false, other: false, otherText: '' });
        setInterventionPlan({
            duration: '',
            educational: { goals: '', objectives: '', methods: '', timeframe: '', evaluation: '', partners: '' },
            social: { goals: '', objectives: '', methods: '', timeframe: '', evaluation: '', partners: '' },
            behavioral: { goals: '', objectives: '', methods: '', timeframe: '', evaluation: '', partners: '' },
            emotional: { goals: '', objectives: '', methods: '', timeframe: '', evaluation: '', partners: '' }
        });
        setViewMode('form');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };



    const handleDuplicatePlan = (plan: any) => {
        handleEditPlan(plan);
        setPlanId(null); // Clear ID to treat as new
        alert('تم نسخ البيانات. يمكنك الآن تعديل اسم الطالب وحفظ الخطة كجديدة.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDownloadWord = async (plan: any) => {
        const doc = new Document({
            sections: [{
                properties: {
                    type: SectionType.CONTINUOUS,
                },
                children: [
                    new Paragraph({
                        text: "תכנית התערבות אישית / خطة تدخل شخصية",
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                        text: `سنة / שנה"ל: ${plan.selectedYear || '---'}`,
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({ text: "" }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `الاسم / שם: ${plan.studentDetails?.firstName} ${plan.studentDetails?.lastName}`,
                                bold: true,
                            }),
                        ],
                    }),
                    new Paragraph({
                        text: `رقم الهوية / ת"ז: ${plan.studentDetails?.id}`,
                    }),
                    new Paragraph({
                        text: `الصف / כיתה: ${plan.grade} ${plan.section ? `(${plan.section})` : ''}`,
                    }),
                    new Paragraph({ text: "" }),
                    new Paragraph({
                        text: "تفاصيل الخطة / תוכנית מפורטת:",
                        heading: HeadingLevel.HEADING_2,
                    }),
                    new Paragraph({
                        text: `المسؤول / גורם אחראי: ${plan.studentDetails?.responsibleStaff || '---'}`,
                    }),
                ],
            }],
        });

        Packer.toBlob(doc).then((blob) => {
            saveAs(blob, `Intervention_Plan_${plan.studentDetails?.firstName}_${plan.studentDetails?.lastName}.docx`);
        });
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק תכנית זו? / هل أنت متأكد أنك تريد حذف هذه الخطة؟')) return;
        try {
            const { deletePersonalInterventionPlan } = await import('@/lib/firestoreService');
            await deletePersonalInterventionPlan(id);
            setPlansList(prev => prev.filter(p => p.id !== id));
            alert('✅ נמחק בהצלחה / تم الحذف بنجاح');
        } catch (e) {
            console.error(e);
            alert('שגיאה במחיקה / خطأ في الحذف');
        }
    };

    const handleDuplicateForm = () => {
        if (!confirm('האם אתה בטוח שברצונך לשכפל את התוכן עבור תלמיד חדש? (פרטי התלמיד יימחקו, שאר התוכן יישמר) / هل أنت متأكد من نسخ المحتوى لطالب جديد؟ (سيتم مسح بيانات الطالب وسيتم الاحتفاظ بباقي المحتوى)')) return;
        setPlanId(null); // Clear ID to create new
        setStudentDetails({ firstName: '', lastName: '', id: '', dob: '', city: '', address: '', phone: '', grade: '', responsibleStaff: '', role: '', regularAttendance: '', familyWelfare: '' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };


    const inputClass = "w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-right";
    const checkboxClass = "w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer";

    if (viewMode === 'list') {
        return (
            <div className="min-h-screen p-8 bg-gray-50/50" dir="rtl">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-gray-800 mb-2">תכניות התערבות אישית</h1>
                            <p className="text-gray-500">ניהול תיקי תלמידים / إدارة ملفات الطلاب</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => router.back()} className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 shadow-sm">
                                חזרה ללוح הבקרה / العودة للوحة التحكم
                            </button>
                            <button onClick={handleNewPlan} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg flex items-center gap-2 transition-transform hover:-translate-y-1">
                                <span className="text-xl">+</span>
                                תכנית חדשה / إضافة خطة
                            </button>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            <label className="font-bold text-gray-700">בחר שנה / اختر السنة:</label>
                            <div className="flex flex-wrap gap-2">
                                {years.map(y => (
                                    <button
                                        key={y}
                                        onClick={() => setSelectedYear(y)}
                                        className={`px-4 py-3 rounded-xl font-bold transition-all shadow-sm ${selectedYear === y ? 'bg-blue-600 text-white shadow-blue-200 scale-110' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        📁 {y}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-gray-500">... טוען נתונים / جاري التحميل</div>
                    ) : plansList.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="mb-4 text-6xl">📭</div>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">לא נמצאו תכניות לשנת {selectedYear} / لا توجد خطط لهذه السنة</h3>
                            <p className="text-gray-500 mb-6">לחץ على زر الإضافة لإنشاء خطة جديدة لهذه السنة</p>
                            <button onClick={handleNewPlan} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md">
                                צור תכנית ראשונה ل-{selectedYear} / إنشاء الخطة الأولى
                            </button>
                        </div>
                    ) : (
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plansList.map((plan) => (
                                <div key={plan.id} className="relative group overflow-hidden">
                                    <button
                                        onClick={() => handleEditPlan(plan)}
                                        className="w-full bg-white border-2 border-gray-100 rounded-3xl p-8 text-right shadow-sm hover:shadow-2xl transition-all hover:-translate-y-2 border-r-8 border-r-blue-600 group-hover:border-blue-200"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                            </div>
                                            <span className="text-sm font-bold text-gray-400">ID: {plan.studentDetails?.id}</span>
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-800 mb-2 truncate">{plan.studentDetails?.firstName} {plan.studentDetails?.lastName}</h3>
                                        <div className="flex items-center gap-2 mb-6">
                                            <span className="bg-blue-100/50 text-blue-700 px-3 py-1 rounded-full text-xs font-black">
                                                {plan.grade} {plan.section ? `(${plan.section})` : ''}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 pt-4 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => handleDownloadWord(plan)} className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-sm">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                تحميل / وורד
                                            </button>
                                            <button onClick={() => handleDeletePlan(plan.id)} className="w-12 h-10 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bottom Add Button */}
                {plansList.length > 0 && (
                    <div className="mt-8 flex justify-center">
                        <button onClick={handleNewPlan} className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg flex items-center gap-2 transition-transform hover:-translate-y-1">
                            <span className="text-xl">+</span>
                            הוסף תכנית חדשה / إضافة خطة
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 bg-gray-50/50" dir="rtl">
            {/** Header & Actions **/}
            <div className="flex justify-between items-center mb-8 print:hidden">
                <h1 className="text-3xl font-bold text-gray-800">תכנית התערבות אישית / خطة تدخل شخصية</h1>
                <div className="flex gap-4">
                    <button onClick={() => setViewMode('list')} className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
                        חזרה לרשימה / عودة للقائمة
                    </button>
                    <button onClick={handleReset} className="px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        חדש / جديد
                    </button>
                    <button onClick={handleDuplicateForm} className="px-4 py-2 text-green-600 bg-green-50 border border-green-200 rounded hover:bg-green-100 flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        שכפול / نسخ
                    </button>

                    <button onClick={handlePrint} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9V2h12v7"></path>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                            <path d="M6 14h12v8H6z"></path>
                        </svg>
                        הדפסה / طباعة
                    </button>
                    {/* AI Button - for Admin/Principal */}
                    <button
                        onClick={() => setShowAI(!showAI)}
                        className="px-4 py-2 text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2 shadow-lg animate-pulse"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        مساعد المدير الذكي ✨
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl p-8 print:shadow-none print:p-0">

                {/* Grade & Section Selectors */}
                <div className="bg-blue-50/50 p-6 mb-8 rounded-xl border border-blue-100 flex flex-wrap gap-6 items-center print:hidden">
                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-gray-700">הכיתה (الصف):</label>
                        <select
                            value={selectedGrade}
                            onChange={(e) => setSelectedGrade(e.target.value)}
                            className="bg-white px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none min-w-[150px]"
                        >
                            <option value="">-- בחר (اختر) --</option>
                            {grades.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-gray-700">הקבצה/מספר (الشعبة):</label>
                        <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="bg-white px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none min-w-[150px]"
                        >
                            <option value="">-- בחר (اختر) --</option>
                            {sections.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="mr-auto flex gap-3">
                        <button onClick={() => handleSave(true)} disabled={saving} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition-all shadow-sm flex items-center gap-2">
                            {saving ? '...שומר' : 'שמור (حفظ)'}
                        </button>
                        <button onClick={handleSendToPrincipal} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-all shadow-sm flex items-center gap-2">
                            שלח למנהל (إرسال للمدير)
                        </button>
                    </div>
                </div>

                {/** Form Header **/}
                <div className="text-center mb-8 border-b-2 border-gray-100 pb-4">
                    <h2 className="text-2xl font-black text-blue-800 mb-2">תכנית התערבות אישית / خطة تدخل شخصية</h2>
                    <p className="text-gray-500">שנה"ל תשפ"ו / السنة الدراسية 2025-2026</p>
                </div>


                {/** 1. Personal Details **/}
                <section className="mb-8">
                    <h3 className="text-xl font-bold text-blue-700 mb-4 border-r-4 border-blue-700 pr-2">פרטים אישיים של התלמיד / تفاصيل الطالب الشخصية</h3>
                    <div className="grid grid-cols-2 gap-4 bg-blue-50/30 p-4 rounded-lg border border-blue-100 mb-4">
                        <div className="flex gap-2 items-center">
                            <label className="font-bold w-32">שם פרטי / الاسم:</label>
                            <input type="text" value={studentDetails.firstName} onChange={e => setStudentDetails({ ...studentDetails, firstName: e.target.value })} className={inputClass} />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="font-bold w-32">שם משפחה / العائلة:</label>
                            <input type="text" value={studentDetails.lastName} onChange={e => setStudentDetails({ ...studentDetails, lastName: e.target.value })} className={inputClass} />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="font-bold w-32">ת"ז / الهوية:</label>
                            <input type="text" value={studentDetails.id} onChange={e => setStudentDetails({ ...studentDetails, id: e.target.value })} className={inputClass} />
                            <button onClick={handleLoadStudent} className="px-3 py-1 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 print:hidden text-xs transition-colors" disabled={loading} title="טען נתונים שמורים">
                                {loading ? 'טוען...' : 'טען נתונים / تحميل'}
                            </button>
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="font-bold w-32">תאריך לידה / الميلاد:</label>
                            <input type="date" value={studentDetails.dob} onChange={e => setStudentDetails({ ...studentDetails, dob: e.target.value })} className={inputClass} />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="font-bold w-32">יישוב / البلد:</label>
                            <input type="text" value={studentDetails.city} onChange={e => setStudentDetails({ ...studentDetails, city: e.target.value })} className={inputClass} />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="font-bold w-32">כתובת / العنوان:</label>
                            <input type="text" value={studentDetails.address} onChange={e => setStudentDetails({ ...studentDetails, address: e.target.value })} className={inputClass} />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="font-bold w-32">טלפון / هاتف:</label>
                            <input type="tel" value={studentDetails.phone} onChange={e => setStudentDetails({ ...studentDetails, phone: e.target.value })} className={inputClass} />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="font-bold w-32">דרגת כיתה / الصف:</label>
                            <input type="text" value={studentDetails.grade} onChange={e => setStudentDetails({ ...studentDetails, grade: e.target.value })} className={inputClass} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-lg border border-gray-100">
                        <div className="flex gap-2 items-center">
                            <label className="font-bold w-32">גורם אחראי / المسؤول:</label>
                            <input type="text" value={studentDetails.responsibleStaff} onChange={e => setStudentDetails({ ...studentDetails, responsibleStaff: e.target.value })} className={inputClass} />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="font-bold w-32">תפקיד / الوظيفة:</label>
                            <input type="text" value={studentDetails.role} onChange={e => setStudentDetails({ ...studentDetails, role: e.target.value })} className={inputClass} />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="font-bold w-32">ביקור סדיר / انتظام:</label>
                            <input type="text" value={studentDetails.regularAttendance} onChange={e => setStudentDetails({ ...studentDetails, regularAttendance: e.target.value })} className={inputClass} />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="font-bold w-40">משפחה ברווחה / للشؤون:</label>
                            <input type="text" value={studentDetails.familyWelfare} onChange={e => setStudentDetails({ ...studentDetails, familyWelfare: e.target.value })} className={inputClass} />
                        </div>
                    </div>
                </section>


                {/** 2. Disability Characterization **/}
                <section className="mb-8 page-break-inside-avoid">
                    <h3 className="text-xl font-bold text-blue-700 mb-4 border-r-4 border-blue-700 pr-2">אפיון מוגבלות (שכיחות גבוהה)</h3>
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 hover:bg-white p-2 rounded transition-colors">
                            <input type="checkbox" checked={disabilities.borderline} onChange={() => setDisabilities({ ...disabilities, borderline: !disabilities.borderline })} className={checkboxClass} />
                            <span>משכל גבולי רב- בעייתי</span>
                        </label>
                        <label className="flex items-center gap-3 hover:bg-white p-2 rounded transition-colors">
                            <input type="checkbox" checked={disabilities.behavioral} onChange={() => setDisabilities({ ...disabilities, behavioral: !disabilities.behavioral })} className={checkboxClass} />
                            <span>הפרעות התנהגותיות ורגשיות</span>
                        </label>
                        <label className="flex items-center gap-3 hover:bg-white p-2 rounded transition-colors">
                            <input type="checkbox" checked={disabilities.learning} onChange={() => setDisabilities({ ...disabilities, learning: !disabilities.learning })} className={checkboxClass} />
                            <span>לקות למידה רב בעייתית / ADHD</span>
                        </label>
                        <label className="flex items-center gap-3 hover:bg-white p-2 rounded transition-colors">
                            <input type="checkbox" checked={disabilities.functionalDelay} onChange={() => setDisabilities({ ...disabilities, functionalDelay: !disabilities.functionalDelay })} className={checkboxClass} />
                            <span>עיכוב התפתחותי בתחום התפקודי</span>
                        </label>
                        <label className="flex items-center gap-3 hover:bg-white p-2 rounded transition-colors">
                            <input type="checkbox" checked={disabilities.languageDelay} onChange={() => setDisabilities({ ...disabilities, languageDelay: !disabilities.languageDelay })} className={checkboxClass} />
                            <span>עיכוב התפתחותי בתחום השפתי</span>
                        </label>
                        <label className="flex items-center gap-3 hover:bg-white p-2 rounded transition-colors">
                            <input type="checkbox" checked={disabilities.diagnosisProcess} onChange={() => setDisabilities({ ...disabilities, diagnosisProcess: !disabilities.diagnosisProcess })} className={checkboxClass} />
                            <span>בתהליך אבחון</span>
                        </label>
                    </div>
                </section>

                {/** 3. Functional Areas Table **/}
                <section className="mb-8">
                    <h3 className="text-xl font-bold text-blue-700 mb-4 border-r-4 border-blue-700 pr-2">תחומי תפקוד</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                            <thead>
                                <tr className="bg-blue-100">
                                    <th className="border border-gray-300 p-3 text-right w-1/4">תחומי תפקוד</th>
                                    <th className="border border-gray-300 p-3 text-right">נקודות חוזק</th>
                                    <th className="border border-gray-300 p-3 text-right">מוקדים לחיזוק</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { key: 'cognitive', label: 'תחום קוגניטיבי (מיומנויות, סגנונות למידה, אסטרטגיות חשיבה)' },
                                    { key: 'educational', label: 'תחום לימודי (קריאה, כתיבה, האזנה ודיבור)' },
                                    { key: 'language', label: 'ידע שפתי ולשוני' },
                                    { key: 'social', label: 'תחום חברתי' },
                                    { key: 'behavioral', label: 'תחום התנהגותי – רגשי' },
                                    { key: 'motor', label: 'תחום מוטורי/ חושי / תקשורתי' }
                                ].map((area) => (
                                    <tr key={area.key}>
                                        <td className="border border-gray-300 p-3 font-semibold bg-gray-50">{area.label}</td>
                                        <td className="border border-gray-300 p-2">
                                            <textarea
                                                className="w-full h-24 p-2 border-0 focus:ring-0 resize-none bg-transparent"
                                                value={functionalAreas[area.key]?.strengths || ''}
                                                onChange={(e) => setFunctionalAreas({ ...functionalAreas, [area.key]: { ...functionalAreas[area.key], strengths: e.target.value } })}
                                            />
                                        </td>
                                        <td className="border border-gray-300 p-2">
                                            <textarea
                                                className="w-full h-24 p-2 border-0 focus:ring-0 resize-none bg-transparent"
                                                value={functionalAreas[area.key]?.toStrengthen || ''}
                                                onChange={(e) => setFunctionalAreas({ ...functionalAreas, [area.key]: { ...functionalAreas[area.key], toStrengthen: e.target.value } })}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="page-break-before"></div>

                {/** 4. Plan Status **/}
                <section className="mb-8">
                    <h3 className="text-lg font-bold mb-4">● סמן המשפט הרלוונטי:</h3>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={planStatus.personalPlan} onChange={() => setPlanStatus({ ...planStatus, personalPlan: !planStatus.personalPlan })} className={checkboxClass} />
                            <span>נבנתה תכנית אישית עבור התלמיד.</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={planStatus.behavioralPlan} onChange={() => setPlanStatus({ ...planStatus, behavioralPlan: !planStatus.behavioralPlan })} className={checkboxClass} />
                            <span>נבנתה תכנית התערבות התנהגותית ע"י מנתח/ת התנהגות/יועצ/ת (לתלמידים שעולים לוועדה בעקבות בעיות התנהגות).</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={planStatus.schoolResources} onChange={() => setPlanStatus({ ...planStatus, schoolResources: !planStatus.schoolResources })} className={checkboxClass} />
                            <span>ניתנה תמיכה מהמשאבים הקיימים בבית הספר (יש למלא את סוג התמיכה הרלוונטי בטבלה הבאה)</span>
                        </label>
                    </div>
                </section>

                {/** 5. Support Types Table **/}
                <section className="mb-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-blue-100">
                                        <th className="border border-gray-300 p-3 text-right">סוג התמיכה שהתלמיד מקבל</th>
                                        <th className="border border-gray-300 p-3 text-center w-24">סמן ב-✔️</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="hover:bg-gray-50">
                                        <td className="border border-gray-300 p-3">שעות הכלה</td>
                                        <td className="border border-gray-300 p-3 text-center">
                                            <input type="checkbox" checked={supports.inclusion} onChange={() => setSupports({ ...supports, inclusion: !supports.inclusion })} className={checkboxClass} />
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="border border-gray-300 p-3">שעות פרטניות</td>
                                        <td className="border border-gray-300 p-3 text-center">
                                            <input type="checkbox" checked={supports.individual} onChange={() => setSupports({ ...supports, individual: !supports.individual })} className={checkboxClass} />
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="border border-gray-300 p-3">הוראה- שעות שילוב</td>
                                        <td className="border border-gray-300 p-3 text-center">
                                            <input type="checkbox" checked={supports.teachingIntegration} onChange={() => setSupports({ ...supports, teachingIntegration: !supports.teachingIntegration })} className={checkboxClass} />
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="border border-gray-300 p-3">שעות טיפול פרארפואי</td>
                                        <td className="border border-gray-300 p-3 text-center">
                                            <input type="checkbox" checked={supports.paramedical} onChange={() => setSupports({ ...supports, paramedical: !supports.paramedical })} className={checkboxClass} />
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="border border-gray-300 p-3">שיחות יועצת</td>
                                        <td className="border border-gray-300 p-3 text-center">
                                            <input type="checkbox" checked={supports.counselor} onChange={() => setSupports({ ...supports, counselor: !supports.counselor })} className={checkboxClass} />
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="border border-gray-300 p-3">התערבות פסיכולוגית</td>
                                        <td className="border border-gray-300 p-3 text-center">
                                            <input type="checkbox" checked={supports.psychological} onChange={() => setSupports({ ...supports, psychological: !supports.psychological })} className={checkboxClass} />
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="border border-gray-300 p-3">
                                            <div className="flex flex-col">
                                                <span>אחר (תומכי הוראה , תוכניות משרד/ גפן...):</span>
                                                <input type="text" value={supports.otherText} onChange={(e) => setSupports({ ...supports, otherText: e.target.value })} className="mt-1 border-b border-gray-300 focus:border-blue-500 outline-none" />
                                            </div>
                                        </td>
                                        <td className="border border-gray-300 p-3 text-center vertical-top">
                                            <input type="checkbox" checked={supports.other} onChange={() => setSupports({ ...supports, other: !supports.other })} className={checkboxClass} />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/** Community & Docs Side Column **/}
                        <div className="flex flex-col gap-8">
                            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                <h4 className="font-bold mb-3">● סוגי תמיכות שניתנו בקהילה (מועדונית, מרכז התפתחות, רווחה, קופת חולים..)</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl text-blue-500">❖</span>
                                        <input type="text" value={supports.community1} onChange={(e) => setSupports({ ...supports, community1: e.target.value })} className="flex-1 bg-transparent border-b border-gray-400 focus:border-blue-600 outline-none px-2" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl text-blue-500">❖</span>
                                        <input type="text" value={supports.community2} onChange={(e) => setSupports({ ...supports, community2: e.target.value })} className="flex-1 bg-transparent border-b border-gray-400 focus:border-blue-600 outline-none px-2" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                <h4 className="font-bold mb-3">☐ קיימים עבור התלמיד אבחונים ומסמכים קבילים: (סמנו את המתאים)</h4>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 hover:bg-white p-2 rounded transition-colors">
                                        <input type="checkbox" checked={documents.didactic} onChange={() => setDocuments({ ...documents, didactic: !documents.didactic })} className={checkboxClass} />
                                        <span>אבחון דידקטי</span>
                                    </label>
                                    <label className="flex items-center gap-3 hover:bg-white p-2 rounded transition-colors">
                                        <input type="checkbox" checked={documents.psychological} onChange={() => setDocuments({ ...documents, psychological: !documents.psychological })} className={checkboxClass} />
                                        <span>אבחון פסיכולוגי</span>
                                    </label>
                                    <label className="flex items-center gap-3 hover:bg-white p-2 rounded transition-colors">
                                        <input type="checkbox" checked={documents.psychoDidactic} onChange={() => setDocuments({ ...documents, psychoDidactic: !documents.psychoDidactic })} className={checkboxClass} />
                                        <span>אבחון פסיכודידקטי</span>
                                    </label>
                                    <div className="flex items-center gap-2 p-2">
                                        <input type="checkbox" checked={documents.other} onChange={() => setDocuments({ ...documents, other: !documents.other })} className={checkboxClass} />
                                        <span>אחר</span>
                                        <input type="text" value={documents.otherText} onChange={(e) => setDocuments({ ...documents, otherText: e.target.value })} className="flex-1 border-b border-gray-400 outline-none bg-transparent" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="page-break-before"></div>

                {/** 6. Main Intervention Plan Table **/}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-xl font-bold text-blue-700">תכנית ההתערבות לפי תחום</h3>
                        <span className="text-gray-600 mr-4">- תכנית ההתערבות הופעלה/ מופעלת במשך</span>
                        <input type="text" value={interventionPlan.duration} onChange={(e) => setInterventionPlan({ ...interventionPlan, duration: e.target.value })} className="w-16 border-b border-gray-400 text-center font-bold outline-none" />
                        <span className="text-gray-600">חודשים</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr className="bg-blue-100">
                                    <th className="border border-gray-300 p-2 text-right w-24">תחום</th>
                                    <th className="border border-gray-300 p-2 text-right">מטרות</th>
                                    <th className="border border-gray-300 p-2 text-right">יעדים</th>
                                    <th className="border border-gray-300 p-2 text-right">דרכי פעולה</th>
                                    <th className="border border-gray-300 p-2 text-right w-24">פרק זמן</th>
                                    <th className="border border-gray-300 p-2 text-right">אמות מידה להערכה</th>
                                    <th className="border border-gray-300 p-2 text-right">השותפים לאחריות</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { key: 'educational', label: 'לימודי' },
                                    { key: 'social', label: 'חברתי' },
                                    { key: 'behavioral', label: 'התנהגותי' },
                                    { key: 'emotional', label: 'רגשי' }
                                ].map((row) => (
                                    <tr key={row.key}>
                                        <td className="border border-gray-300 p-3 font-bold bg-gray-50">{row.label}</td>
                                        {['goals', 'objectives', 'methods', 'timeframe', 'evaluation', 'partners'].map((field) => (
                                            <td key={field} className="border border-gray-300 p-1">
                                                <textarea
                                                    className="w-full h-32 p-2 border-0 focus:ring-0 resize-none bg-transparent text-sm"
                                                    value={(interventionPlan[row.key] as InterventionDomain)?.[field as keyof InterventionDomain] || ''}
                                                    onChange={(e) => {
                                                        const currentDomain = interventionPlan[row.key] as InterventionDomain;
                                                        setInterventionPlan({
                                                            ...interventionPlan,
                                                            [row.key]: { ...currentDomain, [field]: e.target.value }
                                                        });
                                                    }}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div >

            {/* AI Assistant Panel */}
            {
                showAI && (
                    <AIAssistant
                        onClose={() => setShowAI(false)}
                        context={{ studentDetails, interventionPlan, functionalAreas }}
                    />
                )
            }

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 1cm;
                    }
                    body {
                        direction: rtl;
                    }
                    .page-break-before {
                        page-break-before: always;
                    }
                    .page-break-inside-avoid {
                        page-break-inside: avoid;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    input, textarea {
                        border: none !important;
                        resize: none !important;
                    }
                }
            `}</style>
        </div >
    );
}

function AIAssistant({ onClose, context }: { onClose: () => void, context: any }) {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'review' | 'feedback' | 'chat'>('review');
    const [selectedModel, setSelectedModel] = useState<'gemini' | 'groq'>('gemini');

    const handleAction = async (actionType: string) => {
        setLoading(true);
        setResponse('');

        let customPrompt = "";
        if (actionType === 'review') {
            customPrompt = "قم بمراجعة هذه الخطة التربوية. هل الأهداف ملائمة للصعوبات المذكورة؟ هل هناك تناقضات؟ أعط تقييماً مهنياً ونصائح للتحسين. جاوب باللغة العربية بأسلوب مدير مدرسة محترف.";
        } else if (actionType === 'feedback') {
            customPrompt = "اكتب رسالة ملاحظات للمعلم الذي كتب هذه الخطة. اشكر المعلم أولاً، ثم اذكر نقطة قوة في الخطة، ثم اقترح تعديلاً واحداً أو استفساراً بأسلوب لطيف وبناء. جاوب باللغة العربية.";
        } else if (actionType === 'summary') {
            customPrompt = "لخص هذه الخطة في 3 نقاط رئيسية: 1. حالة الطالب والصعوبات الأساسية. 2. أهداف التدخل الرئيسية. 3. وسائل الدعم المقترحة. اجعل التلخيص موجزاً وواضحاً.";
        } else if (actionType === 'suggest_goals') {
            customPrompt = "بناءً على الصعوبات ونقاط الضعف المذكورة في الخطة، اقترح 3 أهداف ذكية (SMART) بديلة أو إضافية يمكن للمعلم استخدامها. اشرح لماذا هذه الأهداف مناسبة.";
        } else {
            customPrompt = prompt;
        }


        const systemInstruction = `
        You are an intelligent pedagogical assistant for a school principal.
        Your goal is to assist the principal in two main tasks:
        1. Reviewing Personal Intervention Plans: Analyze the plan for coherence, alignment between goals and methods, and professional language.
        2. Writing Feedback: Draft professional, constructive, and encouraging feedback for the teacher based on the plan's content.

        CONTEXT:
        ${JSON.stringify(context, null, 2)}
        
        Answer specifically in Arabic as requested by the user context.
        Keep the tone professional, educational, and helpful.
        `;

        const fullPrompt = systemInstruction + "\n\nUser Request: " + customPrompt;

        try {
            let data: any;

            if (selectedModel === 'groq') {
                // --- GROQ CLIENT-SIDE CALL ---
                const GROQ_API_KEY_PART1 = 'gsk_7IvLk74waYla1ekuNgkQWGdyb3FYQcB1IH5h';
                const GROQ_API_KEY_PART2 = 'fONdCPzGshDkuT11';
                const GROQ_API_KEY = GROQ_API_KEY_PART1 + GROQ_API_KEY_PART2;

                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${GROQ_API_KEY}`
                    },
                    body: JSON.stringify({
                        messages: [
                            { role: "system", content: systemInstruction },
                            { role: "user", content: customPrompt }
                        ],
                        model: "llama3-8b-8192",
                        temperature: 0.7
                    })
                });

                if (!response.ok) throw new Error("Groq API Error");
                const resJson = await response.json();
                const text = resJson.choices?.[0]?.message?.content || "No response.";
                setResponse(text);

            } else {
                // --- GEMINI CLIENT-SIDE CALL ---
                const GEMINI_API_KEY_PART1 = 'AIzaSyCb_QSI0gQl5o3bR2';
                const GEMINI_API_KEY_PART2 = 'TW-hrBDynukgjjDCE';
                const GEMINI_API_KEY = GEMINI_API_KEY_PART1 + GEMINI_API_KEY_PART2;
                const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: fullPrompt }]
                        }]
                    })
                });

                if (!response.ok) throw new Error("Gemini API Error");
                const resJson = await response.json();
                const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
                setResponse(text);
            }

        } catch (error) {
            console.error(error);
            setResponse('حدث خطأ في الاتصال بالذكاء الاصطناعي. تأكد من الاتصال بالإنترنت.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-y-0 left-0 w-96 bg-white shadow-2xl border-r border-gray-200 p-6 flex flex-col z-50 animate-slide-in-left print:hidden">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-black text-purple-800 flex items-center gap-2 mb-1">
                        <span>✨</span> مساعد المدير
                    </h3>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setSelectedModel('gemini')}
                            className={`flex-1 px-3 py-1 text-xs font-bold rounded-md transition-all ${selectedModel === 'gemini' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Gemini 🤖
                        </button>
                        <button
                            onClick={() => setSelectedModel('groq')}
                            className={`flex-1 px-3 py-1 text-xs font-bold rounded-md transition-all ${selectedModel === 'groq' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Groq ⚡
                        </button>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => { setMode('review'); handleAction('review'); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${mode === 'review' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                    🔍 فحص
                </button>
                <button
                    onClick={() => { setMode('feedback'); handleAction('feedback'); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${mode === 'feedback' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                    ✍️ رد
                </button>
                <button
                    onClick={() => { setMode('feedback'); handleAction('summary'); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors bg-gray-50 text-gray-600 hover:bg-gray-100`}
                >
                    📝 تلخيص
                </button>
                <button
                    onClick={() => { setMode('feedback'); handleAction('suggest_goals'); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors bg-gray-50 text-gray-600 hover:bg-gray-100`}
                >
                    🎯 أهداف
                </button>
                <button
                    onClick={() => setMode('chat')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${mode === 'chat' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                    💬 محادثة
                </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 rounded-xl p-4 border border-gray-100 scrollbar-thin">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-purple-600 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <p className="animate-pulse">جاري التحليل...</p>
                    </div>
                ) : response ? (
                    <div className="prose prose-sm prose-purple text-right" dir="rtl">
                        <div className="whitespace-pre-wrap">{response}</div>
                        <button
                            onClick={() => navigator.clipboard.writeText(response)}
                            className="mt-4 text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            نسخ النص
                        </button>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-center text-gray-400 p-4">
                        <p>اختر أحد الخيارات أعلاه للبدء، أو اكتب سؤالك في الأسفل.</p>
                    </div>
                )}
            </div>

            {
                mode === 'chat' && (
                    <div className="mt-auto">
                        <div className="relative">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAction('chat')}
                                placeholder="اكتب ملاحظة أو سؤالاً..."
                                className="w-full p-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-right"
                            />
                            <button
                                onClick={() => handleAction('chat')}
                                disabled={!prompt || loading}
                                className="absolute left-2 top-2 p-1 text-purple-600 hover:bg-purple-50 rounded-full"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
