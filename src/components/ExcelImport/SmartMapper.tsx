import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { STUDENT_COLUMNS, ColumnDefinition } from '@/lib/studentColumns';

interface SmartMapperProps {
    file: File;
    onConfirm: (mappedData: any[]) => void;
    onCancel: () => void;
}

export default function SmartMapper({ file, onConfirm, onCancel }: SmartMapperProps) {
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        parseFile();
    }, [file]);

    const parseFile = () => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const bstr = e.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Read headers specifically
                const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1 });
                if (sheetData.length > 0) {
                    const fileHeaders = (sheetData[0] as any[]).map(String);
                    setHeaders(fileHeaders);

                    // Read data rows
                    const data = XLSX.utils.sheet_to_json(ws);
                    setRawData(data);

                    // Auto-map based on similarity
                    autoMapColumns(fileHeaders);
                }
            } catch (error) {
                console.error("Error parsing file:", error);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const autoMapColumns = (fileHeaders: string[]) => {
        const newMapping: Record<string, string> = {};

        STUDENT_COLUMNS.forEach(col => {
            // Fuzzy search exact match or contains
            const exactMatch = fileHeaders.find(h => h.includes(col.label) || col.label.includes(h));
            if (exactMatch) {
                newMapping[col.key] = exactMatch;
            }
        });
        setMapping(newMapping);
    };

    const handleConfirm = () => {
        // Transform data based on mapping
        const result = rawData.map(row => {
            const newRow: any = {};
            // Always try to map name if possible, or leave it empty
            STUDENT_COLUMNS.forEach(col => {
                const excelHeader = mapping[col.key];
                if (excelHeader) {
                    let value = row[excelHeader];
                    // Basic cleanup
                    if (value === undefined || value === null) value = '';
                    newRow[col.key] = value.toString();
                } else {
                    newRow[col.key] = '';
                }
            });
            return newRow;
        });
        onConfirm(result);
    };

    if (loading) return <div className="p-10 text-center">جاري تحليل الملف... ⏳</div>;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">

                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800">معالج الاستيراد الذكي 🧙‍♂️</h2>
                        <p className="text-gray-600">قم بربط أعمدة ملفك بحقول النظام</p>
                    </div>
                    <button onClick={onCancel} className="text-gray-500 hover:text-red-500 text-2xl">×</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                        {STUDENT_COLUMNS.map(col => {
                            const isMapped = !!mapping[col.key];
                            return (
                                <div key={col.key} className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between ${isMapped ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800">{col.label}</span>
                                        {col.options && <span className="text-xs text-gray-500">خيارات: {col.options.length}</span>}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{isMapped ? '🔗' : '❌'}</span>
                                        <select
                                            value={mapping[col.key] || ''}
                                            onChange={(e) => setMapping(prev => ({ ...prev, [col.key]: e.target.value }))}
                                            className={`max-w-[150px] p-2 rounded-lg border outline-none text-sm font-medium ${isMapped ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'}`}
                                        >
                                            <option value="">-- اختر عموداً --</option>
                                            {headers.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        تم ربط {Object.keys(mapping).length} من أصل {STUDENT_COLUMNS.length} حقل
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="px-6 py-2 rounded-xl text-gray-600 hover:bg-gray-200 font-bold"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-8 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                        >
                            استيراد البيانات ✅
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
