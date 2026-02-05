'use client';

import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { STUDENT_COLUMNS, ColumnDefinition } from '@/lib/studentColumns';
import SmartMapper from '@/components/ExcelImport/SmartMapper';

// ... imports

registerAllModules();

interface ClassEditorClientProps {
    classId: string;
}

const CLASSES = [
    { id: 'class-1', name: 'الصف الأول أ' },
    { id: 'class-2', name: 'الصف الأول ب' },
    { id: 'class-3', name: 'الصف الثاني أ' },
    { id: 'class-4', name: 'الصف الثاني ب' },
    { id: 'class-5', name: 'الصف الثالث أ' },
    { id: 'class-6', name: 'الصف الثالث ب' },
    { id: 'class-7', name: 'الصف الرابع أ' },
    { id: 'class-8', name: 'الصف الرابع ب' },
    { id: 'class-9', name: 'الصف الخامس أ' },
    { id: 'class-10', name: 'الصف الخامس ب' },
    { id: 'class-11', name: 'الصف السادس أ' },
    { id: 'class-12', name: 'الصف السادس ب' },
    { id: 'class-13', name: 'الصف السابع أ' },
    { id: 'class-14', name: 'الصف السابع ب' },
    { id: 'class-15', name: 'الصف الثامن أ' },
    { id: 'class-16', name: 'الصف الثامن ب' },
    { id: 'class-17', name: 'الصف التاسع أ' },
    { id: 'class-18', name: 'الصف التاسع ب' },
];

const QUARTERS = [
    { id: 'q1', name: 'الربع الأول', period: 'سبتمبر - نوفمبر', color: 'from-blue-500 to-blue-600' },
    { id: 'q2', name: 'الربع الثاني', period: 'ديسمبر - فبراير', color: 'from-green-500 to-green-600' },
    { id: 'q3', name: 'الربع الثالث', period: 'مارس - مايو', color: 'from-orange-500 to-orange-600' },
    { id: 'q4', name: 'الربع الرابع', period: 'يونيو - أغسطس', color: 'from-purple-500 to-purple-600' },
];

