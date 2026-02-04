'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';
import { getStudents, getClasses } from '@/lib/firestoreService';
import { Student, ClassGroup } from '@/lib/types';
import AIAssistant from '@/components/AIAssistant';

export default function AnalyticsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAI, setShowAI] = useState(false);

    // Filter State
    const [viewLevel, setViewLevel] = useState<'school' | 'grade' | 'class'>('school');
    // We'll use "Grade" (e.g. "7", "8") from class names or metadata if available. 
    // Assuming class names are like "7th Grade A" or similar, or we group by similar names.
    // For simplicity, we'll derive grades from class names (e.g., first word or special logic).
    // Or simpler: Just allow picking a specific Class for "Class Level", 
    // and for "Grade Level", we might need a way to group classes. 
    // Let's implement a simple grouping: "Grade 1", "Grade 2"... 
    // If not available, we'll let user select multiple classes? 
    // Let's rely on standard dropdowns.
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');

    // Multi-Year Support
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<string>('2026');
    const years = Array.from({ length: 15 }, (_, i) => (2026 + i).toString());

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [studentsData, classesData] = await Promise.all([
                    getStudents(),
                    getClasses()
                ]);
                setStudents(studentsData);
                setClasses(classesData);
            } catch (error) {
                console.error("Error fetching analytics data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Derived Data: Grades (Layers)
    // We assume classes have a 'grade' field or we parse it. 
    // Since ClassGroup definition is simpler, let's extract unique "Grade" names from class names if possible,
    // or just list all Classes.
    // For this implementation, let's map Classes to "Grades" roughly.
    // If exact grade isn't stored, we'll treat unique Class Names as the grouping if appropriate, 
    // or just skip Grade level if complex. 
    // PLAN: Just use Class selection for now for drilling down. 
    // "Grade Level" might be tricky without explicit 'grade' field in ClassGroup. 
    // I will try to infer it (e.g. "Seventh 1", "Seventh 2" -> Grade "Seventh").

    const grades = useMemo(() => {
        const uniqueGrades = new Set<string>();
        classes.forEach(c => {
            // Heuristic: First word of class name often indicates Grade (e.g., "السابع 1")
            const gradeName = c.name.split(' ')[0];
            uniqueGrades.add(gradeName);
        });
        return Array.from(uniqueGrades);
    }, [classes]);

    const filteredStudents = useMemo(() => {
        if (viewLevel === 'school') return students;
        if (viewLevel === 'grade') {
            // Filter classes matching selectedGrade
            const relevantClassIds = classes
                .filter(c => c.name.startsWith(selectedGrade))
                .map(c => c.id);
            return students.filter(s => relevantClassIds.includes(s.classId));
        }
        if (viewLevel === 'class') {
            return students.filter(s => s.classId === selectedClassId);
        }
        return students;
    }, [students, classes, viewLevel, selectedGrade, selectedClassId]);

    const subjectNames: Record<string, string> = {
        'Arabic': 'العربية',
        'Hebrew': 'العبرية',
        'Math': 'الرياضيات',
        'Science': 'العلوم',
        'English': 'الإنجليزية'
    };

    // --- Chart Data Generators ---

    // 1. Subject Performance
    const subjectPerformanceData = useMemo(() => {
        // If School/Grade/Class view, we generally want to see Performance by Subject first.
        return Object.keys(subjectNames).map(subjectKey => {
            const relevantStudents = filteredStudents.filter(s => s.grades && s.grades[subjectKey]);
            if (relevantStudents.length === 0) return { name: subjectNames[subjectKey], average: 0 };

            const totalScore = relevantStudents.reduce((acc, s) => acc + (Number(s.grades[subjectKey]) || 0), 0);
            return {
                name: subjectNames[subjectKey],
                average: Math.round(totalScore / relevantStudents.length)
            };
        });
    }, [filteredStudents]);

    // 2. Comparison Data (The "Group By" Chart)
    // School View -> Compare Grades
    // Grade View -> Compare Classes
    // Class View -> Maybe distribution? (Improving later)
    const comparisonData = useMemo(() => {
        if (viewLevel === 'school') {
            // Compare performance/absences by Grade
            // Group students by Grade (derived from Class Name)
            return grades.map(grade => {
                const classIds = classes.filter(c => c.name.startsWith(grade)).map(c => c.id);
                const gradeStudents = students.filter(s => classIds.includes(s.classId));

                // Calculate Composite Score (Avg of all subjects)
                let totalScore = 0;
                let count = 0;
                gradeStudents.forEach(s => {
                    Object.keys(s.grades).forEach(sub => {
                        totalScore += Number(s.grades[sub]) || 0;
                        count++;
                    });
                });
                const compositeAvg = count ? Math.round(totalScore / count) : 0;

                return {
                    name: grade,
                    value: compositeAvg,
                    label: 'معدل عام'
                };
            });
        }
        else if (viewLevel === 'grade') {
            // Compare Classes in this Grade
            const gradeClasses = classes.filter(c => c.name.startsWith(selectedGrade));
            return gradeClasses.map(cls => {
                const clsStudents = students.filter(s => s.classId === cls.id);
                let totalScore = 0;
                let count = 0;
                clsStudents.forEach(s => {
                    Object.keys(s.grades).forEach(sub => {
                        totalScore += Number(s.grades[sub]) || 0;
                        count++;
                    });
                });
                const compositeAvg = count ? Math.round(totalScore / count) : 0;

                return {
                    name: cls.name,
                    value: compositeAvg,
                    label: 'معدل الصف'
                };
            });
        }
        else {
            // Class View: Show top 5 vs bottom 5? Or just return empty for this chart type?
            // Let's show Subject Breakdown instead as the secondary chart? 
            // Or Absence Rate per student?
            return [];
        }
    }, [viewLevel, students, classes, grades, selectedGrade]);


    // 3. Absence Data
    const absenceData = useMemo(() => {
        // School -> Sum by Grade
        // Grade -> Sum by Class
        // Class -> List top absentees?
        if (viewLevel === 'school') {
            return grades.map(grade => {
                const classIds = classes.filter(c => c.name.startsWith(grade)).map(c => c.id);
                const gradeStudents = students.filter(s => classIds.includes(s.classId));
                const totalAbsences = gradeStudents.reduce((acc, s) => acc + (s.absences || 0), 0);
                return { name: grade, absences: totalAbsences };
            });
        }
        else if (viewLevel === 'grade') {
            const gradeClasses = classes.filter(c => c.name.startsWith(selectedGrade));
            return gradeClasses.map(cls => {
                const clsStudents = students.filter(s => s.classId === cls.id);
                const totalAbsences = clsStudents.reduce((acc, s) => acc + (s.absences || 0), 0);
                return { name: cls.name, absences: totalAbsences };
            });
        }
        return []; // Class level absences might be a list, handled differently
    }, [viewLevel, grades, classes, students, selectedGrade]);


    if (loading) return <div className="p-10 text-center">جاري تحميل البيانات...</div>;

    return (
        <div className="animate-fade-in pb-20">
            {/* Header & Controls */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h1 className="mb-2">التحليلات والإحصائيات 📊</h1>
                        <p className="text-gray-500 text-lg">رؤية شاملة للأداء الأكاديمي والإحصائيات المدرسية</p>
                    </div>

                    {/* Year Selector */}
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-500 mb-1">السنة الدراسية</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none bg-white font-bold text-gray-700"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={() => setShowAI(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold shadow-xl hover:scale-105 transition-all flex items-center gap-2 animate-pulse"
                    >
                        <span>✨</span> المساعد الإحصائي الذكي
                    </button>

                    {/* View Controls */}
                    <div className="flex bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                        <button
                            onClick={() => { setViewLevel('school'); setSelectedGrade(''); setSelectedClassId(''); }}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${viewLevel === 'school' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            🏫 المدرسة
                        </button>
                        <button
                            onClick={() => { setViewLevel('grade'); }}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${viewLevel === 'grade' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            📚 الطبقة
                        </button>
                        <button
                            onClick={() => { setViewLevel('class'); }}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${viewLevel === 'class' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            🎓 الصف
                        </button>
                    </div>
                </div>

                {/* Sub-Filters */}
                {viewLevel !== 'school' && (
                    <div className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 animate-slide-in-down">
                        {/* Grade Selector */}
                        {(viewLevel === 'grade' || viewLevel === 'class') && (
                            <div className="flex-1">
                                <label className="block text-sm font-bold mb-2 text-gray-700">اختر الطبقة</label>
                                <select
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    value={selectedGrade}
                                    onChange={(e) => { setSelectedGrade(e.target.value); setSelectedClassId(''); }}
                                >
                                    <option value="">-- كل الطبقات --</option>
                                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Class Selector */}
                        {viewLevel === 'class' && (
                            <div className="flex-1">
                                <label className="block text-sm font-bold mb-2 text-gray-700">اختر الصف</label>
                                <select
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    disabled={!selectedGrade}
                                >
                                    <option value="">-- كل الصفوف --</option>
                                    {classes
                                        .filter(c => c.name.startsWith(selectedGrade))
                                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                    }
                                </select>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {
                showAI && (
                    <AIAssistant
                        onClose={() => setShowAI(false)}
                        context={{ students: filteredStudents, viewLevel, selectedGrade, selectedClassId, subjectPerformanceData }}
                        pageTitle="المساعد الإحصائي"
                        suggestions={[
                            { label: 'تحليل الأداء', prompt: 'قم بتحليل بيانات الأداء المعروضة واذكر أهم 3 نقاط قوة ونقاط ضعف.', icon: '📉' },
                            { label: 'توصيات للغياب', prompt: 'بناءً على نسبة الغيابات، ما هي الخطوات المقترحة لتحسين الحضور؟', icon: '🚨' }
                        ]}
                    />
                )
            }

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <div>
                        <p className="text-gray-500 font-bold">عدد الطلاب</p>
                        <p className="text-3xl font-black">{filteredStudents.length}</p>
                    </div>
                </div>
                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-full">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </div>
                    <div>
                        <p className="text-gray-500 font-bold">متوسط التحصيل</p>
                        <p className="text-3xl font-black">
                            {subjectPerformanceData.length > 0
                                ? Math.round(subjectPerformanceData.reduce((a, b) => a + b.average, 0) / subjectPerformanceData.length)
                                : 0
                            }%
                        </p>
                    </div>
                </div>
                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-full">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                    </div>
                    <div>
                        <p className="text-gray-500 font-bold">مجموع الغيابات</p>
                        <p className="text-3xl font-black">
                            {filteredStudents.reduce((acc, s) => acc + (s.absences || 0), 0)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Main Chart 1: Subject Performance */}
                <div className="glass-panel p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] rounded-lg">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg>
                        </div>
                        <h3 className="text-xl font-bold">معدل العلامات حسب المادة</h3>
                    </div>
                    <div className="h-[320px] w-full dir-ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subjectPerformanceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                <Tooltip contentStyle={{ background: 'white', border: '2px solid var(--primary)', borderRadius: '12px', fontWeight: 600 }} />
                                <Bar dataKey="average" fill="url(#colorGradient)" name="المعدل" radius={[8, 8, 0, 0]} />
                                <defs>
                                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                                        <stop offset="100%" stopColor="var(--primary-dark)" stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Main Chart 2: Comparative / Absences */}
                <div className="glass-panel p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-[var(--secondary)] to-[var(--secondary-dark)] rounded-lg">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        </div>
                        <h3 className="text-xl font-bold">
                            {viewLevel === 'school' ? 'توزع الغيابات حسب الطبقة' : viewLevel === 'grade' ? 'توزع الغيابات حسب الصف' : 'تحليل الغيابات'}
                        </h3>
                    </div>
                    {viewLevel !== 'class' ? (
                        <div className="h-[320px] w-full dir-ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={absenceData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                    <Tooltip contentStyle={{ background: 'white', border: '2px solid var(--secondary)', borderRadius: '12px', fontWeight: 600 }} />
                                    <Line type="monotone" dataKey="absences" stroke="var(--secondary)" strokeWidth={4} dot={{ fill: 'var(--secondary)', r: 6 }} name="مجموع الغيابات" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[320px] text-gray-400">
                            <p>تحليل الغيابات الفردي (قريباً)</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Comparison Bar for School/Grade Views */}
            {
                viewLevel !== 'class' && (
                    <div className="glass-panel p-6 mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <h3 className="text-xl font-bold">
                                {viewLevel === 'school' ? 'مقارنة المعدل العام بين الطبقات' : 'مقارنة المعدل العام بين الصفوف'}
                            </h3>
                        </div>
                        <div className="h-[320px] w-full dir-ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                    <Tooltip contentStyle={{ background: 'white', border: '2px solid #8884d8', borderRadius: '12px', fontWeight: 600 }} />
                                    <Bar dataKey="value" fill="#8884d8" name="المعدل العام" radius={[8, 8, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )
            }

            {/* Dynamic Insights */}
            <div className="glass-panel p-8 mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-br from-[var(--accent)] to-orange-600 rounded-lg">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold">التوصيات والاستنتاجات الذكية</h3>
                </div>

                <div className="space-y-4">
                    {/* Best Subject Insight */}
                    {subjectPerformanceData.length > 0 && (
                        (() => {
                            const bestSubject = [...subjectPerformanceData].sort((a, b) => b.average - a.average)[0];
                            if (bestSubject && bestSubject.average >= 85) {
                                return (
                                    <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-r-4 border-green-500 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <div className="text-2xl">✅</div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 mb-1">أداء ممتاز في {bestSubject.name}</h4>
                                                <p className="text-gray-700">معدل الطلاب في مادة {bestSubject.name} مرتفع ({bestSubject.average}%)، مما يعكس استيعاباً ممتازاً للمنهاج.</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()
                    )}

                    {/* Weak Subject Insight */}
                    {subjectPerformanceData.length > 0 && (
                        (() => {
                            const weakSubject = [...subjectPerformanceData].sort((a, b) => a.average - b.average)[0];
                            if (weakSubject && weakSubject.average < 70) {
                                return (
                                    <div className="p-5 bg-gradient-to-r from-yellow-50 to-amber-50 border-r-4 border-yellow-500 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <div className="text-2xl">⚠️</div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 mb-1">تحسين مطلوب في {weakSubject.name}</h4>
                                                <p className="text-gray-700">ملاحظة انخفاض في معدل علامات {weakSubject.name} ({weakSubject.average}%) - يُنصح بمراجعة خطة العمل لهذه المادة.</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()
                    )}

                    {/* Absence Insight */}
                    {(() => {
                        const totalAbsences = filteredStudents.reduce((acc, s) => acc + (s.absences || 0), 0);
                        if (totalAbsences > filteredStudents.length * 5 && filteredStudents.length > 0) { // Threshold: Avg > 5 per student
                            return (
                                <div className="p-5 bg-gradient-to-r from-red-50 to-rose-50 border-r-4 border-red-500 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <div className="text-2xl">🚨</div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 mb-1">نسبة غيابات مرتفعة</h4>
                                            <p className="text-gray-700">مجموع الغيابات المسجل ({totalAbsences}) يشير إلى معدل مرتفع نسبياً. يُنصح بمتابعة الحضور والغياب بشكل أدق.</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* Empty State for Insights */}
                    {subjectPerformanceData.length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                            لا توجد بيانات كافية لاستنتاج التوصيات حالياً.
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
