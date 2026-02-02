'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import HolisticGrid from '@/components/mapping/HolisticGrid';
import Link from 'next/link';
import {
    getStudents,
    getClass,
    addStudent,
    updateStudent,
    updateClass,
    deleteStudent,
    getStudentAssessments,
    saveStudentAssessments
} from '@/lib/firestoreService';
import { Student, ClassGroup, Term, StudentAssessment } from '@/lib/types';

export default function ClassDetailsClient({ classId }: { classId: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const decodedClassId = decodeURIComponent(classId);

    // Year from URL or current year
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    const [selectedTerm, setSelectedTerm] = useState<Term>('1');
    const [classData, setClassData] = useState<ClassGroup | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [assessments, setAssessments] = useState<Record<string, StudentAssessment>>({});
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Grid Data: Merged Student + Assessment
    const [gridData, setGridData] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [cls, allStudents, termAssessments] = await Promise.all([
                    getClass(decodedClassId),
                    getStudents(decodedClassId),
                    getStudentAssessments(decodedClassId, year, selectedTerm)
                ]);

                setClassData(cls);
                setStudents(allStudents);

                // Map assessments by studentId
                const assessmentsMap: Record<string, StudentAssessment> = {};
                termAssessments.forEach(ass => {
                    assessmentsMap[ass.studentId] = ass;
                });
                setAssessments(assessmentsMap);

                // Build Grid Data
                const merged = allStudents.map(student => {
                    const ass = assessmentsMap[student.id];
                    return {
                        ...student,
                        // Override/Add assessment specific fields
                        academicStatus: ass?.academicStatus || '',
                        socialStatus: ass?.socialStatus || '',
                        emotionalStatus: ass?.emotionalStatus || '',
                        economicStatus: ass?.economicStatus || '',
                        absences: ass?.absences || 0,
                        notes: ass?.notes || '',
                        grades: ass?.grades || {},
                        assessmentId: ass?.id || null
                    };
                });
                setGridData(merged);
            } catch (error) {
                console.error('Error fetching data:', error);
                alert('حدث خطأ أثناء تحميل البيانات');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [decodedClassId, year, selectedTerm]);

    const handleGridUpdate = (updatedData: any[]) => {
        setGridData(updatedData);
    };

    const handleFileExport = () => {
        if (gridData.length === 0) {
            alert('لا توجد بيانات لتصديرها');
            return;
        }

        const dataToExport = gridData.map((s: any) => {
            const row: any = {
                'الاسم': s.name,
                'المرحلة': classData?.name || '',
                'التحصيل الأكاديمي': s.academicStatus === 'Excellent' ? 'ممتاز' : s.academicStatus === 'Good' ? 'جيد' : s.academicStatus === 'Fair' ? 'متوسط' : s.academicStatus === 'Poor' ? 'ضعيف' : '',
                'الوضع الاجتماعي': s.socialStatus,
                'غيابات': s.absences,
                'ملاحظات': s.notes || ''
            };

            const subjects = classData?.subjects || ['Arabic', 'Hebrew', 'Math', 'English', 'Science'];
            subjects.forEach((sub: string) => {
                row[sub] = s.grades[sub] || '';
            });

            return row;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 30 }];

        XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
        XLSX.writeFile(wb, `Holistic_${classData?.name}_${year}_Term${selectedTerm}.xlsx`);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result as string;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // This is a simplified import that updates existing students in the grid
                const updatedGrid = gridData.map((student: any) => {
                    const row: any = data.find((r: any) => (r['Name'] || r['الاسم']) === student.name);
                    if (row) {
                        return {
                            ...student,
                            absences: row['Absences'] || row['غيابات'] || student.absences,
                            grades: {
                                ...student.grades,
                                Math: row['Math'] || row['رياضيات'] || student.grades.Math,
                                Arabic: row['Arabic'] || row['عربي'] || student.grades.Arabic,
                                Hebrew: row['Hebrew'] || row['عبري'] || student.grades.Hebrew,
                                English: row['English'] || row['انجليزي'] || student.grades.English,
                                Science: row['Science'] || row['علوم'] || student.grades.Science,
                            }
                        };
                    }
                    return student;
                });

                setGridData(updatedGrid);
                alert('✅ تم استيراد البيانات! اضغط "حفظ التغييرات" لتثبيتها.');
            } catch (err) {
                console.error(err);
                alert('❌ فشل الاستيراد. تأكد من توافق الملف.');
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleAddStudent = async () => {
        const name = prompt('اسم الطالب الجديد:');
        if (!name) return;

        try {
            const newStudent: Omit<Student, 'id'> = {
                classId: decodedClassId,
                name: name,
                academicStatus: 'Good',
                socialStatus: '',
                absences: 0,
                grades: {},
                notes: ''
            };
            const id = await addStudent(newStudent as Student);

            // Refresh student list and grid
            const allStudents = await getStudents(decodedClassId);
            setStudents(allStudents);

            // Add virtual blank assessment for this student to grid
            setGridData([...gridData, { ...newStudent, id, assessmentId: null }]);
        } catch (error) {
            console.error(error);
            alert('حدث خطأ');
        }
    };

    const handleDeleteStudent = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الطالب نهائياً؟')) return;
        try {
            await deleteStudent(id);
            setGridData(gridData.filter((s: any) => s.id !== id));
            setStudents(students.filter((s: Student) => s.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddSubject = async () => {
        const subject = prompt('اسم المادة/العمود الجديد:');
        if (!subject) return;

        const currentSubjects = classData?.subjects || ['Arabic', 'Hebrew', 'Math', 'English', 'Science'];
        if (currentSubjects.includes(subject)) return alert('المادة موجودة مسبقاً');

        const updatedSubjects = [...currentSubjects, subject];
        try {
            await updateClass(decodedClassId, { subjects: updatedSubjects });
            setClassData(prev => prev ? { ...prev, subjects: updatedSubjects } : null);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteSubject = async (subject: string) => {
        if (!confirm(`حذف عمود ${subject}؟`)) return;
        const updatedSubjects = (classData?.subjects || []).filter(s => s !== subject);
        try {
            await updateClass(decodedClassId, { subjects: updatedSubjects });
            setClassData(prev => prev ? { ...prev, subjects: updatedSubjects } : null);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const assessmentsToSave: StudentAssessment[] = gridData.map((item: any) => ({
                id: item.assessmentId || `${item.id}_${year}_${selectedTerm}`,
                studentId: item.id,
                classId: decodedClassId,
                year,
                term: selectedTerm,
                academicStatus: item.academicStatus || '',
                socialStatus: item.socialStatus || '',
                emotionalStatus: item.emotionalStatus || '',
                economicStatus: item.economicStatus || '',
                absences: item.absences || 0,
                notes: item.notes || '',
                grades: item.grades || {},
                updatedAt: Date.now()
            }));

            await saveStudentAssessments(assessmentsToSave);
            alert('✅ تم حفظ التقييمات للفصل الدراسي بنجاح!');

            // Refresh to update assessment IDs in gridData if they were new
            const termAssessments = await getStudentAssessments(decodedClassId, year, selectedTerm);
            const assessmentsMap: Record<string, StudentAssessment> = {};
            termAssessments.forEach(ass => assessmentsMap[ass.studentId] = ass);
            setAssessments(assessmentsMap);

            setGridData(gridData.map((item: any) => {
                const ass = assessmentsMap[item.id];
                return { ...item, assessmentId: ass?.id || null };
            }));

        } catch (error) {
            console.error('Error saving:', error);
            alert('❌ حدث خطأ أثناء الحفظ.');
        } finally {
            setSaving(false);
        }
    };

    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [analyzing, setAnalyzing] = useState(false);

    const generateAIAnalysis = async () => {
        setAnalyzing(true);
        setAiAnalysis('');

        // Prepare class data for AI
        const contextData = {
            className: classData?.name,
            year,
            term: selectedTerm,
            subjects: classData?.subjects || [],
            studentCount: gridData.length,
            stats: gridData.map((s: any) => ({
                name: s.name,
                academic: s.academicStatus,
                absences: s.absences,
                grades: s.grades
            }))
        };

        const systemInstruction = `
        You are an expert pedagogical consultant. Analyze the following class data.
        Provide a structured report in ARABIC including:
        1. **نقاط القوة**: (Strengths of the class)
        2. **التحديات الرئيسية**: (Main challenges)
        3. **توصيات وحلول**: (Concrete action plan/advice)
        4. **طلاب يحتاجون لمتابعة**: (Students needing individual attention)
        
        Keep it professional, data-driven, and encouraging.
        `;

        try {
            const GEMINI_API_KEY = 'AIzaSyCb_QSI0gQl5o3bR2TW-hrBDynukgjjDCE';
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: systemInstruction + "\n\nCLASS DATA (JSON):\n" + JSON.stringify(contextData) }]
                    }]
                })
            });
            if (!res.ok) throw new Error("Gemini Error");
            const json = await res.json();
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "لم يتم العثور على تحليل.";
            setAiAnalysis(text);
        } catch (error) {
            console.error(error);
            alert('❌ فشل توليد التحليل الذكوي.');
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;
    if (!classData) return <div className="p-8 text-center text-gray-500">الصف غير موجود</div>;

    const terms: { id: Term; label: string }[] = [
        { id: '1', label: 'الفصل الأول (فصل أ)' },
        { id: '2', label: 'الفصل الثاني (فصل ب)' },
        { id: '3', label: 'الفصل الثالث (فصل ج)' },
        { id: '4', label: 'الفصل الرابع (إضافي)' },
    ];

    return (
        <div className="animate-fade-in pb-20" dir="rtl">
            <div className="mb-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <Link href="/dashboard/classes" className="text-primary hover:text-primary-dark mb-4 inline-flex items-center gap-2 font-bold transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" x2="5" y1="12" y2="12" />
                                <polyline points="12 19 5 12 12 5" />
                            </svg>
                            العودة للصفوف
                        </Link>
                        <h1 className="text-4xl font-black mb-2 text-gray-800">
                            {classData.name} - {year} / {year + 1} 📊
                        </h1>
                        <p className="text-gray-500 text-lg">إدارة التقييمات والنتائج للهولستيك ماب</p>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={handleSave} disabled={saving} className="btn btn-primary shadow-xl shadow-primary/20 px-8">
                            {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التغييرات'}
                        </button>
                        <button onClick={handleFileExport} className="btn bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                            📤 تصدير
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="btn bg-white border-2 border-primary text-primary hover:bg-primary/5">
                            📥 استيراد
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx,.xls" />
                    </div>
                </div>

                {/* Term Selector Tabs */}
                <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1">
                    {terms.map((term) => (
                        <button
                            key={term.id}
                            onClick={() => setSelectedTerm(term.id)}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${selectedTerm === term.id
                                ? 'bg-white text-primary shadow-md'
                                : 'text-gray-500 hover:bg-gray-200/50'
                                }`}
                        >
                            {term.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-panel p-8 mb-8">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-black text-gray-800">سجل النتائج - الفصل {selectedTerm}</h3>
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-bold">{gridData.length} طالب</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAddStudent} className="px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 font-bold transition-all flex items-center gap-2">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            إضافة طالب
                        </button>
                        <button onClick={handleAddSubject} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 font-bold transition-all flex items-center gap-2">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                            إضافة مادة
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-inner border border-gray-100 overflow-hidden">
                    <HolisticGrid
                        students={gridData}
                        onUpdate={handleGridUpdate}
                        subjects={classData?.subjects}
                        onDeleteStudent={handleDeleteStudent}
                        onDeleteSubject={handleDeleteSubject}
                    />
                </div>
            </div>

            {/* AI ANALYSIS SECTION */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-3xl p-8 border border-purple-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-purple-500 opacity-50"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-purple-900 mb-2 flex items-center gap-3">
                            <span>✨</span> تحليل الذكاء الاصطناعي للمستوى الصفي
                        </h3>
                        <p className="text-purple-700/70 font-medium">استخراج العبر وخطط العمل بناءً على نتائج الفصل {selectedTerm}</p>
                    </div>
                    <button
                        onClick={generateAIAnalysis}
                        disabled={analyzing || gridData.length === 0}
                        className="btn bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200 px-8 py-3 rounded-2xl flex items-center gap-3 transition-transform active:scale-95"
                    >
                        {analyzing ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/50 border-t-white"></div>
                                <span>جاري استخراج العبر...</span>
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                <span>توليد تحليل ذكي 🌐</span>
                            </>
                        )}
                    </button>
                </div>

                {aiAnalysis ? (
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-white shadow-inner animate-fade-in">
                        <div className="prose prose-purple max-w-none text-right whitespace-pre-wrap leading-relaxed">
                            {aiAnalysis}
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(aiAnalysis);
                                    alert('✅ تم نسخ التحليل!');
                                }}
                                className="text-purple-600 font-bold hover:text-purple-800 text-sm flex items-center gap-2"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                نسخ هذا التقرير
                            </button>
                        </div>
                    </div>
                ) : !analyzing && (
                    <div className="text-center py-12 border-2 border-dashed border-purple-200 rounded-2xl bg-white/30 group-hover:bg-white/50 transition-colors">
                        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                        </div>
                        <h4 className="text-lg font-bold text-purple-900 mb-1">جاهز لتحليل بيانات الصف</h4>
                        <p className="text-purple-700/60 max-w-md mx-auto">سيقوم المساعد الذكي بمراجعة جميع العلامات وحالات الطلاب لتقديم تقرير شامل وخطط عمل مقترحة.</p>
                    </div>
                )}
            </div>

            {/* STATISTICAL ANALYSIS SECTION */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-8 border border-blue-100 shadow-sm mt-8 relative">
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 opacity-50"></div>

                <h3 className="text-2xl font-black text-blue-900 mb-6 flex items-center gap-3">
                    <span>📊</span> التحليل الإحصائي للنتائج
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Overall Class Statistics */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-4 text-lg">📈 إحصائيات عامة</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-700 font-medium">عدد الطلاب</span>
                                <span className="font-bold text-primary text-xl">{gridData.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-700 font-medium">عدد المواد</span>
                                <span className="font-bold text-primary text-xl">{classData?.subjects?.length || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Performance Distribution */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-4 text-lg">🎯 توزيع الأداء</h4>
                        {(() => {
                            const subjects = classData?.subjects || [];
                            let totalRed = 0, totalYellow = 0, totalGreen = 0;

                            subjects.forEach(subject => {
                                gridData.forEach(student => {
                                    const grade = Number(student.grades[subject]);
                                    if (grade && grade >= 80) totalGreen++;
                                    else if (grade && grade >= 55) totalYellow++;
                                    else if (grade) totalRed++;
                                });
                            });

                            const total = totalRed + totalYellow + totalGreen;

                            return (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                                        <span className="text-red-700 font-medium flex items-center gap-2">
                                            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                                            طلاب يحتاجون دعم (&lt;55)
                                        </span>
                                        <span className="font-bold text-red-700 text-xl">{totalRed}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <span className="text-yellow-700 font-medium flex items-center gap-2">
                                            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                                            طلاب متوسطون (55-79)
                                        </span>
                                        <span className="font-bold text-yellow-700 text-xl">{totalYellow}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                                        <span className="text-green-700 font-medium flex items-center gap-2">
                                            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                            طلاب متفوقون (≥80)
                                        </span>
                                        <span className="font-bold text-green-700 text-xl">{totalGreen}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Subject-wise Statistics */}
                <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
                    <h4 className="font-bold text-gray-800 mb-4 text-lg">📚 إحصائيات المواد</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(classData?.subjects || []).map(subject => {
                            const grades = gridData
                                .map(s => s.grades[subject])
                                .filter(g => g !== undefined && g !== null && g !== '')
                                .map(g => Number(g));

                            if (grades.length === 0) return null;

                            const avg = Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);
                            const max = Math.max(...grades);
                            const min = Math.min(...grades);
                            const passRate = Math.round((grades.filter(g => g >= 55).length / grades.length) * 100);

                            const bgColor = avg >= 80 ? 'bg-green-50 border-green-200' : avg >= 70 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
                            const textColor = avg >= 80 ? 'text-green-700' : avg >= 70 ? 'text-yellow-700' : 'text-red-700';

                            return (
                                <div key={subject} className={`p-4 rounded-xl border ${bgColor}`}>
                                    <h5 className={`font-bold mb-3 ${textColor}`}>
                                        {subject === 'Arabic' ? 'لغة عربية' :
                                            subject === 'Hebrew' ? 'لغة عبرية' :
                                                subject === 'Math' ? 'رياضيات' :
                                                    subject === 'English' ? 'لغة إنجليزية' :
                                                        subject === 'Science' ? 'علوم' : subject}
                                    </h5>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">المعدل:</span>
                                            <span className={`font-bold ${textColor}`}>{avg}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">الأعلى:</span>
                                            <span className="font-semibold text-gray-700">{max}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">الأدنى:</span>
                                            <span className="font-semibold text-gray-700">{min}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">نسبة النجاح:</span>
                                            <span className="font-bold text-blue-600">{passRate}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
