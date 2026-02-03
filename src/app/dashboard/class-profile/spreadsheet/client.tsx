'use client';

import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

// Register Handsontable modules
registerAllModules();

export default function SpreadsheetClient() {
    const [data, setData] = useState<any[][]>([
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
    ]);

    const [sheetNames, setSheetNames] = useState<string[]>(['Sheet1']);
    const [currentSheet, setCurrentSheet] = useState('Sheet1');
    const [allSheets, setAllSheets] = useState<Record<string, any[][]>>({ 'Sheet1': data });
    const [fileName, setFileName] = useState<string>('');
    const [stats, setStats] = useState({ sum: 0, avg: 0, count: 0, min: 0, max: 0 });

    // Refs for synchronized scrolling
    const [scrollWidth, setScrollWidth] = useState(0);
    const [clientWidth, setClientWidth] = useState(0);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef<'table' | 'top' | null>(null);
    const timeoutRef = useRef<any>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const hotTableRef = useRef<any>(null);

    // Update scroll dimensions when data changes
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
    }, [data, currentSheet]);

    // Synchronized scroll handlers
    const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isScrolling.current === 'top') return;

        isScrolling.current = 'table';
        if (topScrollRef.current) {
            topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }

        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            isScrolling.current = null;
        }, 50);
    };

    const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isScrolling.current === 'table') return;

        isScrolling.current = 'top';
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }

        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            isScrolling.current = null;
        }, 50);
    };

    // Handle Excel file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const workbook = XLSX.read(evt.target?.result, { type: 'binary' });

                // Get all sheet names
                const sheets = workbook.SheetNames;
                setSheetNames(sheets);

                // Load all sheets
                const sheetsData: Record<string, any[][]> = {};
                sheets.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                    sheetsData[sheetName] = jsonData as any[][];
                });

                setAllSheets(sheetsData);
                setCurrentSheet(sheets[0]);
                setData(sheetsData[sheets[0]]);

                alert(`✅ تم رفع الملف بنجاح!\n\nعدد الأوراق: ${sheets.length}\nالأوراق: ${sheets.join(', ')}`);
            } catch (error) {
                console.error('Error reading Excel:', error);
                alert('❌ فشل قراءة الملف!\n\nتأكد من أن الملف بصيغة Excel (.xlsx أو .xls)');
            }
        };

        reader.readAsBinaryString(file);
    };

    // Switch between sheets
    const loadSheet = (sheetName: string) => {
        if (sheetName === currentSheet) return; // Prevent unnecessary updates
        setCurrentSheet(sheetName);
        const sheetData = allSheets[sheetName] || [];
        setData(sheetData);
    };

    // Export to Excel
    const handleExport = () => {
        try {
            const wb = XLSX.utils.book_new();

            // Add all sheets
            sheetNames.forEach(sheetName => {
                const ws = XLSX.utils.aoa_to_sheet(allSheets[sheetName] || []);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            const exportFileName = fileName || 'spreadsheet_export.xlsx';
            XLSX.writeFile(wb, exportFileName);

            alert('✅ تم تصدير الملف بنجاح!');
        } catch (error) {
            console.error('Export error:', error);
            alert('❌ فشل تصدير الملف!');
        }
    };

    // Update data when cell changes
    const handleAfterChange = (changes: any, source: string) => {
        // Ignore automated updates to prevent infinite loops
        if (!changes || source === 'loadData' || source === 'ObserveChanges.change') return;

        const hot = hotTableRef.current?.hotInstance;
        if (hot) {
            const newData = hot.getData();
            // Only update allSheets, not data (to prevent loop)
            setAllSheets(prev => ({
                ...prev,
                [currentSheet]: newData
            }));
        }
    };

    // Calculate statistics on selection
    const handleAfterSelection = (row: number, col: number, row2: number, col2: number) => {
        // Prevent processing if coordinates are invalid
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

            // Only update if stats actually changed to prevent infinite loops
            if (JSON.stringify(newStats) !== JSON.stringify(stats)) {
                setStats(newStats);
            }
        } else if (stats.count !== 0) {
            // Only reset if stats aren't already at zero
            setStats({ sum: 0, avg: 0, count: 0, min: 0, max: 0 });
        }
    };

    // Add new row
    const handleAddRow = () => {
        const hot = hotTableRef.current?.hotInstance;
        if (hot) {
            hot.alter('insert_row_below');
        }
    };

    // Add new column
    const handleAddColumn = () => {
        const hot = hotTableRef.current?.hotInstance;
        if (hot) {
            hot.alter('insert_col_end');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                <span>📊</span>
                                محرر جداول البيانات
                            </h1>
                            <p className="text-gray-600 mt-1">رفع وتحليل وتعديل ملفات Excel</p>
                        </div>
                        <Link
                            href="/dashboard/classes"
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        >
                            ← العودة للصفوف
                        </Link>
                    </div>

                    {fileName && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800">
                            📁 <strong>الملف الحالي:</strong> {fileName}
                        </div>
                    )}
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    {/* Toolbar */}
                    <div className="flex gap-3 mb-4 flex-wrap">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-md"
                        >
                            <span>📁</span>
                            رفع Excel
                        </button>

                        <button
                            onClick={handleExport}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-md"
                        >
                            <span>📥</span>
                            تصدير Excel
                        </button>

                        <div className="flex-1"></div>

                        <button
                            onClick={handleAddRow}
                            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <span>➕</span>
                            صف جديد
                        </button>

                        <button
                            onClick={handleAddColumn}
                            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <span>➕</span>
                            عمود جديد
                        </button>
                    </div>

                    {/* Sheet Tabs */}
                    {sheetNames.length > 1 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                            {sheetNames.map(name => (
                                <button
                                    key={name}
                                    onClick={() => loadSheet(name)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${currentSheet === name
                                        ? 'bg-primary text-white shadow-md'
                                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                        }`}
                                >
                                    📄 {name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Top Horizontal Scrollbar */}
                    {scrollWidth > clientWidth && (
                        <div
                            ref={topScrollRef}
                            onScroll={handleTopScroll}
                            className="overflow-x-auto mb-2"
                            style={{
                                height: '12px',
                                borderRadius: '6px',
                                backgroundColor: '#f3f4f6'
                            }}
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
                        <HotTable
                            key={currentSheet}
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
                            autoColumnSize={false}
                            autoRowSize={false}
                            stretchH="all"
                            afterChange={handleAfterChange}
                            afterSelection={handleAfterSelection}
                            className="htMiddle"
                        />
                    </div>

                    {/* Statistics Bar */}
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

                    {/* Data Analysis Section */}
                    <div className="mt-6 bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>📊</span>
                            تحليل البيانات الشامل
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Total Cells */}
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

                            {/* Filled Cells */}
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

                            {/* Empty Cells */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600">الخلايا الفارغة</span>
                                    <span className="text-2xl">⬜</span>
                                </div>
                                <div className="text-3xl font-bold text-gray-600">
                                    {data.flat().filter(cell => cell === null || cell === undefined || cell === '').length}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {Math.round((data.flat().filter(cell => cell === null || cell === undefined || cell === '').length / (data.length * (data[0]?.length || 1))) * 100)}% فارغة
                                </div>
                            </div>

                            {/* Numeric Values */}
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

                            {/* Text Values */}
                            <div className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600">القيم النصية</span>
                                    <span className="text-2xl">📄</span>
                                </div>
                                <div className="text-3xl font-bold text-orange-600">
                                    {data.flat().filter(cell => isNaN(Number(cell)) && cell !== '' && cell !== null && cell !== undefined).length}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    نصوص ومحتوى غير رقمي
                                </div>
                            </div>

                            {/* Unique Values */}
                            <div className="bg-white p-4 rounded-lg border border-cyan-200 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600">القيم الفريدة</span>
                                    <span className="text-2xl">🎯</span>
                                </div>
                                <div className="text-3xl font-bold text-cyan-600">
                                    {new Set(data.flat().filter(cell => cell !== null && cell !== undefined && cell !== '')).size}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    قيم مختلفة في الجدول
                                </div>
                            </div>
                        </div>

                        {/* Column-wise Analysis */}
                        <div className="mt-6">
                            <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span>📈</span>
                                تحليل الأعمدة
                            </h4>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
                                            <tr>
                                                <th className="p-3 text-right font-bold text-gray-700">العمود</th>
                                                <th className="p-3 text-center font-bold text-gray-700">عدد القيم</th>
                                                <th className="p-3 text-center font-bold text-gray-700">قيم رقمية</th>
                                                <th className="p-3 text-center font-bold text-gray-700">المعدل</th>
                                                <th className="p-3 text-center font-bold text-gray-700">الأصغر</th>
                                                <th className="p-3 text-center font-bold text-gray-700">الأكبر</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {data[0]?.map((_, colIndex) => {
                                                const columnData = data.map(row => row[colIndex]).filter(cell => cell !== null && cell !== undefined && cell !== '');
                                                const numericData = columnData.filter(cell => !isNaN(Number(cell))).map(Number);
                                                const avg = numericData.length > 0 ? (numericData.reduce((a, b) => a + b, 0) / numericData.length).toFixed(2) : '-';
                                                const min = numericData.length > 0 ? Math.min(...numericData).toFixed(2) : '-';
                                                const max = numericData.length > 0 ? Math.max(...numericData).toFixed(2) : '-';

                                                return (
                                                    <tr key={colIndex} className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-3 font-medium text-gray-700">عمود {colIndex + 1}</td>
                                                        <td className="p-3 text-center text-blue-600 font-semibold">{columnData.length}</td>
                                                        <td className="p-3 text-center text-purple-600 font-semibold">{numericData.length}</td>
                                                        <td className="p-3 text-center text-green-600 font-semibold">{avg}</td>
                                                        <td className="p-3 text-center text-orange-600 font-semibold">{min}</td>
                                                        <td className="p-3 text-center text-red-600 font-semibold">{max}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Insights */}
                        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <span>💡</span>
                                رؤى ذكية
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                                {(() => {
                                    const filledPercentage = Math.round((data.flat().filter(cell => cell !== null && cell !== undefined && cell !== '').length / (data.length * (data[0]?.length || 1))) * 100);
                                    const insights = [];

                                    if (filledPercentage > 80) {
                                        insights.push('✅ الجدول ممتلئ بشكل جيد - معظم الخلايا تحتوي على بيانات');
                                    } else if (filledPercentage < 30) {
                                        insights.push('⚠️ الجدول يحتوي على الكثير من الخلايا الفارغة - قد تحتاج لإضافة المزيد من البيانات');
                                    }

                                    const numericPercentage = Math.round((data.flat().filter(cell => !isNaN(Number(cell)) && cell !== '' && cell !== null).length / data.flat().filter(cell => cell !== null && cell !== undefined && cell !== '').length) * 100);
                                    if (numericPercentage > 70) {
                                        insights.push('🔢 البيانات رقمية بشكل أساسي - مناسبة للتحليل الإحصائي');
                                    } else if (numericPercentage < 30) {
                                        insights.push('📝 البيانات نصية بشكل أساسي - قد تحتاج لتحويل بعض القيم لأرقام');
                                    }

                                    if (sheetNames.length > 1) {
                                        insights.push(`📊 الملف يحتوي على ${sheetNames.length} أوراق - يمكنك التبديل بينها من الأعلى`);
                                    }

                                    if (insights.length === 0) {
                                        insights.push('📈 الجدول جاهز للتحليل - يمكنك البدء بإضافة البيانات');
                                    }

                                    return insights.map((insight, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="mt-0.5">•</span>
                                            <span>{insight}</span>
                                        </li>
                                    ));
                                })()}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-3">💡 إرشادات الاستخدام:</h3>
                    <ul className="space-y-2 text-gray-700">
                        <li>• <strong>رفع ملف:</strong> اضغط "رفع Excel" واختر ملف .xlsx أو .xls</li>
                        <li>• <strong>التعديل:</strong> اضغط نقرة مزدوجة على أي خلية للتعديل</li>
                        <li>• <strong>النسخ/اللصق:</strong> استخدم Ctrl+C و Ctrl+V كالمعتاد</li>
                        <li>• <strong>الإحصائيات:</strong> حدد مجموعة خلايا لرؤية الإحصائيات تلقائياً</li>
                        <li>• <strong>التصدير:</strong> اضغط "تصدير Excel" لحفظ الملف</li>
                        <li>• <strong>القائمة:</strong> انقر بالزر الأيمن على الخلية لخيارات إضافية</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
