'use client';

import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Link from 'next/link';

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
    const [data, setData] = useState<any[][]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
                // Parse JSON string back to array
                const parsedData = savedData.dataJson ? JSON.parse(savedData.dataJson) : [];
                setData(parsedData);
                setFileName(savedData.fileName || '');
            } else {
                // Initialize with empty table
                setData(Array(20).fill(null).map(() => Array(10).fill('')));
                setFileName('');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setData(Array(20).fill(null).map(() => Array(10).fill('')));
        } finally {
            setLoading(false);
        }
    };

    const saveData = async () => {
        try {
            const docRef = doc(db, 'classes', String(selectedYear), classId, selectedQuarter);
            // Convert nested array to JSON string to avoid Firestore limitation
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
                setData(jsonData as any[][]);
            } catch (error) {
                console.error('Error reading file:', error);
                alert('فشل قراءة الملف!');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleExportExcel = () => {
        try {
            const ws = XLSX.utils.aoa_to_sheet(data);
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
            setData(hot.getData());
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
                            onChange={handleFileUpload}
                            accept=".xlsx,.xls"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <span>📁</span>
                            رفع ملف Excel
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
                        className="border-2 border-gray-200 rounded-lg overflow-auto"
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
                                colHeaders={true}
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
                            <li>يمكنك التعبئة مباشرة في الجدول أعلاه</li>
                            <li>أو استيراد ملف Excel موجود باستخدام زر "رفع ملف Excel"</li>
                            <li>لا تنسَ الضغط على "حفظ البيانات" بعد الانتهاء</li>
                            <li>يمكنك التبديل بين الأرباع الأربعة من الأزرار أعلاه</li>
                        </ul>
                    </div>
                </div>

                {/* Data Analysis Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span>📊</span>
                        تحليل المعطيات
                    </h3>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border-2 border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">إجمالي الخلايا</span>
                                <span className="text-3xl">📝</span>
                            </div>
                            <div className="text-3xl font-black text-blue-700">
                                {data.length * (data[0]?.length || 0)}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                                {data.length} صف × {data[0]?.length || 0} عمود
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border-2 border-green-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">الخلايا المملوءة</span>
                                <span className="text-3xl">✅</span>
                            </div>
                            <div className="text-3xl font-black text-green-700">
                                {data.flat().filter(cell => cell !== null && cell !== undefined && cell !== '').length}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                                {Math.round((data.flat().filter(cell => cell !== null && cell !== undefined && cell !== '').length / (data.length * (data[0]?.length || 1))) * 100)}% مكتملة
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border-2 border-purple-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">القيم الرقمية</span>
                                <span className="text-3xl">🔢</span>
                            </div>
                            <div className="text-3xl font-black text-purple-700">
                                {data.flat().filter(cell => !isNaN(Number(cell)) && cell !== '' && cell !== null).length}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                                متوسط: {(() => {
                                    const nums = data.flat().filter(cell => !isNaN(Number(cell)) && cell !== '' && cell !== null).map(Number);
                                    return nums.length > 0 ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '0';
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* AI Insights */}
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border-2 border-orange-200 mb-6">
                        <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>🤖</span>
                            رؤى ذكية
                        </h4>
                        <div className="space-y-3 text-sm">
                            {data.length > 0 ? (
                                <>
                                    <div className="flex items-start gap-2">
                                        <span className="text-blue-600 font-bold">📌</span>
                                        <p className="text-gray-700">
                                            الجدول الحالي يحتوي على <strong>{data.length} صف</strong> و <strong>{data[0]?.length || 0} عمود</strong>
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-green-600 font-bold">✓</span>
                                        <p className="text-gray-700">
                                            تم ملء <strong>{data.flat().filter(c => c !== '' && c !== null).length} خلية</strong> من أصل <strong>{data.length * (data[0]?.length || 0)}</strong>
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-purple-600 font-bold">🔢</span>
                                        <p className="text-gray-700">
                                            يوجد <strong>{data.flat().filter(c => !isNaN(Number(c)) && c !== '' && c !== null).length} قيمة رقمية</strong> في البيانات
                                        </p>
                                    </div>
                                    {(() => {
                                        const nums = data.flat().filter(c => !isNaN(Number(c)) && c !== '' && c !== null).map(Number);
                                        if (nums.length > 0) {
                                            const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
                                            return (
                                                <div className="flex items-start gap-2">
                                                    <span className="text-orange-600 font-bold">📊</span>
                                                    <p className="text-gray-700">
                                                        المعدل العام للقيم الرقمية: <strong className="text-orange-700">{avg.toFixed(2)}</strong>
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </>
                            ) : (
                                <p className="text-gray-500 italic">لا توجد بيانات للتحليل بعد</p>
                            )}
                        </div>
                    </div>

                    {/* Quarter Comparison */}
                    <QuarterComparison
                        classId={classId}
                        selectedYear={selectedYear}
                        currentQuarter={selectedQuarter}
                    />
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
            <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
                <div className="text-center text-gray-600">⏳ جاري تحميل مقارنة الأرباع...</div>
            </div>
        );
    }

    if (Object.keys(quarterlyData).length <= 1) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
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

