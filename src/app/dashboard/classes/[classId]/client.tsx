'use client';

import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { STUDENT_COLUMNS, ColumnDefinition, getLocalizedColumns } from '@/lib/studentColumns';
import SmartMapper from '@/components/ExcelImport/SmartMapper';
import AdvancedAnalyticsV2 from '@/components/Analytics/AdvancedAnalyticsV2';
import { useTranslation } from '@/contexts/LanguageContext';

// ... imports

registerAllModules();

const getQuarterPeriod = (quarterId: string, language: string) => {
    switch (quarterId) {
        case 'q1': return language === 'ar' ? 'سبتمبر - نوفمبر' : 'ספטמבר - נובמבר';
        case 'q2': return language === 'ar' ? 'ديسمبر - فبراير' : 'דצמבר - פברואר';
        case 'q3': return language === 'ar' ? 'مارس - مايو' : 'מרץ - מאי';
        case 'q4': return language === 'ar' ? 'يونيو - أغسطس' : 'יוני - אוגוסט';
        default: return '';
    }
};

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
    const { t, language } = useTranslation();
    const localizedColumns = getLocalizedColumns(language);
    
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
            alert(language === 'ar' ? '✅ تم حفظ البيانات بنجاح!' : '✅ הנתונים נשמרו בהצלחה!');
        } catch (error) {
            console.error('Error saving:', error);
            alert(language === 'ar' ? '❌ فشل الحفظ!' : '❌ השמירה נכשלה!');
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
            localizedColumns.forEach(col => templateRow[col.label] = ''); // Use Label as header for user friendliness

            const ws = XLSX.utils.json_to_sheet([templateRow]);

            // Add Data Validations for Dropdowns
            localizedColumns.forEach((col, idx) => {
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

    const handleImportPreviousQuarter = async () => {
        const currentIndex = QUARTERS.findIndex(q => q.id === selectedQuarter);
        if (currentIndex <= 0) return;

        const prevQuarter = QUARTERS[currentIndex - 1];

        if (!confirm(language === 'ar' 
            ? `هل أنت متأكد من استيراد البيانات من ${prevQuarter.name}؟ سيتم استبدال أي بيانات موجودة حالياً.` 
            : `האם אתה בטוח שברצונך לייבא נתונים מ-${prevQuarter.name}? נתונים קיימים יידרסו.`
        )) {
            return;
        }

        setLoading(true);
        try {
            const docRef = doc(db, 'classes', String(selectedYear), classId, prevQuarter.id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const docData = docSnap.data();
                if (docData.dataJson) {
                    const parsedData = JSON.parse(docData.dataJson);
                    setData(parsedData);
                    alert(language === 'ar' ? `تم استيراد البيانات من ${prevQuarter.name} بنجاح!` : `הנתונים יובאו מ-${prevQuarter.name} בהצלחה!`);
                } else {
                    alert(language === 'ar' ? `لا توجد بيانات محفوظة في ${prevQuarter.name}.` : `אין נתונים שמורים ב-${prevQuarter.name}.`);
                }
            } else {
                alert(language === 'ar' ? `لم يتم العثور على بيانات في ${prevQuarter.name}.` : `לא נמצאו נתונים ב-${prevQuarter.name}.`);
            }
        } catch (error) {
            console.error('Error importing previous quarter:', error);
            alert(language === 'ar' ? 'حدث خطأ أثناء الاستيراد.' : 'אירעה שגיאה במהלך הייבוא.');
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        try {
            // Map data back to labels for export
            const exportData = data.map(row => {
                const newRow: any = {};
                localizedColumns.forEach(col => {
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
            alert(language === 'ar' ? 'فشل التصدير!' : 'הייצוא נכשל!');
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
                                {t(className)}
                            </h1>
                            <p className="text-gray-600 mt-1">{t('school_year')} {selectedYear}</p>
                        </div>
                        <Link
                            href="/dashboard/classes"
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
                        >
                            ← {t('back')}
                        </Link>
                    </div>
                </div>

                {/* Quarters Selection */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">{language === 'ar' ? 'المراحل الأربعة:' : 'ארבעת הרבעונים:'}</h2>
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
                                    <div className="font-bold text-sm mb-1">{t('quarter_' + q.id.substring(1))}</div>
                                    <div className={`text-xs ${selectedQuarter === q.id ? 'text-white/80' : 'text-gray-500'}`}>
                                        {getQuarterPeriod(q.id, language)}
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
                            {t('import_excel_file')}
                        </button>
                        <button
                            onClick={handleDownloadTemplate}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <span>📋</span>
                            {t('download_ready_template')}
                        </button>

                        {/* Import from Previous Quarter Button */}
                        {selectedQuarter !== 'q1' && (
                            <button
                                onClick={handleImportPreviousQuarter}
                                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                            >
                                <span>⏮️</span>
                                {t('copy_prev_quarter')}
                            </button>
                        )}

                        <button
                            onClick={handleExportExcel}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <span>📥</span>
                            {t('export_excel')}
                        </button>
                        <button
                            onClick={saveData}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <span>💾</span>
                            {t('save_changes')}
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
                        {language === 'ar' ? 'جدول التعبئة' : 'טבלת מילוי'} - {t('quarter_' + selectedQuarter.substring(1))}
                    </h3>

                    <div
                        ref={tableContainerRef}
                        className="border-2 border-gray-200 rounded-lg overflow-hidden"
                    >
                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="text-4xl mb-2">⏳</div>
                                <p className="text-gray-600">{language === 'ar' ? 'جاري التحميل...' : 'טוען...'}</p>
                            </div>
                        ) : (
                            <HotTable
                                ref={hotTableRef}
                                data={data}
                                columns={localizedColumns.map(col => ({
                                    data: col.key,
                                    type: col.type,
                                    source: col.options,
                                    width: col.width
                                }))}
                                colHeaders={localizedColumns.map(col => col.label)}
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
                        <p className="font-medium mb-2">{t('use_tips')}</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>{t('tip_dropdowns')}</li>
                            <li>{t('tip_template')}</li>
                            <li>{t('tip_mapping')}</li>
                        </ul>
                    </div>
                </div>

                {/* Comprehensive Data Analysis Section */}
                <AdvancedAnalyticsV2 data={data} className={className} />

                {/* Smart Mapper Modal */}
                {showMapper && tempFile && (
                    <SmartMapper
                        file={tempFile}
                        onConfirm={handleMapperConfirm}
                        onCancel={() => { setShowMapper(false); setTempFile(null); }}
                    />
                )}
                {/* End Smart Mapper Modal, previous comments removed */}

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



// Quarter Comparison Component
function QuarterComparison({ classId, selectedYear, currentQuarter }: { classId: string; selectedYear: number; currentQuarter: string }) {
    const { t, language } = useTranslation();
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
                <div className="text-center text-gray-600">{t('loading_quarters_comparison')}</div>
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
                {t('compare_performance_quarters')}
            </h4>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-purple-100 to-blue-100">
                        <tr>
                            <th className="p-3 text-right font-bold">{t('quarter_col')}</th>
                            <th className="p-3 text-center font-bold">{t('rows_count_col')}</th>
                            <th className="p-3 text-center font-bold">{t('cols_count_col')}</th>
                            <th className="p-3 text-center font-bold">{t('filled_cells_col')}</th>
                            <th className="p-3 text-center font-bold">{t('last_update')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y">
                        {['q1', 'q2', 'q3', 'q4'].map((q) => {
                            const qData = quarterlyData[q];
                            if (!qData) return (
                                <tr key={q}>
                                    <td className="p-3 font-medium">{q.toUpperCase()}</td>
                                    <td colSpan={4} className="p-3 text-center text-gray-400">{t('no_data')}</td>
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
                                        {qData.lastUpdated ? new Date(qData.lastUpdated).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'he-IL') : '-'}
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

