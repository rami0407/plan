'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { generateAcademicYearMonths, type MonthPlan } from '@/lib/academicCalendar';
import { TeachingStaffMember, IntegrationPlan, SchoolProfileRow, BookListRow, AnnualGoal } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

export default function EditPlanClient({ year }: { year: string }) {
    const router = useRouter();
    const academicYear = parseInt(year);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [profile, setProfile] = useState({
        name: 'مركز الرياضيات',
        subject: 'الرياضيات',
        teachers: ['المعلم أحمد', 'المعلمة فاطمة', 'المعلم محمود'],
        phone: '',
        email: ''
    });

    const [yearlyGoals, setYearlyGoals] = useState('');
    const [teachingStaff, setTeachingStaff] = useState<TeachingStaffMember[]>([
        { id: '1', name: 'المعلم أحمد', email: 'ahmad@school.edu', phone: '050-1234567', lastTraining: 'طرق تدريس حديثة', classes: 'سادس أ' },
        { id: '2', name: 'المعلمة فاطمة', email: 'fatima@school.edu', phone: '052-7654321', lastTraining: 'الذكاء الاصطناعي', classes: 'خامس ب' }
    ]);
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
    const [integrationPlans, setIntegrationPlans] = useState<IntegrationPlan[]>([]);
    // const [monthlyPlans, setMonthlyPlans] = useState<MonthPlan[]>([]);

    // New Tables State
    const [schoolProfileTable, setSchoolProfileTable] = useState<SchoolProfileRow[]>([
        { id: '1', className: '', teacherName: '', studentCount: 0, teachingHours: 0, individualHours: 0, outstandingCount: 0, strugglingCount: 0, notes: '' }
    ]);

    const [bookList, setBookList] = useState<BookListRow[]>([
        { id: '1', layer: '', bookName: '', publisher: '', author: '', year: '' }
    ]);

    // Integration Plan State
    const [showIntegrationModal, setShowIntegrationModal] = useState(false);
    const [currentIntegrationPlan, setCurrentIntegrationPlan] = useState<IntegrationPlan>({
        id: '',
        schoolName: '',
        schoolSymbol: '',
        locality: '',
        studentName: '',
        studentFamilyName: '',
        studentId: '',
        dateOfBirth: '',
        address: '',
        studentLocality: '',
        phone: '',
        grade: '',
        responsiblePerson: '',
        responsiblePersonRole: '',
        welfareStatus: '',
        regularAttendance: true,
        disabilities: {
            borderlineIntellect: false,
            behavioralEmotional: false,
            learningDisabilitiesADHD: false,
            developmentalDelayFunctional: false,
            developmentalDelayLanguage: false,
            diagnosisProcess: false
        },
        domains: {
            cognitive: { strengths: '', focus: '' },
            academic: { strengths: '', focus: '' },
            social: { strengths: '', focus: '' },
            emotional: { strengths: '', focus: '' },
            motor: { strengths: '', focus: '' }
        },
        generalInfo: {
            personalProgram: false,
            behavioralProgram: false,
            schoolSupport: false
        },
        supports: {
            inclusionHours: false,
            individualHours: false,
            teachingSupport: false,
            paramedical: false,
            conversations: false,
            psychologist: false,
            other: ''
        },
        communitySupports: '',
        assessments: {
            didactic: false,
            psychologic: false,
            psychodidactic: false,
            other: ''
        },
        domainPlans: {
            academic: { goal: '', objective: '', method: '', timeframe: '', evaluation: '', participants: '' },
            social: { goal: '', objective: '', method: '', timeframe: '', evaluation: '', participants: '' },
            emotional: { goal: '', objective: '', method: '', timeframe: '', evaluation: '', participants: '' },
            behavioral: { goal: '', objective: '', method: '', timeframe: '', evaluation: '', participants: '' }
        }
    });

    // File input ref for Excel upload
    const excelFileInputRef = useRef<HTMLInputElement>(null);

    const openIntegrationModal = (plan?: IntegrationPlan) => {
        if (plan) {
            setCurrentIntegrationPlan(plan);
        } else {
            setCurrentIntegrationPlan({
                id: Date.now().toString(),
                schoolName: '',
                schoolSymbol: '',
                locality: '',
                studentName: '',
                studentFamilyName: '',
                studentId: '',
                dateOfBirth: '',
                address: '',
                studentLocality: '',
                phone: '',
                grade: '',
                responsiblePerson: '',
                responsiblePersonRole: '',
                welfareStatus: '',
                regularAttendance: true,
                disabilities: {
                    borderlineIntellect: false,
                    behavioralEmotional: false,
                    learningDisabilitiesADHD: false,
                    developmentalDelayFunctional: false,
                    developmentalDelayLanguage: false,
                    diagnosisProcess: false
                },
                domains: {
                    cognitive: { strengths: '', focus: '' },
                    academic: { strengths: '', focus: '' },
                    social: { strengths: '', focus: '' },
                    emotional: { strengths: '', focus: '' },
                    motor: { strengths: '', focus: '' }
                },
                generalInfo: {
                    personalProgram: false,
                    behavioralProgram: false,
                    schoolSupport: false
                },
                supports: {
                    inclusionHours: false,
                    individualHours: false,
                    teachingSupport: false,
                    paramedical: false,
                    conversations: false,
                    psychologist: false,
                    other: ''
                },
                communitySupports: '',
                assessments: {
                    didactic: false,
                    psychologic: false,
                    psychodidactic: false,
                    other: ''
                },
                domainPlans: {
                    academic: { goal: '', objective: '', method: '', timeframe: '', evaluation: '', participants: '' },
                    social: { goal: '', objective: '', method: '', timeframe: '', evaluation: '', participants: '' },
                    emotional: { goal: '', objective: '', method: '', timeframe: '', evaluation: '', participants: '' },
                    behavioral: { goal: '', objective: '', method: '', timeframe: '', evaluation: '', participants: '' }
                }
            });
        }
        setShowIntegrationModal(true);
    };

    const saveIntegrationPlan = () => {
        setIntegrationPlans(prev => {
            const exists = prev.find(p => p.id === currentIntegrationPlan.id);
            if (exists) {
                return prev.map(p => p.id === currentIntegrationPlan.id ? currentIntegrationPlan : p);
            }
            return [...prev, currentIntegrationPlan];
        });
        setShowIntegrationModal(false);
    };

    const deleteIntegrationPlan = (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذه الخطة؟')) {
            setIntegrationPlans(prev => prev.filter(p => p.id !== id));
        }
    };

    const updateSchoolProfileRow = (id: string, field: string, value: any) => {
        setSchoolProfileTable(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const updateBookListRow = (id: string, field: string, value: any) => {
        setBookList(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const { user } = useAuth(); // Get authenticated user

    useEffect(() => {
        if (!user) return; // Wait for user to be loaded

        const fetchPlan = async () => {
            try {
                // Use composite key: year_userId to ensure each coordinator has their own plan
                const planId = `${year}_${user.uid}`;
                const docRef = doc(db, 'annualPlans', planId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.profile) setProfile(data.profile);
                    if (data.teachingStaff) setTeachingStaff(data.teachingStaff);
                    if (data.schoolProfileTable) setSchoolProfileTable(data.schoolProfileTable);
                    if (data.bookList) setBookList(data.bookList);
                    if (data.yearlyGoals) setYearlyGoals(data.yearlyGoals);
                    if (data.goals) setGoals(data.goals);
                    if (data.integrationPlans) setIntegrationPlans(data.integrationPlans);
                } else {
                    // Pre-fill profile with user data if new plan
                    setProfile(prev => ({
                        ...prev,
                        name: user.displayName || '',
                        email: user.email || ''
                    }));
                }
            } catch (error) {
                console.error("Error fetching plan:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlan();
    }, [year, user]);

    const [goals, setGoals] = useState<AnnualGoal[]>([
        {
            id: '1',
            title: 'تحسين مستوى الطلاب في الرياضيات',
            objective: 'رفع معدل النجاح من 75% إلى 85%',
            tasks: [
                { id: 't1', task: '', steps: '', startDate: '', responsible: '', status: 'not-started' as 'not-started' | 'partial' | 'completed' }
            ]
        }
    ]);



    // const updateWeekField = (monthIndex: number, weekIndex: number, field: string, value: any) => {
    //     setMonthlyPlans(prev => prev.map((m, mi) =>
    //         mi === monthIndex
    //             ? { ...m, weeks: m.weeks.map((w, wi) => wi === weekIndex ? { ...w, [field]: value } : w) }
    //             : m
    //     ));
    // };

    const addGoal = () => {
        setGoals([...goals, {
            id: Date.now().toString(),
            title: '',
            objective: '',
            tasks: [{ id: 't1', task: '', steps: '', startDate: '', responsible: '', status: 'not-started' as 'not-started' | 'partial' | 'completed' }]
        }]);
    };

    const addTask = (goalId: string) => {
        setGoals(goals.map(g =>
            g.id === goalId
                ? { ...g, tasks: [...g.tasks, { id: `t${Date.now()}`, task: '', steps: '', startDate: '', responsible: '', status: 'not-started' as 'not-started' | 'partial' | 'completed' }] }
                : g
        ));
    };

    const deleteTask = (goalId: string, taskId: string) => {
        setGoals(goals.map(g =>
            g.id === goalId
                ? { ...g, tasks: g.tasks.filter(t => t.id !== taskId) }
                : g
        ));
    };

    const updateTask = (goalId: string, taskId: string, field: string, value: any) => {
        setGoals(goals.map(g =>
            g.id === goalId
                ? { ...g, tasks: g.tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t) }
                : g
        ));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-gradient-to-r from-green-500 to-emerald-600';
            case 'partial': return 'bg-gradient-to-r from-orange-500 to-amber-600';
            default: return 'bg-gradient-to-r from-red-500 to-rose-600';
        }
    };

    // PDF Export Function
    const exportToPDF = () => {
        window.print();
    };

    // Excel Import Function
    const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        alert('🔵 TEST: Function called!');
        console.log('🔵 Excel Import: Function called');
        const file = e.target.files?.[0];
        if (!file) {
            console.log('❌ Excel Import: No file selected');
            alert('❌ TEST: No file!');
            return;
        }

        alert(`✅ TEST: File selected: ${file.name}`);
        console.log('✅ Excel Import: File selected:', file.name, 'Size:', file.size, 'bytes');

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                console.log('🔵 Excel Import: FileReader loaded');
                const data = evt.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                console.log('📊 Excel Import: Workbook loaded. Sheets:', workbook.SheetNames);

                let importedCount = 0;

                // Read School Profile sheet
                if (workbook.SheetNames.includes('School Profile')) {
                    console.log('🔵 Processing School Profile sheet...');
                    const ws = workbook.Sheets['School Profile'];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(ws);
                    console.log('📄 School Profile rows:', jsonData.length);

                    if (jsonData.length > 0) {
                        const newProfiles: SchoolProfileRow[] = jsonData.map((row, index) => ({
                            id: Date.now().toString() + index,
                            className: row['الصف'] || row['Class'] || '',
                            teacherName: row['اسم المعلم'] || row['Teacher Name'] || '',
                            studentCount: Number(row['عدد الطلاب']) || Number(row['Students']) || 0,
                            teachingHours: Number(row['ساعات تعليمية']) || Number(row['Teaching Hours']) || 0,
                            individualHours: Number(row['ساعات فردية']) || Number(row['Individual Hours']) || 0,
                            outstandingCount: Number(row['متميزون']) || Number(row['Outstanding']) || 0,
                            strugglingCount: Number(row['متعثرون']) || Number(row['Struggling']) || 0,
                            notes: row['ملاحظات'] || row['Notes'] || ''
                        }));
                        setSchoolProfileTable(newProfiles);
                        importedCount++;
                        console.log('✅ School Profile imported:', newProfiles.length, 'rows');
                    }
                } else {
                    console.log('⚠️ School Profile sheet not found');
                }

                // Read Book List sheet
                if (workbook.SheetNames.includes('Book List')) {
                    console.log('🔵 Processing Book List sheet...');
                    const ws = workbook.Sheets['Book List'];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(ws);
                    console.log('📄 Book List rows:', jsonData.length);

                    if (jsonData.length > 0) {
                        const newBooks: BookListRow[] = jsonData.map((row, index) => ({
                            id: Date.now().toString() + index,
                            layer: row['الطبقة'] || row['Layer'] || '',
                            bookName: row['اسم الكتاب'] || row['Book Name'] || '',
                            publisher: row['الناشر'] || row['Publisher'] || '',
                            author: row['المؤلف'] || row['Author'] || '',
                            year: row['السنة'] || row['Year'] || ''
                        }));
                        setBookList(newBooks);
                        importedCount++;
                        console.log('✅ Book List imported:', newBooks.length, 'rows');
                    }
                } else {
                    console.log('⚠️ Book List sheet not found');
                }

                // Read Teaching Staff sheet
                if (workbook.SheetNames.includes('Teaching Staff')) {
                    console.log('🔵 Processing Teaching Staff sheet...');
                    const ws = workbook.Sheets['Teaching Staff'];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(ws);
                    console.log('📄 Teaching Staff rows:', jsonData.length);

                    if (jsonData.length > 0) {
                        const newStaff: TeachingStaffMember[] = jsonData.map((row, index) => ({
                            id: Date.now().toString() + index,
                            name: row['اسم المعلم'] || row['Name'] || '',
                            email: row['البريد'] || row['Email'] || '',
                            phone: row['الهاتف'] || row['Phone'] || '',
                            lastTraining: row['آخر استكمال'] || row['Last Training'] || '',
                            classes: row['الصفوف'] || row['Classes'] || ''
                        }));
                        setTeachingStaff(newStaff);
                        importedCount++;
                        console.log('✅ Teaching Staff imported:', newStaff.length, 'rows');
                    }
                } else {
                    console.log('⚠️ Teaching Staff sheet not found');
                }

                if (importedCount > 0) {
                    alert(`✅ تم استيراد البيانات من Excel بنجاح!\n\nتم استيراد ${importedCount} جدول/جداول.\n\n⚠️ لا تنسَ الحفظ للاحتفاظ بالتغييرات!`);
                    console.log('✅ Excel Import: Complete! Imported', importedCount, 'tables');
                } else {
                    alert('⚠️ لم يتم العثور على أي جداول!\n\nتأكد من وجود sheets بأسماء:\n- School Profile\n- Book List\n- Teaching Staff');
                    console.log('⚠️ Excel Import: No tables found in workbook');
                }
            } catch (error) {
                console.error('❌ Excel import error:', error);
                alert('❌ حدث خطأ أثناء قراءة ملف Excel.\n\nتأكد من صحة الملف والصيغة.\n\nافتح Console (F12) لمزيد من التفاصيل.');
            }
        };

        reader.onerror = (error) => {
            console.error('❌ FileReader error:', error);
            alert('❌ حدث خطأ أثناء قراءة الملف.');
        };

        console.log('🔵 Excel Import: Starting to read file...');
        reader.readAsBinaryString(file);
    };

    // Excel Export Function
    const handleExcelExport = () => {
        try {
            const wb = XLSX.utils.book_new();

            // Export School Profile
            const profileData = [
                ['الصف', 'اسم المعلم', 'عدد الطلاب', 'ساعات تعليمية', 'ساعات فردية', 'متميزون', 'متعثرون', 'ملاحظات'],
                ...schoolProfileTable.map(row => [
                    row.className,
                    row.teacherName,
                    row.studentCount,
                    row.teachingHours,
                    row.individualHours,
                    row.outstandingCount,
                    row.strugglingCount,
                    row.notes
                ])
            ];
            const wsProfile = XLSX.utils.aoa_to_sheet(profileData);
            XLSX.utils.book_append_sheet(wb, wsProfile, 'School Profile');

            // Export Book List
            const bookData = [
                ['الطبقة', 'اسم الكتاب', 'الناشر', 'المؤلف', 'السنة'],
                ...bookList.map(row => [
                    row.layer,
                    row.bookName,
                    row.publisher,
                    row.author,
                    row.year
                ])
            ];
            const wsBooks = XLSX.utils.aoa_to_sheet(bookData);
            XLSX.utils.book_append_sheet(wb, wsBooks, 'Book List');

            // Export Teaching Staff
            const staffData = [
                ['اسم المعلم', 'البريد', 'الهاتف', 'آخر استكمال', 'الصفوف'],
                ...teachingStaff.map(row => [
                    row.name,
                    row.email,
                    row.phone,
                    row.lastTraining,
                    row.classes
                ])
            ];
            const wsStaff = XLSX.utils.aoa_to_sheet(staffData);
            XLSX.utils.book_append_sheet(wb, wsStaff, 'Teaching Staff');

            // Save file
            XLSX.writeFile(wb, `annual_plan_${year}.xlsx`);
            alert('✅ تم تصدير الخطة إلى Excel بنجاح!');
        } catch (error) {
            console.error('Excel export error:', error);
            alert('❌ حدث خطأ أثناء تصدير البيانات.');
        }
    };

    const handleSave = async () => {
        if (!user) {
            alert('⚠️ يجب تسجيل الدخول أولاً لحفظ البيانات!\n\nالرجاء تسجيل الدخول والمحاولة مرة أخرى.');
            return;
        }
        setSaving(true);
        try {
            const planData = {
                id: `${year}_${user.uid}`, // Save ID in doc too
                year: parseInt(year),
                coordinatorName: profile.name, // Ensure these are saved for Principal's list
                subject: profile.subject,
                userId: user.uid,
                profile,
                teachingStaff,
                schoolProfileTable,
                bookList,
                yearlyGoals,
                goals,
                integrationPlans,
                updatedAt: Date.now(),
                status: 'draft', // Default status
                completionRate: 50, // Calculate dynamically later
                goalsCount: goals.length,
                tasksCount: goals.reduce((acc, g) => acc + g.tasks.length, 0)
            };

            console.log('Saving plan data:', planData); // Debug log
            await setDoc(doc(db, 'annualPlans', `${year}_${user.uid}`), planData, { merge: true });
            console.log('Save successful!'); // Debug log
            alert('✅ تم حفظ الخطة كمسودة بنجاح');
        } catch (error) {
            console.error("Error saving plan:", error);
            alert('❌ حدث خطأ أثناء الحفظ: ' + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleSendForReview = async () => {
        if (!user) {
            alert('⚠️ يجب تسجيل الدخول أولاً لإرسال الخطة!\n\nالرجاء تسجيل الدخول والمحاولة مرة أخرى.');
            return;
        }
        if (!confirm('هل أنت متأكد من إرسال الخطة للمدير للمراجعة؟')) return;
        setSaving(true);
        try {
            // 1. Save data with status 'pending'
            const planData = {
                id: `${year}_${user.uid}`,
                year: parseInt(year),
                coordinatorName: profile.name,
                subject: profile.subject,
                userId: user.uid,
                profile,
                teachingStaff,
                schoolProfileTable,
                bookList,
                yearlyGoals,
                goals,
                integrationPlans,
                updatedAt: Date.now(),
                status: 'pending',
                completionRate: 70, // Example
                goalsCount: goals.length,
                tasksCount: goals.reduce((acc, g) => acc + g.tasks.length, 0)
            };

            console.log('Sending plan for review:', planData); // Debug log
            await setDoc(doc(db, 'annualPlans', `${year}_${user.uid}`), planData, { merge: true });

            // 2. Create Notification for Principal
            const { createNotification } = await import('@/lib/firestoreService');
            await createNotification({
                type: 'plan_submission',
                senderName: profile.name,
                senderRole: profile.subject,
                title: `تقديم خطة العمل السنوية ${year}`,
                message: `قام ${profile.name} بتقديم خطة العمل السنوية للعام ${year} للمراجعة والاعتماد.`,
                recipientId: 'admin',
                link: `/dashboard/planning/view/${year}?userId=${user.uid}`, // Correct View Route for Principal
            });

            alert('🚀 تم إرسال الخطة للمدير بنجاح!');
        } catch (error) {
            console.error("Error submitting plan:", error);
            alert('❌ حدث خطأ أثناء الإرسال: ' + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate-fade-in pb-20">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="text-primary hover:text-primary-dark inline-flex items-center gap-2 font-bold text-lg transition-colors hover:gap-3"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="19" x2="5" y1="12" y2="12" /><polyline points="12 19 5 12 12 5" />
                        </svg>
                        العودة
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-2xl shadow-xl">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="mb-1">خطة العمل السنوية {year}</h1>
                            <p className="text-gray-500 text-lg">التخطيط المبني على التقويم الدراسي</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    {/* Hidden File Input */}
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelImport}
                        className="hidden"
                        id="excel-import-input"
                    />

                    {/* Import Excel Button */}
                    <label
                        htmlFor="excel-import-input"
                        className="btn bg-purple-600 hover:bg-purple-700 text-white text-lg px-6 py-3 flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-1 cursor-pointer"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" x2="12" y1="15" y2="3"></line>
                        </svg>
                        استيراد Excel
                    </label>

                    <button
                        onClick={handleSendForReview}
                        disabled={saving}
                        className="btn bg-green-600 hover:bg-green-700 text-white text-lg px-6 py-3 flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-1"
                    >
                        {saving ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"></path><path d="M22 2L15 22L11 13L2 9L22 2Z"></path></svg>
                        )}
                        إرسال للمدير
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn bg-blue-600 hover:bg-blue-700 text-white text-lg px-6 py-3 flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-1"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        حفظ مسودة
                    </button>

                    <button
                        onClick={exportToPDF}
                        className="btn btn-ghost border-2 border-primary text-lg px-6 py-3 flex items-center gap-2 hover:bg-primary hover:text-white"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        تنزيل PDF
                    </button>

                    {/* Hidden file input for Excel import */}
                    <input
                        type="file"
                        ref={excelFileInputRef}
                        onChange={handleExcelImport}
                        accept=".xlsx,.xls"
                        className="hidden"
                    />

                    {/* Excel Import Button */}
                    <button
                        onClick={() => excelFileInputRef.current?.click()}
                        className="btn bg-purple-600 hover:bg-purple-700 text-white text-lg px-6 py-3 flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-1"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        استيراد Excel
                    </button>

                    {/* Excel Export Button */}
                    <button
                        onClick={handleExcelExport}
                        className="btn bg-indigo-600 hover:bg-indigo-700 text-white text-lg px-6 py-3 flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-1"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        تصدير Excel
                    </button>
                </div>
            </div>

            {/* Print Title (only shows in PDF) */}
            <div className="hidden print:block mb-8 text-center">
                <h1 className="text-4xl font-black mb-2">خطة العمل السنوية {year}</h1>
                <p className="text-xl text-gray-600">{profile.name} - {profile.subject}</p>
            </div>

            {/* Profile Section */}
            <div className="glass-panel p-8 mb-8 relative overflow-hidden print:border print:border-gray-300">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] print:hidden"></div>

                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] rounded-2xl shadow-lg print:hidden">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 1 0-16 0" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black">ملف المركز والمادة</h2>
                        <p className="text-gray-600">المعلومات الأساسية والمعلمون</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 print:gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-3 text-gray-700">اسم المركز</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl print:border print:border-gray-400 print:p-2 focus:border-primary focus:ring-4 focus:ring-primary/20 font-bold text-lg transition-all shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-3 text-gray-700">المادة الدراسية</label>
                        <input
                            type="text"
                            value={profile.subject}
                            onChange={(e) => setProfile({ ...profile, subject: e.target.value })}
                            className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl print:border print:border-gray-400 print:p-2 focus:border-primary focus:ring-4 focus:ring-primary/20 font-bold text-lg transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>


            {/* Teaching Staff Table */}
            <div className="glass-panel p-8 mb-8 print:border print:border-gray-300">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl text-blue-600 print:hidden">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black">طاقم التدريس</h2>
                            <p className="text-gray-600 text-sm">تفاصيل المعلمين في الطاقم</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const newId = Date.now().toString();
                            setTeachingStaff([...teachingStaff, {
                                id: newId,
                                name: '',
                                email: '',
                                phone: '',
                                lastTraining: '',
                                classes: ''
                            }]);
                            setEditingStaffId(newId);
                        }}
                        className="btn btn-primary px-4 py-2 print:hidden flex items-center gap-2"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        إضافة معلم
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b-2 border-gray-200">
                                <th className="p-3 text-right font-bold text-gray-700">اسم المعلم</th>
                                <th className="p-3 text-right font-bold text-gray-700">البريد الإلكتروني</th>
                                <th className="p-3 text-right font-bold text-gray-700">رقم الهاتف</th>
                                <th className="p-3 text-right font-bold text-gray-700">آخر استكمال</th>
                                <th className="p-3 text-right font-bold text-gray-700">الصفوف التي يعلمها</th>
                                <th className="p-3 print:hidden w-24"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachingStaff.map((staff) => {
                                const isEditing = editingStaffId === staff.id;
                                return (
                                    <tr key={staff.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                        <td className="p-2">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={staff.name}
                                                    onChange={(e) => setTeachingStaff(teachingStaff.map(s => s.id === staff.id ? { ...s, name: e.target.value } : s))}
                                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                                    placeholder="اسم المعلم"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="px-3 py-2 font-medium">{staff.name || '-'}</div>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            {isEditing ? (
                                                <input
                                                    type="email"
                                                    value={staff.email}
                                                    onChange={(e) => setTeachingStaff(teachingStaff.map(s => s.id === staff.id ? { ...s, email: e.target.value } : s))}
                                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                                    placeholder="example@school.edu"
                                                />
                                            ) : (
                                                <div className="px-3 py-2 text-gray-600" style={{ direction: 'ltr', textAlign: 'right' }}>{staff.email || '-'}</div>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            {isEditing ? (
                                                <input
                                                    type="tel"
                                                    value={staff.phone}
                                                    onChange={(e) => setTeachingStaff(teachingStaff.map(s => s.id === staff.id ? { ...s, phone: e.target.value } : s))}
                                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                                    placeholder="05X-XXXXXXX"
                                                />
                                            ) : (
                                                <div className="px-3 py-2 text-gray-600" style={{ direction: 'ltr', textAlign: 'right' }}>{staff.phone || '-'}</div>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={staff.lastTraining}
                                                    onChange={(e) => setTeachingStaff(teachingStaff.map(s => s.id === staff.id ? { ...s, lastTraining: e.target.value } : s))}
                                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                                    placeholder="عنوان الاستكمال"
                                                />
                                            ) : (
                                                <div className="px-3 py-2 text-gray-600">{staff.lastTraining || '-'}</div>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={staff.classes}
                                                    onChange={(e) => setTeachingStaff(teachingStaff.map(s => s.id === staff.id ? { ...s, classes: e.target.value } : s))}
                                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                                    placeholder="مثال: خامس أ، سادس ب"
                                                />
                                            ) : (
                                                <div className="px-3 py-2 text-gray-600">{staff.classes || '-'}</div>
                                            )}
                                        </td>
                                        <td className="p-2 text-center print:hidden">
                                            <div className="flex items-center justify-center gap-1">
                                                {isEditing ? (
                                                    <button
                                                        onClick={() => setEditingStaffId(null)}
                                                        className="text-green-600 hover:text-green-700 p-2 hover:bg-green-50 rounded-full transition-colors"
                                                        title="حفظ"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setEditingStaffId(staff.id)}
                                                        className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-full transition-colors"
                                                        title="تعديل"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        if (confirm('هل أنت متأكد من حذف هذا المعلم؟')) {
                                                            setTeachingStaff(teachingStaff.filter(s => s.id !== staff.id));
                                                        }
                                                    }}
                                                    className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                                                    title="حذف"
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {teachingStaff.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                                        لا يوجد معلمين مضافين حالياً. اضغط على "إضافة معلم" للبدء.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* School Profile Table (פרופיל בית ספרי) */}
            <div className="glass-panel p-8 mb-8 print:border print:border-gray-300">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black">פרופיל בית ספרי (School Profile)</h2>
                    <button
                        onClick={() => {
                            setSchoolProfileTable([...schoolProfileTable, {
                                id: Date.now().toString(),
                                className: '',
                                teacherName: '',
                                studentCount: 0,
                                teachingHours: 0,
                                individualHours: 0,
                                outstandingCount: 0,
                                strugglingCount: 0,
                                notes: ''
                            }]);
                        }}
                        className="btn btn-primary px-4 py-2 print:hidden"
                    >
                        + إضافة صف
                    </button>
                </div>

                <div className="space-y-4">
                    {schoolProfileTable.map((row) => (
                        <div key={row.id} className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-sm hover:border-primary/20 transition-colors relative group">
                            <button
                                onClick={() => setSchoolProfileTable(prev => prev.filter(r => r.id !== row.id))}
                                className="absolute top-2 left-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                                title="حذف الصف"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">כיתה (الصف)</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50/50"
                                        value={row.className}
                                        onChange={e => updateSchoolProfileRow(row.id, 'className', e.target.value)}
                                        placeholder="اسم الصف..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">שם המורה (اسم المعلم)</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50/50"
                                        value={row.teacherName}
                                        onChange={e => updateSchoolProfileRow(row.id, 'teacherName', e.target.value)}
                                        placeholder="اسم المعلم..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">מספר תלמידים (عدد الطلاب)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50/50 text-center"
                                        value={row.studentCount}
                                        onChange={e => updateSchoolProfileRow(row.id, 'studentCount', Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">שעות לימוד (ساعات تعليمية)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50/50 text-center"
                                        value={row.teachingHours}
                                        onChange={e => updateSchoolProfileRow(row.id, 'teachingHours', Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">שעות פרטניות (ساعات فردية)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50/50 text-center"
                                        value={row.individualHours}
                                        onChange={e => updateSchoolProfileRow(row.id, 'individualHours', Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">מצטיינים (متميزون)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50/50 text-center"
                                        value={row.outstandingCount}
                                        onChange={e => updateSchoolProfileRow(row.id, 'outstandingCount', Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">מתקשים (متعثرون)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50/50 text-center"
                                        value={row.strugglingCount}
                                        onChange={e => updateSchoolProfileRow(row.id, 'strugglingCount', Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">הערות (ملاحظات)</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50/50"
                                        value={row.notes}
                                        onChange={e => updateSchoolProfileRow(row.id, 'notes', e.target.value)}
                                        placeholder="ملاحظات..."
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {schoolProfileTable.length === 0 && (
                        <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                            لا توجد صفوف مضافة. اضغط على "إضافة صف" للبدء.
                        </div>
                    )}
                </div>
            </div>

            {/* Book List Table (רשימת הספרים) */}
            <div className="glass-panel p-8 mb-8 print:border print:border-gray-300">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black">רשימת הספרים (Book List)</h2>
                    <button
                        onClick={() => {
                            setBookList([...bookList, {
                                id: Date.now().toString(),
                                layer: '',
                                bookName: '',
                                publisher: '',
                                author: '',
                                year: ''
                            }]);
                        }}
                        className="btn btn-primary px-4 py-2 print:hidden"
                    >
                        + إضافة كتاب
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-right">
                        <thead>
                            <tr className="bg-gray-50 border-b-2 border-gray-200">
                                <th className="p-3 border">שכבה (الطبقة/الصف)</th>
                                <th className="p-3 border">שם הספר (اسم الكتاب)</th>
                                <th className="p-3 border">הוצאה (الناشر)</th>
                                <th className="p-3 border">שם מחבר (المؤلف)</th>
                                <th className="p-3 border">שנה (السنة)</th>
                                <th className="p-3 print:hidden w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookList.map((row) => (
                                <tr key={row.id} className="border-b hover:bg-gray-50">
                                    <td className="p-2 border"><input type="text" className="w-full bg-transparent" value={row.layer} onChange={e => updateBookListRow(row.id, 'layer', e.target.value)} /></td>
                                    <td className="p-2 border"><input type="text" className="w-full bg-transparent" value={row.bookName} onChange={e => updateBookListRow(row.id, 'bookName', e.target.value)} /></td>
                                    <td className="p-2 border"><input type="text" className="w-full bg-transparent" value={row.publisher} onChange={e => updateBookListRow(row.id, 'publisher', e.target.value)} /></td>
                                    <td className="p-2 border"><input type="text" className="w-full bg-transparent" value={row.author} onChange={e => updateBookListRow(row.id, 'author', e.target.value)} /></td>
                                    <td className="p-2 border"><input type="text" className="w-full bg-transparent text-center" value={row.year} onChange={e => updateBookListRow(row.id, 'year', e.target.value)} /></td>
                                    <td className="p-2 border text-center print:hidden">
                                        <button onClick={() => setBookList(prev => prev.filter(r => r.id !== row.id))} className="text-red-500 hover:text-red-700">×</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>



            {/* Annual Goals */}
            <div className="glass-panel p-8 mb-8 print:border print:border-gray-300">
                <h2 className="text-2xl font-black mb-4">الأهداف العامة للسنة</h2>
                <textarea
                    value={yearlyGoals}
                    onChange={(e) => setYearlyGoals(e.target.value)}
                    className="w-full px-6 py-5 bg-white border-3 border-primary/30 rounded-2xl h-48 print:border print:border-gray-400 print:h-auto print:min-h-32 focus:border-primary focus:ring-4 focus:ring-primary/20 font-medium text-lg transition-all resize-none shadow-lg"
                    placeholder="اكتب الأهداف الرئيسية..."
                />
            </div>

            {/* Goals and Tasks Table */}
            <div className="glass-panel p-8 mb-8 print:border print:border-gray-300">
                <div className="flex items-center justify-between mb-8 print:mb-4">
                    <h2 className="text-2xl font-black">جدول الأهداف والمهام التنفيذية</h2>
                    <button onClick={addGoal} className="btn btn-primary px-4 py-2 print:hidden flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        إضافة هدف جديد
                    </button>
                </div>

                <div className="space-y-8">
                    {goals.map(goal => (
                        <div key={goal.id} className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden shadow-sm hover:border-primary/20 transition-all">

                            {/* Simple Table */}
                            <table className="w-full border-collapse">
                                <tbody>
                                    {/* Goal Row */}
                                    <tr className="bg-primary/5">
                                        <td className="p-3 border-b border-primary/10 font-bold text-primary w-32 align-middle">الهدف</td>
                                        <td className="p-2 border-b border-primary/10" colSpan={5}>
                                            <input
                                                type="text"
                                                value={goal.title}
                                                onChange={(e) => setGoals(goals.map(g => g.id === goal.id ? { ...g, title: e.target.value } : g))}
                                                className="w-full px-3 py-2 bg-transparent border-none focus:ring-0 font-bold text-lg placeholder-gray-400"
                                                placeholder="اكتب الهدف..."
                                            />
                                        </td>
                                    </tr>

                                    {/* Objective Row */}
                                    <tr className="bg-primary/5">
                                        <td className="p-3 border-b border-primary/10 font-bold text-primary align-middle">المؤشر المستهدف</td>
                                        <td className="p-2 border-b border-primary/10" colSpan={5}>
                                            <input
                                                type="text"
                                                value={goal.objective}
                                                onChange={(e) => setGoals(goals.map(g => g.id === goal.id ? { ...g, objective: e.target.value } : g))}
                                                className="w-full px-3 py-2 bg-transparent border-none focus:ring-0 font-medium placeholder-gray-400"
                                                placeholder="اكتب المؤشر المستهدف..."
                                            />
                                        </td>
                                    </tr>

                                    {/* Table Header */}
                                    <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                                        <th className="p-3 text-right font-bold">المهمة</th>
                                        <th className="p-3 text-right font-bold">خطوات التنفيذ</th>
                                        <th className="p-3 text-right font-bold w-48">تاريخ البدء</th>
                                        <th className="p-3 text-right font-bold w-48">المسؤول</th>
                                        <th className="p-3 text-right font-bold w-32">الحالة</th>
                                        <th className="p-3 print:hidden w-12"></th>
                                    </tr>

                                    {/* Task Rows */}
                                    {goal.tasks.map(task => (
                                        <tr key={task.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-2 align-top">
                                                <input
                                                    type="text"
                                                    value={task.task}
                                                    onChange={(e) => updateTask(goal.id, task.id, 'task', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                                    placeholder="اكتب المهمة..."
                                                />
                                            </td>
                                            <td className="p-2 align-top">
                                                <textarea
                                                    value={task.steps}
                                                    onChange={(e) => updateTask(goal.id, task.id, 'steps', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-20 text-sm"
                                                    placeholder="اكتب الخطوات..."
                                                />
                                            </td>
                                            <td className="p-2 align-top">
                                                <input
                                                    type="date"
                                                    value={task.startDate}
                                                    onChange={(e) => updateTask(goal.id, task.id, 'startDate', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                                />
                                            </td>
                                            <td className="p-2 align-top">
                                                <input
                                                    type="text"
                                                    value={task.responsible}
                                                    onChange={(e) => updateTask(goal.id, task.id, 'responsible', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                                    placeholder="اسم المسؤول..."
                                                />
                                            </td>
                                            <td className="p-2 align-top">
                                                <select
                                                    value={task.status}
                                                    onChange={(e) => updateTask(goal.id, task.id, 'status', e.target.value)}
                                                    className={`w-full px-2 py-2 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary
                                                        ${task.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            task.status === 'partial' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                'bg-gray-50 text-gray-500 border-gray-200'}`}
                                                >
                                                    <option value="not-started">لم يُنفّذ</option>
                                                    <option value="partial">جزئياً</option>
                                                    <option value="completed">نُفّذ</option>
                                                </select>
                                            </td>
                                            <td className="p-2 align-top text-center print:hidden pt-4">
                                                <button
                                                    onClick={() => deleteTask(goal.id, task.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                                    title="حذف"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Add Task Button Row */}
                                    <tr className="print:hidden">
                                        <td colSpan={6} className="p-3 bg-gray-50 text-center border-t border-gray-100">
                                            <button
                                                onClick={() => addTask(goal.id)}
                                                className="text-primary hover:text-primary-dark font-bold text-sm flex items-center justify-center gap-2 mx-auto"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                إضافة مهمة جديدة لهذا الهدف
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>

            {/* Integration Plan Modal */}
            {
                showIntegrationModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                                <h3 className="text-2xl font-black">خطة دمج شخصية (הוראה פרטנית)</h3>
                                <button onClick={() => setShowIntegrationModal(false)} className="text-gray-500 hover:text-red-500">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                {/* Student Details */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div className="col-span-1">
                                        <label className="block text-sm font-bold mb-1">اسم الطالب</label>
                                        <input type="text" className="w-full p-2 border rounded" value={currentIntegrationPlan.studentName} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, studentName: e.target.value })} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-sm font-bold mb-1">اسم العائلة</label>
                                        <input type="text" className="w-full p-2 border rounded" value={currentIntegrationPlan.studentFamilyName} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, studentFamilyName: e.target.value })} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-sm font-bold mb-1">رقم الهوية</label>
                                        <input type="text" className="w-full p-2 border rounded" value={currentIntegrationPlan.studentId} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, studentId: e.target.value })} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-sm font-bold mb-1">الصف</label>
                                        <input type="text" className="w-full p-2 border rounded" value={currentIntegrationPlan.grade} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, grade: e.target.value })} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-sm font-bold mb-1">تاريخ الميلاد</label>
                                        <input type="date" className="w-full p-2 border rounded" value={currentIntegrationPlan.dateOfBirth} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, dateOfBirth: e.target.value })} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-sm font-bold mb-1">البلد</label>
                                        <input type="text" className="w-full p-2 border rounded" value={currentIntegrationPlan.studentLocality} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, studentLocality: e.target.value })} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold mb-1">عنوان السكن</label>
                                        <input type="text" className="w-full p-2 border rounded" value={currentIntegrationPlan.address} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, address: e.target.value })} />
                                    </div>
                                </div>

                                <hr className="my-6" />

                                {/* Characterization */}
                                <h4 className="font-bold text-lg mb-4">وصف الأداء (ضع إشارة)</h4>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={currentIntegrationPlan.disabilities.borderlineIntellect} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, disabilities: { ...currentIntegrationPlan.disabilities, borderlineIntellect: e.target.checked } })} className="w-5 h-5" />
                                        <span>ذكاء حدودي (אינטיליגנציה גבולית)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={currentIntegrationPlan.disabilities.behavioralEmotional} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, disabilities: { ...currentIntegrationPlan.disabilities, behavioralEmotional: e.target.checked } })} className="w-5 h-5" />
                                        <span>اضطرابات سلوكية/عاطفية (הפרעות התנהגות)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={currentIntegrationPlan.disabilities.learningDisabilitiesADHD} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, disabilities: { ...currentIntegrationPlan.disabilities, learningDisabilitiesADHD: e.target.checked } })} className="w-5 h-5" />
                                        <span>صعوبات تعلم / ADHD</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={currentIntegrationPlan.disabilities.developmentalDelayLanguage} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, disabilities: { ...currentIntegrationPlan.disabilities, developmentalDelayLanguage: e.target.checked } })} className="w-5 h-5" />
                                        <span>تأخر في التطور اللغوي (עיכוב שפתי)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={currentIntegrationPlan.disabilities.developmentalDelayFunctional} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, disabilities: { ...currentIntegrationPlan.disabilities, developmentalDelayFunctional: e.target.checked } })} className="w-5 h-5" />
                                        <span>تأخر في التطور الوظيفي (עיכוב תפקודי)</span>
                                    </label>
                                </div>

                                <hr className="my-6" />

                                {/* Domain Analysis */}
                                <h4 className="font-bold text-lg mb-4">تحليل المجالات (نقاط القوة والضعف)</h4>
                                {Object.entries(currentIntegrationPlan.domains).map(([key, domain]) => {
                                    const labels: Record<string, string> = { cognitive: 'المجال الذهني', academic: 'المجال التعليمي/اللغوي', social: 'المجال الاجتماعي', emotional: 'المجال العاطفي', motor: 'المجال الحسي/الحركي' };
                                    return (
                                        <div key={key} className="mb-4">
                                            <h5 className="font-bold text-primary mb-2">{labels[key]}</h5>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs text-gray-500">نقاط القوة</label>
                                                    <textarea
                                                        className="w-full p-2 border rounded resize-none h-20"
                                                        value={domain.strengths}
                                                        onChange={e => setCurrentIntegrationPlan({
                                                            ...currentIntegrationPlan,
                                                            domains: {
                                                                ...currentIntegrationPlan.domains,
                                                                [key]: { ...domain, strengths: e.target.value }
                                                            }
                                                        })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">نقاط الضعف (التركيز)</label>
                                                    <textarea
                                                        className="w-full p-2 border rounded resize-none h-20"
                                                        value={domain.focus}
                                                        onChange={e => setCurrentIntegrationPlan({
                                                            ...currentIntegrationPlan,
                                                            domains: {
                                                                ...currentIntegrationPlan.domains,
                                                                [key]: { ...domain, focus: e.target.value }
                                                            }
                                                        })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <hr className="my-6" />

                                {/* Plan Goals per Domain */}
                                <h4 className="font-bold text-lg mb-4">الخطة العلاجية حسب المجالات</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full border collapse text-sm">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="border p-2 w-24">المجال</th>
                                                <th className="border p-2">الهدف العام</th>
                                                <th className="border p-2">الأهداف العملية</th>
                                                <th className="border p-2">الطريقة/الوسائل</th>
                                                <th className="border p-2 w-24">المدة الزمنية</th>
                                                <th className="border p-2">التقييم</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(currentIntegrationPlan.domainPlans).map(([domainName, plan]) => {
                                                const labels: Record<string, string> = { academic: 'تعليمي', social: 'اجتماعي', emotional: 'عاطفي', behavioral: 'سلوكي' };
                                                return (
                                                    <tr key={domainName}>
                                                        <td className="border p-2 font-bold bg-gray-50">{labels[domainName]}</td>
                                                        <td className="border p-1"><textarea className="w-full h-full p-1 bg-transparent resize-none border-none focus:ring-0" rows={3} value={plan.goal} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, domainPlans: { ...currentIntegrationPlan.domainPlans, [domainName]: { ...plan, goal: e.target.value } } })} /></td>
                                                        <td className="border p-1"><textarea className="w-full h-full p-1 bg-transparent resize-none border-none focus:ring-0" rows={3} value={plan.objective} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, domainPlans: { ...currentIntegrationPlan.domainPlans, [domainName]: { ...plan, objective: e.target.value } } })} /></td>
                                                        <td className="border p-1"><textarea className="w-full h-full p-1 bg-transparent resize-none border-none focus:ring-0" rows={3} value={plan.method} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, domainPlans: { ...currentIntegrationPlan.domainPlans, [domainName]: { ...plan, method: e.target.value } } })} /></td>
                                                        <td className="border p-1"><input type="text" className="w-full p-1 bg-transparent border-none focus:ring-0" value={plan.timeframe} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, domainPlans: { ...currentIntegrationPlan.domainPlans, [domainName]: { ...plan, timeframe: e.target.value } } })} /></td>
                                                        <td className="border p-1"><textarea className="w-full h-full p-1 bg-transparent resize-none border-none focus:ring-0" rows={3} value={plan.evaluation} onChange={e => setCurrentIntegrationPlan({ ...currentIntegrationPlan, domainPlans: { ...currentIntegrationPlan.domainPlans, [domainName]: { ...plan, evaluation: e.target.value } } })} /></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                            </div>

                            <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
                                <button onClick={() => setShowIntegrationModal(false)} className="btn btn-ghost">إلغاء</button>
                                <button onClick={saveIntegrationPlan} className="btn btn-primary px-8">حفظ الخطة</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Sticky Action Bar */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white p-5 rounded-2xl shadow-2xl border-3 border-primary/20 flex gap-4 z-50 print:hidden">
                <button onClick={() => router.back()} className="btn btn-ghost px-6 py-3 text-lg">
                    إلغاء
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-ghost border-3 border-primary px-6 py-3 text-lg hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? 'جاري الحفظ...' : '💾 حفظ كمسودة'}
                </button>
                <button onClick={() => alert('✅ تم إرسال الخطة للمراجعة!')} className="btn btn-primary px-8 py-3 text-lg shadow-xl">
                    إرسال للموافقة
                </button>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
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
          .print\\:block {
            display: block !important;
          }
          .print\\:border {
            border-width: 1px !important;
          }
          input, textarea, select {
            border: 1px solid #999 !important;
            border-radius: 4px !important;
            padding: 4px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
        </div >
    );
}