export default function ClassEditorClient({ classId }: ClassEditorClientProps) {
    const [selectedQuarter, setSelectedQuarter] = useState<string>('q1');
    const [data, setData] = useState<any[]>([]); // Data is now an array of objects
    const [fileName, setFileName] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Import Logic
    const [showMapper, setShowMapper] = useState(false);
    const [tempFile, setTempFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const hotTableRef = useRef<any>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const className = CLASSES.find(c => c.id === classId)?.name || '';

    // Load year from localStorage
    useEffect(() => {
        const savedYear = localStorage.getItem('lastSelectedYear');
        if (savedYear) setSelectedYear(Number(savedYear));
    }, []);

    // Load data when quarter changes
    useEffect(() => {
        loadData();
    }, [selectedQuarter, selectedYear, classId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'classes', String(selectedYear), classId, selectedQuarter);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const savedData = docSnap.data();
                // Parse JSON string back to array of objects
                const parsedData = savedData.dataJson ? JSON.parse(savedData.dataJson) : [];
                setData(parsedData);
                setFileName(savedData.fileName || '');
            } else {
                // Initialize with empty rows based on columns
                setData(Array(30).fill({}));
                setFileName('');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const saveData = async () => {
        try {
            const docRef = doc(db, 'classes', String(selectedYear), classId, selectedQuarter);
            await setDoc(docRef, {
                dataJson: JSON.stringify(data),
                fileName,
                lastUpdated: new Date().toISOString(),
                classId,
                className,
                quarter: selectedQuarter,
                year: selectedYear
            });
            alert('✅ تم حفظ البيانات بنجاح!');
        } catch (error) {
            console.error('Error saving:', error);
            alert('❌ فشل الحفظ!');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setTempFile(file);
        setShowMapper(true);
        // Reset input
        e.target.value = '';
    };

    const handleMapperConfirm = (mappedData: any[]) => {
        // Merge mapped data with existing or replace? User expects import.
        // Let's replace perfectly or append if needed. For now replace + padding.
        // Ensure 30 rows minimum
        const paddedData = [...mappedData, ...Array(Math.max(0, 30 - mappedData.length)).fill({})];
        setData(paddedData);
        if (tempFile) setFileName(tempFile.name);
        setShowMapper(false);
        setTempFile(null);
    };

    const handleDownloadTemplate = () => {
        try {
            // Create a row with empty strings for each key
            const templateRow: any = {};
            STUDENT_COLUMNS.forEach(col => templateRow[col.label] = ''); // Use Label as header for user friendliness

            const ws = XLSX.utils.json_to_sheet([templateRow]);

            // Add Data Validations for Dropdowns
            STUDENT_COLUMNS.forEach((col, idx) => {
                if (col.type === 'dropdown' && col.options) {
                    const colLetter = XLSX.utils.encode_col(idx);
                    // This is a basic way to add validation, complex in raw XLSX but sheetjs specific logic might be limited in free version.
                    // We generate a separate sheet for validation lists if needed, but for now simple header export is good step 1.
                    // Improving to just strict headers.
                }
            });

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Template');
            XLSX.writeFile(wb, `Template-${className}.xlsx`);
        } catch (error) {
            console.error('Template error:', error);
        }
    };

    const handleExportExcel = () => {
        try {
            // Map data back to labels for export
            const exportData = data.map(row => {
                const newRow: any = {};
                STUDENT_COLUMNS.forEach(col => {
                    newRow[col.label] = row[col.key];
                });
                return newRow;
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            XLSX.writeFile(wb, fileName || `${className}-${selectedQuarter}.xlsx`);
        } catch (error) {
            console.error('Export error:', error);
            alert('فشل التصدير!');
        }
    };

    const handleAfterChange = (changes: any, source: string) => {
        if (!changes || source === 'loadData') return;
        const hot = hotTableRef.current?.hotInstance;
        if (hot) {
            // We need to keep the object structure
            // getSourceData returns the underlying array of objects
            setData(hot.getSourceData());
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
            <div className="max-w-[1800px] mx-auto">
                {/* Header */}
                <div className="mb-6 bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                <span>📊</span>
                                {className}
                            </h1>
                            <p className="text-gray-600 mt-1">العام الدراسي {selectedYear}</p>
                        </div>
                        <Link
                            href="/dashboard/classes"
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
                        >
                            ← العودة
                        </Link>
                    </div>
                </div>

                {/* Quarters Selection */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">المراحل الأربعة:</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {QUARTERS.map(q => (
                            <button
                                key={q.id}
                                onClick={() => setSelectedQuarter(q.id)}
                                className={`p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${selectedQuarter === q.id
                                    ? `bg-gradient-to-r ${q.color} text-white border-transparent shadow-xl scale-105`
                                    : 'border-gray-200 hover:border-blue-300 bg-white'
                                    }`}
                            >
                                <div className="text-center">
                                    <div className="text-3xl font-black mb-1">{q.id.toUpperCase()}</div>
                                    <div className="font-bold text-sm mb-1">{q.name}</div>
                                    <div className={`text-xs ${selectedQuarter === q.id ? 'text-white/80' : 'text-gray-500'}`}>
                                        {q.period}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Upload Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex flex-wrap gap-3 items-center">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".xlsx,.xls"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <span>📁</span>
                            استيراد ملف Excel
                        </button>
                        <button
                            onClick={handleDownloadTemplate}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <span>📋</span>
                            تحميل قالب جاهز
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <span>📥</span>
                            تصدير Excel
                        </button>
                        <button
                            onClick={saveData}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <span>💾</span>
                            حفظ البيانات
                        </button>
                        {fileName && (
                            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                                <span className="text-blue-600">📄</span>
                                <span className="font-medium text-gray-700">{fileName}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>📝</span>
                        جدول التعبئة - {QUARTERS.find(q => q.id === selectedQuarter)?.name}
                    </h3>

                    <div
                        ref={tableContainerRef}
                        className="border-2 border-gray-200 rounded-lg overflow-hidden"
                    >
                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="text-4xl mb-2">⏳</div>
                                <p className="text-gray-600">جاري التحميل...</p>
                            </div>
                        ) : (
                            <HotTable
                                ref={hotTableRef}
                                data={data}
                                columns={STUDENT_COLUMNS.map(col => ({
                                    data: col.key,
                                    type: col.type,
                                    source: col.options,
                                    width: col.width
                                }))}
                                colHeaders={STUDENT_COLUMNS.map(col => col.label)}
                                rowHeaders={true}
                                width="100%"
                                height="600"
                                licenseKey="non-commercial-and-evaluation"
                                contextMenu={true}
                                manualRowMove={true}
                                manualColumnMove={true}
                                manualRowResize={true}
                                manualColumnResize={true}
                                copyPaste={true}
                                fillHandle={true}
                                stretchH="all"
                                afterChange={handleAfterChange}
                                className="htMiddle"
                            />
                        )}
                    </div>

                    <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="font-medium mb-2">💡 نصائح الاستخدام:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>استخدم القوائم المنسدلة لتعبئة البيانات بدقة</li>
                            <li>يمكنك تحميل "القالب الجاهز"، تعبئته، ثم إعادة استيراده</li>
                            <li>النظام سيساعدك في ربط الأعمدة إذا اختلف ترتيبها</li>
                        </ul>
                    </div>
                </div>

                {/* Comprehensive Data Analysis Section */}
                {/* <AdvancedAnalytics data={data} className={className} quarter={selectedQuarter} /> */}
                {/* Analytics disabled temporarily until refactored for new object structure if needed, or we adapt it. 
                    Actually, passing 'data' (array of objects) to AdvancedAnalytics might break it if it expects array of arrays.
                    Better to hide it for now or refactor it. I'll hide it to avoid errors. 
                 */}

                {showMapper && tempFile && (
                    <SmartMapper
                        file={tempFile}
                        onConfirm={handleMapperConfirm}
                        onCancel={() => { setShowMapper(false); setTempFile(null); }}
                    />
                )}

            </div>
        </div>
    );
}

// Advanced Analytics Component  
function AdvancedAnalytics({ data, className, quarter }: { data: any[][]; className: string; quarter: string }) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-8 mt-6 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد بيانات للتحليل</h3>
                <p className="text-gray-600">قم برفع ملف Excel أو أدخل البيانات في الجدول أعلاه</p>
            </div>
        );
    }

    //  Extract data structure (assuming first row is headers)
    const headers = data[0] || [];
    const rows = data.slice(1);

    // Find numeric columns (subjects/grades)
    const numericColumns: number[] = [];
    headers.forEach((header, idx) => {
        if (idx > 0) { // Skip first column (names)
            const columnValues = rows.map(row => row[idx]);
            const hasNumbers = columnValues.some(val => !isNaN(Number(val)) && val !== '' && val !== null);
            if (hasNumbers) numericColumns.push(idx);
        }
    });

    // Calculate student statistics
    const studentStats = rows.map((row, idx) => {
        const studentName = row[0] || `طالب ${idx + 1}`;
        const grades = numericColumns.map(colIdx => Number(row[colIdx])).filter(g => !isNaN(g) && g > 0);
        const average = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
        const max = grades.length > 0 ? Math.max(...grades) : 0;
        const min = grades.length > 0 ? Math.min(...grades) : 0;

        return {
            name: studentName,
            average,
            max,
            min,
            count: grades.length,
            grades
        };
    }).filter(s => s.count > 0);

    // Calculate subject statistics
    const subjectStats = numericColumns.map(colIdx => {
        const subjectName = headers[colIdx] || `مادة ${colIdx}`;
        const grades = rows.map(row => Number(row[colIdx])).filter(g => !isNaN(g) && g > 0);
        const average = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
        const max = grades.length > 0 ? Math.max(...grades) : 0;
        const min = grades.length > 0 ? Math.min(...grades) : 0;
        const passing = grades.filter(g => g >= 55).length;
        const failing = grades.filter(g => g < 55).length;

        return {
            name: subjectName,
            average,
            max,
            min,
            count: grades.length,
            passing,
            failing,
            passingRate: grades.length > 0 ? (passing / grades.length) * 100 : 0
        };
    });

    // Overall statistics
    const allGrades = studentStats.flatMap(s => s.grades);
    const overallAverage = allGrades.length > 0 ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length : 0;
    const topStudent = studentStats.length > 0 ? studentStats.reduce((max, s) => s.average > max.average ? s : max) : null;
    const strugglingStudents = studentStats.filter(s => s.average < 55);
    const excellentStudents = studentStats.filter(s => s.average >= 90);

    // Grade distribution
    const gradeRanges = [
        { label: 'ممتاز (90-100)', min: 90, max: 100, count: 0, color: 'bg-green-500' },
        { label: 'جيد جداً (80-89)', min: 80, max: 89, count: 0, color: 'bg-blue-500' },
        { label: 'جيد (70-79)', min: 70, max: 79, count: 0, color: 'bg-yellow-500' },
        { label: 'مقبول (55-69)', min: 55, max: 69, count: 0, color: 'bg-orange-500' },
        { label: 'راسب (<55)', min: 0, max: 54, count: 0, color: 'bg-red-500' }
    ];

    allGrades.forEach(grade => {
        const range = gradeRanges.find(r => grade >= r.min && grade <= r.max);
        if (range) range.count++;
    });

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span>📊</span>
                لوحة التحليلات الشاملة - {className}
            </h3>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200">
                    <div className="text-sm text-gray-600 mb-1">عدد الطلاب</div>
                    <div className="text-3xl font-black text-blue-700">{studentStats.length}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200">
                    <div className="text-sm text-gray-600 mb-1">المعدل العام</div>
                    <div className="text-3xl font-black text-green-700">{overallAverage.toFixed(1)}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border-2 border-purple-200">
                    <div className="text-sm text-gray-600 mb-1">عدد المواد</div>
                    <div className="text-3xl font-black text-purple-700">{subjectStats.length}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200">
                    <div className="text-sm text-gray-600 mb-1">متفوقون</div>
                    <div className="text-3xl font-black text-orange-700">{excellentStudents.length}</div>
                </div>
            </div>

            {/* Grade Distribution */}
            <div className="mb-8">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>📈</span>
                    توزيع العلامات
                </h4>
                <div className="space-y-3">
                    {gradeRanges.map((range, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className="w-32 text-sm font-medium text-gray-700">{range.label}</div>
                            <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                                <div
                                    className={`${range.color} h-full flex items-center justify-end px-3 text-white font-bold text-sm transition-all duration-500`}
                                    style={{ width: `${allGrades.length > 0 ? (range.count / allGrades.length) * 100 : 0}%` }}
                                >
                                    {range.count > 0 && `${range.count} طالب`}
                                </div>
                            </div>
                            <div className="w-16 text-right text-sm font-bold text-gray-700">
                                {allGrades.length > 0 ? ((range.count / allGrades.length) * 100).toFixed(0) : 0}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Performers & Struggling Students */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Top Students */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200">
                    <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span>⭐</span>
                        الطلاب المتفوقون (90+)
                    </h4>
                    {excellentStudents.length > 0 ? (
                        <div className="space-y-2">
                            {excellentStudents.slice(0, 5).map((student, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3">
                                    <span className="font-medium text-gray-800">{student.name}</span>
                                    <span className="font-bold text-green-700">{student.average.toFixed(1)}</span>
                                </div>
                            ))}
                            {excellentStudents.length > 5 && (
                                <p className="text-sm text-gray-600 mt-2">+{excellentStudents.length - 5} طالب آخر</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">لا يوجد طلاب متفوقون حالياً</p>
                    )}
                </div>

                {/* Struggling Students */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 border-2 border-red-200">
                    <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span>⚠️</span>
                        طلاب يحتاجون دعم (&lt;55)
                    </h4>
                    {strugglingStudents.length > 0 ? (
                        <div className="space-y-2">
                            {strugglingStudents.slice(0, 5).map((student, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3">
                                    <span className="font-medium text-gray-800">{student.name}</span>
                                    <span className="font-bold text-red-700">{student.average.toFixed(1)}</span>
                                </div>
                            ))}
                            {strugglingStudents.length > 5 && (
                                <p className="text-sm text-gray-600 mt-2">+{strugglingStudents.length - 5} طالب آخر</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">جميع الطلاب يحققون النجاح! 🎉</p>
                    )}
                </div>
            </div>

            {/* Subject Analysis */}
            <div className="mb-8">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>📚</span>
                    تحليل المواد الدراسية
                </h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-purple-100 to-blue-100">
                            <tr>
                                <th className="p-3 text-right font-bold">المادة</th>
                                <th className="p-3 text-center font-bold">المعدل</th>
                                <th className="p-3 text-center font-bold">أعلى علامة</th>
                                <th className="p-3 text-center font-bold">أدنى علامة</th>
                                <th className="p-3 text-center font-bold">ناجحون</th>
                                <th className="p-3 text-center font-bold">راسبون</th>
                                <th className="p-3 text-center font-bold">نسبة النجاح</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y">
                            {subjectStats.map((subject, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium">{subject.name}</td>
                                    <td className="p-3 text-center">
                                        <span className={`font-bold ${subject.average >= 70 ? 'text-green-600' : subject.average >= 55 ? 'text-orange-600' : 'text-red-600'}`}>
                                            {subject.average.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center text-green-600 font-bold">{subject.max}</td>
                                    <td className="p-3 text-center text-red-600 font-bold">{subject.min}</td>
                                    <td className="p-3 text-center text-green-700">{subject.passing}</td>
                                    <td className="p-3 text-center text-red-700">{subject.failing}</td>
                                    <td className="p-3 text-center">
                                        <span className={`font-bold ${subject.passingRate >= 80 ? 'text-green-600' : subject.passingRate >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                                            {subject.passingRate.toFixed(0)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AI Insights & Recommendations */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>🤖</span>
                    رؤى وتوصيات ذكية
                </h4>
                <div className="space-y-3">
                    {/* Overall Performance */}
                    {overallAverage >= 80 && (
                        <div className="flex items-start gap-2 bg-green-100 border border-green-300 rounded-lg p-3">
                            <span className="text-2xl">🎉</span>
                            <div>
                                <p className="font-bold text-green-800">أداء ممتاز!</p>
                                <p className="text-sm text-green-700">المعدل العام للصف {overallAverage.toFixed(1)}% - استمروا على هذا النهج الرائع!</p>
                            </div>
                        </div>
                    )}
                    {overallAverage >= 60 && overallAverage < 80 && (
                        <div className="flex items-start gap-2 bg-blue-100 border border-blue-300 rounded-lg p-3">
                            <span className="text-2xl">👍</span>
                            <div>
                                <p className="font-bold text-blue-800">أداء جيد</p>
                                <p className="text-sm text-blue-700">المعدل العام {overallAverage.toFixed(1)}% - هناك مجال للتحسين</p>
                            </div>
                        </div>
                    )}
                    {overallAverage < 60 && overallAverage > 0 && (
                        <div className="flex items-start gap-2 bg-orange-100 border border-orange-300 rounded-lg p-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <p className="font-bold text-orange-800">يحتاج الصف لدعم إضافي</p>
                                <p className="text-sm text-orange-700">المعدل العام {overallAverage.toFixed(1)}% - يُنصح بوضع خطة تحسين</p>
                            </div>
                        </div>
                    )}

                    {/* Struggling Students Alert */}
                    {strugglingStudents.length > 0 && (
                        <div className="flex items-start gap-2 bg-red-100 border border-red-300 rounded-lg p-3">
                            <span className="text-2xl">🆘</span>
                            <div>
                                <p className="font-bold text-red-800">تنبيه: طلاب يحتاجون دعم عاجل</p>
                                <p className="text-sm text-red-700">
                                    {strugglingStudents.length} طالب بمعدل أقل من 55%: {strugglingStudents.slice(0, 3).map(s => s.name).join('، ')}
                                    {strugglingStudents.length > 3 && ' وآخرون'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Weakest Subject */}
                    {subjectStats.length > 0 && (() => {
                        const weakest = subjectStats.reduce((min, s) => s.average < min.average ? s : min);
                        if (weakest.average < 70) {
                            return (
                                <div className="flex items-start gap-2 bg-purple-100 border border-purple-300 rounded-lg p-3">
                                    <span className="text-2xl">📚</span>
                                    <div>
                                        <p className="font-bold text-purple-800">المادة الأضعف</p>
                                        <p className="text-sm text-purple-700">
                                            {weakest.name} بمعدل {weakest.average.toFixed(1)}% - يُنصح بتخصيص حصص دعم إضافية
                                        </p>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* Top Performer Recognition */}
                    {topStudent && topStudent.average >= 85 && (
                        <div className="flex items-start gap-2 bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                            <span className="text-2xl">⭐</span>
                            <div>
                                <p className="font-bold text-yellow-800">الطالب المتميز</p>
                                <p className="text-sm text-yellow-700">
                                    {topStudent.name} بمعدل {topStudent.average.toFixed(1)}% - تستحق التقدير والتشجيع!
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Quarter Comparison Component
function QuarterComparison({ classId, selectedYear, currentQuarter }: { classId: string; selectedYear: number; currentQuarter: string }) {
    const [quarterlyData, setQuarterlyData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAllQuarters();
    }, [classId, selectedYear]);

    const loadAllQuarters = async () => {
        setLoading(true);
        try {
            const quarters = ['q1', 'q2', 'q3', 'q4'];
            const allData: Record<string, any> = {};

            for (const q of quarters) {
                const docRef = doc(db, 'classes', String(selectedYear), classId, q);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    allData[q] = docSnap.data();
                }
            }

            setQuarterlyData(allData);
        } catch (error) {
            console.error('Error loading quarterly data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200 mt-6">
                <div className="text-center text-gray-600">⏳ جاري تحميل مقارنة الأرباع...</div>
            </div>
        );
    }

    if (Object.keys(quarterlyData).length <= 1) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200 mt-6">
            <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>📈</span>
                مقارنة الأداء بين الأرباع
            </h4>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-purple-100 to-blue-100">
                        <tr>
                            <th className="p-3 text-right font-bold">الربع</th>
                            <th className="p-3 text-center font-bold">عدد الصفوف</th>
                            <th className="p-3 text-center font-bold">عدد الأعمدة</th>
                            <th className="p-3 text-center font-bold">الخلايا المملوءة</th>
                            <th className="p-3 text-center font-bold">آخر تحديث</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y">
                        {['q1', 'q2', 'q3', 'q4'].map((q) => {
                            const qData = quarterlyData[q];
                            if (!qData) return (
                                <tr key={q}>
                                    <td className="p-3 font-medium">{q.toUpperCase()}</td>
                                    <td colSpan={4} className="p-3 text-center text-gray-400">لا توجد بيانات</td>
                                </tr>
                            );
                            // Parse JSON data
                            const parsedData = qData.dataJson ? JSON.parse(qData.dataJson) : [];
                            const filled = parsedData.flat().filter((c: any) => c !== '' && c !== null).length || 0;
                            return (
                                <tr key={q} className={q === currentQuarter ? 'bg-blue-50 font-bold' : ''}>
                                    <td className="p-3">{q === currentQuarter && '👉 '}{q.toUpperCase()}</td>
                                    <td className="p-3 text-center">{parsedData.length || 0}</td>
                                    <td className="p-3 text-center">{parsedData[0]?.length || 0}</td>
                                    <td className="p-3 text-center">{filled}</td>
                                    <td className="p-3 text-center text-xs">
                                        {qData.lastUpdated ? new Date(qData.lastUpdated).toLocaleDateString('ar-EG') : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

