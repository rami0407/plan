'use client';

import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import Link from 'next/link';

registerAllModules();

interface EditorClientProps {
    classId: string;
    quarter: string;
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

export default function EditorClient({ classId, quarter }: EditorClientProps) {
    const [data, setData] = useState<any[][]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [stats, setStats] = useState({ sum: 0, avg: 0, count: 0, min: 0, max: 0 });
    const [loading, setLoading] = useState(true);
    const [showAI, setShowAI] = useState(false);
    const [quarterlyData, setQuarterlyData] = useState<Record<string, any>>({});

    // Refs for synchronized scrolling
    const [scrollWidth, setScrollWidth] = useState(0);
    const [clientWidth, setClientWidth] = useState(0);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef<'table' | 'top' | null>(null);
    const timeoutRef = useRef<any>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const hotTableRef = useRef<any>(null);

    // Get year from localStorage or default to current year
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        const savedYear = localStorage.getItem('lastSelectedYear');
        if (savedYear) setSelectedYear(Number(savedYear));
    }, []);

    const quarterNum = quarter.replace('q', '');
    const className = CLASSES.find(c => c.id === classId)?.name || '';

    // Load data from Firestore
    useEffect(() => {
        loadData();
        loadAllQuartersData();
    }, [classId, quarter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'classes', String(selectedYear), classId, quarter);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const savedData = docSnap.data();
                setData(savedData.data || []);
                setFileName(savedData.fileName || '');
            } else {
                // If Q2-Q4 and Q1 exists, copy student names from Q1
                if (quarterNum !== '1') {
                    await copyStudentsFromQ1();
                } else {
                    setData([]);
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const copyStudentsFromQ1 = async () => {
        try {
            const q1Ref = doc(db, 'classes', String(selectedYear), classId, 'q1');
            const q1Snap = await getDoc(q1Ref);

            if (q1Snap.exists()) {
                const q1Data = q1Snap.data().data || [];
                // Copy only first column (student names) and clear grades
                const newData = q1Data.map((row: any[]) => [row[0] || '', ...Array(row.length - 1).fill('')]);
                setData(newData);
                alert('✅ تم نسخ أسماء الطلاب من الربع الأول!');
            } else {
                setData([]);
            }
        } catch (error) {
            console.error('Error copying from Q1:', error);
            setData([]);
        }
    };

    const loadAllQuartersData = async () => {
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
        }
    };

    const saveData = async () => {
        try {
            const docRef = doc(db, 'classes', String(selectedYear), classId, quarter);
            await setDoc(docRef, {
                data,
                fileName,
                lastUpdated: new Date().toISOString(),
                classId,
                className,
                quarter,
                year: selectedYear
            });
            alert('✅ تم حفظ البيانات بنجاح!');
            await loadAllQuartersData();
        } catch (error) {
            console.error('Error saving:', error);
            alert('❌ فشل الحفظ!');
        }
    };

    // Excel upload
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

    // Excel download
    const handleExportExcel = () => {
        try {
            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            XLSX.writeFile(wb, fileName || `${className}-${quarter}.xlsx`);
        } catch (error) {
            console.error('Export error:', error);
            alert('فشل التصدير!');
        }
    };

    // Scroll sync
    useEffect(() => {
        const updateWidth = () => {
            if (tableContainerRef.current) {
                const { scrollWidth, clientWidth } = tableContainerRef.current;
                setScrollWidth(scrollWidth);
                setClientWidth(clientWidth);
            }
        };

        const timer = setTimeout(updateWidth, 200);
        const observer = new ResizeObserver(updateWidth);

        if (tableContainerRef.current) {
            observer.observe(tableContainerRef.current);
        }

        window.addEventListener('resize', updateWidth);
        return () => {
            window.removeEventListener('resize', updateWidth);
            observer.disconnect();
            clearTimeout(timer);
        };
    }, [data]);

    const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isScrolling.current === 'top') return;
        isScrolling.current = 'table';
        if (topScrollRef.current) {
            topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => { isScrolling.current = null; }, 50);
    };

    const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isScrolling.current === 'table') return;
        isScrolling.current = 'top';
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => { isScrolling.current = null; }, 50);
    };

    const handleAfterChange = (changes: any, source: string) => {
        if (!changes || source === 'loadData' || source === 'ObserveChanges.change') return;
        const hot = hotTableRef.current?.hotInstance;
        if (hot) {
            setData(hot.getData());
        }
    };

    const handleAfterSelection = (row: number, col: number, row2: number, col2: number) => {
        if (row < 0 || col < 0 || row2 < 0 || col2 < 0) return;

        const selectedData: number[] = [];
        for (let r = Math.min(row, row2); r <= Math.max(row, row2); r++) {
            for (let c = Math.min(col, col2); c <= Math.max(col, col2); c++) {
                const val = data[r]?.[c];
                if (val !== null && val !== undefined && val !== '' && !isNaN(Number(val))) {
                    selectedData.push(Number(val));
                }
            }
        }

        if (selectedData.length > 0) {
            const sum = selectedData.reduce((a, b) => a + b, 0);
            const avg = sum / selectedData.length;
            const min = Math.min(...selectedData);
            const max = Math.max(...selectedData);
            const newStats = {
                sum: Math.round(sum * 100) / 100,
                avg: Math.round(avg * 100) / 100,
                count: selectedData.length,
                min: Math.round(min * 100) / 100,
                max: Math.round(max * 100) / 100
            };
            if (JSON.stringify(newStats) !== JSON.stringify(stats)) {
                setStats(newStats);
            }
        } else if (stats.count !== 0) {
            setStats({ sum: 0, avg: 0, count: 0, min: 0, max: 0 });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-[1800px] mx-auto">
                {/* Header */}
                <div className="mb-6 bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                <span>📊</span>
                                {className} - الربع {quarterNum}
                            </h1>
                            <p className="text-gray-600 mt-1">العام الدراسي {selectedYear}</p>
                        </div>
                        <Link
                            href="/dashboard/classes"
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        >
                            ← العودة
                        </Link>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".xlsx,.xls"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            📁 رفع Excel
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                            📥 تصدير Excel
                        </button>
                        <button
                            onClick={saveData}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                        >
                            💾 حفظ
                        </button>
                        <button
                            onClick={() => setShowAI(!showAI)}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                        >
                            🤖 AI التحليل
                        </button>
                        {quarterNum !== '1' && (
                            <button
                                onClick={copyStudentsFromQ1}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
                            >
                                👥 نسخ من Q1
                            </button>
                        )}
                    </div>

                    {fileName && (
                        <div className="mt-4 text-sm text-gray-600">
                            📄 الملف: <span className="font-medium">{fileName}</span>
                        </div>
                    )}
                </div>

                {/* Main Editor */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    {/* Top Scrollbar */}
                    {scrollWidth > clientWidth && (
                        <div
                            ref={topScrollRef}
                            onScroll={handleTopScroll}
                            className="overflow-x-auto mb-2"
                            style={{ height: '12px', borderRadius: '6px', backgroundColor: '#f3f4f6' }}
                        >
                            <div style={{ width: `${scrollWidth}px`, height: '1px' }}></div>
                        </div>
                    )}

                    {/* Spreadsheet */}
                    <div
                        ref={tableContainerRef}
                        onScroll={handleTableScroll}
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
                                afterSelection={handleAfterSelection}
                                className="htMiddle"
                            />
                        )}
                    </div>

                    {/* Stats */}
                    {stats.count > 0 && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                            <div className="flex flex-wrap gap-6 text-sm font-medium">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600">المحدد:</span>
                                    <span className="text-blue-700 font-bold">{stats.count} خلية</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600">المجموع:</span>
                                    <span className="text-green-700 font-bold">{stats.sum}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600">المعدل:</span>
                                    <span className="text-purple-700 font-bold">{stats.avg}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600">الأصغر:</span>
                                    <span className="text-orange-700 font-bold">{stats.min}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600">الأكبر:</span>
                                    <span className="text-red-700 font-bold">{stats.max}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Analysis */}
                    <div className="mt-6 bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>📊</span>
                            تحليل البيانات الشامل
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600">إجمالي الخلايا</span>
                                    <span className="text-2xl">📝</span>
                                </div>
                                <div className="text-3xl font-bold text-blue-600">
                                    {data.length * (data[0]?.length || 0)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {data.length} صف × {data[0]?.length || 0} عمود
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-green-200 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600">الخلايا المملوءة</span>
                                    <span className="text-2xl">✅</span>
                                </div>
                                <div className="text-3xl font-bold text-green-600">
                                    {data.flat().filter(cell => cell !== null && cell !== undefined && cell !== '').length}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {Math.round((data.flat().filter(cell => cell !== null && cell !== undefined && cell !== '').length / (data.length * (data[0]?.length || 1))) * 100)}% ممتلئة
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600">القيم الرقمية</span>
                                    <span className="text-2xl">🔢</span>
                                </div>
                                <div className="text-3xl font-bold text-purple-600">
                                    {data.flat().filter(cell => !isNaN(Number(cell)) && cell !== '' && cell !== null).length}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    متوسط: {(() => {
                                        const nums = data.flat().filter(cell => !isNaN(Number(cell)) && cell !== '' && cell !== null).map(Number);
                                        return nums.length > 0 ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '0';
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quarterly Comparison */}
                    {Object.keys(quarterlyData).length > 1 && (
                        <div className="mt-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span>📈</span>
                                مقارنة الأداء بين الأرباع
                            </h3>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gradient-to-r from-purple-100 to-blue-100">
                                        <tr>
                                            <th className="p-3 text-right font-bold">الربع</th>
                                            <th className="p-3 text-center font-bold">عدد الصفوف</th>
                                            <th className="p-3 text-center font-bold">عدد الأعمدة</th>
                                            <th className="p-3 text-center font-bold">آخر تحديث</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y">
                                        {['q1', 'q2', 'q3', 'q4'].map((q, index) => {
                                            const qData = quarterlyData[q];
                                            if (!qData) return (
                                                <tr key={q}>
                                                    <td className="p-3 font-medium">Q{index + 1}</td>
                                                    <td colSpan={3} className="p-3 text-center text-gray-400">لا توجد بيانات</td>
                                                </tr>
                                            );
                                            return (
                                                <tr key={q} className={q === quarter ? 'bg-blue-50 font-bold' : ''}>
                                                    <td className="p-3">{q === quarter && '👉 '}Q{index + 1}</td>
                                                    <td className="p-3 text-center">{qData.data?.length || 0}</td>
                                                    <td className="p-3 text-center">{qData.data?.[0]?.length || 0}</td>
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
                    )}

                    {/* AI Analysis */}
                    {showAI && (
                        <div className="mt-6 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border-2 border-orange-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <span>🤖</span>
                                التحليل الذكي
                            </h3>
                            <div className="bg-white rounded-lg p-4 text-sm text-gray-700">
                                <p className="mb-2">💡 <strong>رؤى ذكية:</strong></p>
                                <ul className="space-y-2">
                                    {data.length > 0 && (
                                        <>
                                            <li>📊 الجدول يحتوي على {data.length} صف و {data[0]?.length || 0} عمود</li>
                                            <li>✅ {data.flat().filter(c => c !== '' && c !== null).length} خلية ممتلئة</li>
                                            <li>🔢 {data.flat().filter(c => !isNaN(Number(c)) && c !== '' && c !== null).length} قيمة رقمية</li>
                                            {quarterNum !== '1' && quarterlyData.q1 && (
                                                <li>📈 يمكنك مقارنة الأداء مع الربع الأول</li>
                                            )}
                                        </>
                                    )}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
