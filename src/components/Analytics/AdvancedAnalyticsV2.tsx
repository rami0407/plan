import React, { useState } from 'react';
import { STUDENT_COLUMNS } from '@/lib/studentColumns';

interface AdvancedAnalyticsV2Props {
    data: any[];
    className: string;
}

export default function AdvancedAnalyticsV2({ data, className }: AdvancedAnalyticsV2Props) {
    const [modalData, setModalData] = useState<{ title: string; students: { name: string; value?: string | number }[] } | null>(null);

    if (!data || data.length === 0) return null;

    // Helper: Group data mapping student names to values
    const groupData = (key: string) => {
        const groups: Record<string, { name: string; value?: string }[]> = {};
        data.forEach(row => {
            const val = row[key]?.toString().trim();
            if (val) {
                if (!groups[val]) groups[val] = [];
                groups[val].push({ name: row['name'] || 'طالب غير معروف', value: val });
            }
        });
        return groups;
    };

    // 1. Process Grades
    const gradeColumns = STUDENT_COLUMNS.filter(c => c.type === 'numeric');
    const subjectStats = gradeColumns.map(col => {
        const grades = data.map(row => ({ name: row['name'], value: Number(row[col.key]) })).filter(g => !isNaN(g.value) && g.value > 0);
        const average = grades.length > 0 ? grades.reduce((a, b) => a + b.value, 0) / grades.length : 0;
        return { name: col.label, average, count: grades.length, students: grades };
    });

    // 2. Process Categorical Data (Dropdowns)
    const categoricalColumns = STUDENT_COLUMNS.filter(c => c.type === 'dropdown');

    // 3. Overall Stats Calculation
    const allGrades = data.flatMap(row => gradeColumns.map(c => Number(row[c.key])).filter(g => !isNaN(g) && g > 0));
    const overallAverage = allGrades.length > 0 ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length : 0;

    // Calculate student averages for top/struggling
    const studentAverages = data.map(row => {
        const grades = gradeColumns.map(c => Number(row[c.key])).filter(g => !isNaN(g) && g > 0);
        const avg = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
        return { name: row['name'], average: avg };
    }).filter(s => s.average > 0);

    // Grade Distribution
    const gradeRanges = [
        { label: 'ممتاز (90-100)', min: 90, max: 100, color: 'bg-green-500', students: [] as any[] },
        { label: 'جيد جداً (80-89)', min: 80, max: 89, color: 'bg-blue-500', students: [] as any[] },
        { label: 'جيد (70-79)', min: 70, max: 79, color: 'bg-yellow-500', students: [] as any[] },
        { label: 'مقبول (55-69)', min: 55, max: 69, color: 'bg-orange-500', students: [] as any[] },
        { label: 'راسب (<55)', min: 0, max: 54, color: 'bg-red-500', students: [] as any[] }
    ];

    studentAverages.forEach(student => {
        const range = gradeRanges.find(r => student.average >= r.min && student.average <= r.max);
        if (range) range.students.push({ name: student.name, value: student.average.toFixed(1) });
    });

    const handleShowStudents = (title: string, students: any[]) => {
        if (students && students.length > 0) {
            setModalData({ title, students });
        }
    };

    return (
        <div className="space-y-8 mt-12 animate-fade-in relative">
            <h2 className="text-3xl font-black text-gray-800 text-center mb-8 border-b pb-4">
                📊 التحليل الشامل لبيانات الصف
            </h2>

            {/* Top Cards: General Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="عدد الطلاب"
                    value={data.length}
                    icon="👨‍🎓"
                    color="blue"
                    onClick={() => handleShowStudents('جميع الطلاب', data.map(r => ({ name: r['name'] })))}
                />
                <StatCard title="متوسط المعدل العام" value={overallAverage} suffix="%" icon="📈" color="green" />
                <StatCard title="عدد المواد" value={subjectStats.length} icon="📚" color="purple" />
                <StatCard
                    title="بيانات مكتملة"
                    value={`${Math.round((Object.values(data).filter(v => v).length / (data.length * STUDENT_COLUMNS.length)) * 100)}%`}
                    icon="✅"
                    color="orange"
                />
            </div>

            {/* Section 1: Academic Performance */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-lg">🎓</span>
                    الأداء الأكاديمي (المعدلات)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjectStats.map(stat => (
                        <button
                            key={stat.name}
                            onClick={() => handleShowStudents(`الطلاب في مادة ${stat.name}`, stat.students.map((s: { name: any; value: any; }) => ({ name: s.name, value: s.value })))}
                            className="text-right w-full bg-gray-50 rounded-xl p-4 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="relative z-10">
                                <div className="text-gray-500 text-sm mb-1">{stat.name}</div>
                                <div className="text-3xl font-black text-gray-800 group-hover:text-blue-600 transition-colors">
                                    {stat.average.toFixed(1)}
                                    <span className="text-sm font-normal text-gray-400 ml-1">%</span>
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 left-0 h-1 bg-gray-200">
                                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${stat.average}%` }}></div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Section 2: Behavioral & Social Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {categoricalColumns.map(col => {
                    const groups = groupData(col.key);
                    const total = data.length;

                    // Skip if empty
                    if (Object.keys(groups).length === 0) return null;

                    return (
                        <div key={col.key} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-4 flex justify-between items-center border-b pb-2">
                                <span>{col.label}</span>
                                <span className="text-xs font-normal bg-gray-100 px-2 py-1 rounded text-gray-500">{total} سجل</span>
                            </h4>
                            <div className="space-y-3">
                                {Object.entries(groups).map(([label, students]) => (
                                    <button
                                        key={label}
                                        onClick={() => handleShowStudents(`${col.label}: ${label}`, students)}
                                        className="relative w-full text-right hover:bg-gray-50 p-2 rounded-lg transition-colors group cursor-pointer"
                                    >
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{label}</span>
                                            <span className="font-bold text-gray-900 bg-gray-100 px-2 rounded-full text-xs flex items-center">{students.length}</span>
                                        </div>
                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                                style={{ width: `${(students.length / total) * 100}%` }}
                                            ></div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Section 3: Grade Distribution Drill-down */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <span>📈</span>
                    توزيع المعدلات (اضغط للتفاصيل)
                </h3>
                <div className="space-y-3">
                    {gradeRanges.map((range, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleShowStudents(range.label, range.students)}
                            className="w-full flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-all cursor-pointer group"
                        >
                            <div className="w-32 text-sm font-medium text-gray-700 text-right">{range.label}</div>
                            <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden relative">
                                <div
                                    className={`${range.color} h-full flex items-center justify-end px-3 text-white font-bold text-sm transition-all duration-500`}
                                    style={{ width: `${studentAverages.length > 0 ? (range.students.length / studentAverages.length) * 100 : 0}%` }}
                                >
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    اضغط لعرض الأسماء
                                </div>
                            </div>
                            <div className="w-16 text-right text-sm font-bold text-gray-700">
                                {range.students.length > 0 && `${range.students.length} طالب`}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Section 4: Text Analysis (Strengths/Weaknesses/Notes) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['strengths', 'weaknesses', 'notes'].map(key => {
                    const col = STUDENT_COLUMNS.find(c => c.key === key);
                    if (!col) return null;

                    // Filter rows that have content for this column
                    const nonEmptyRows = data.filter(r => r[key]);

                    if (nonEmptyRows.length === 0) return null;

                    return (
                        <div key={key} className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 border border-indigo-100 shadow-sm">
                            <h4 className="font-bold text-indigo-900 mb-4">{col.label} ({nonEmptyRows.length})</h4>
                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {nonEmptyRows.map((row, idx) => (
                                    <div key={idx} className="text-sm bg-white p-2 rounded border border-indigo-50 text-gray-600 shadow-sm leading-relaxed">
                                        <span className='font-bold text-indigo-600 block mb-1 text-xs'>{row['name']}</span>
                                        {row[key]}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Drill-down Modal */}
            {modalData && (
                <div className="fixed inset-0 z-[10060] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setModalData(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg">{modalData.title}</h3>
                            <button
                                onClick={() => setModalData(null)}
                                className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {modalData.students.length > 0 ? (
                                <table className="w-full text-right">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">الاسم</th>
                                            {modalData.students[0].value !== undefined && (
                                                <th className="px-6 py-3 font-medium">القيمة</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {modalData.students.map((s, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                                <td className="px-6 py-3 font-medium text-gray-800">{s.name}</td>
                                                {s.value !== undefined && (
                                                    <td className="px-6 py-3 text-blue-600 font-bold">{s.value}</td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-gray-500">لا يوجد بيانات لعرضها</div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t flex justify-end">
                            <button
                                onClick={() => setModalData(null)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, suffix = '', icon, color, onClick }: any) {
    const bgColors: any = { blue: 'bg-blue-50', green: 'bg-green-50', purple: 'bg-purple-50', orange: 'bg-orange-50' };
    const textColors: any = { blue: 'text-blue-600', green: 'text-green-600', purple: 'text-purple-600', orange: 'text-orange-600' };

    return (
        <div
            onClick={onClick}
            className={`${bgColors[color]} rounded-2xl p-6 flex flex-col items-center justify-center text-center border-2 border-transparent hover:border-${color}-200 transition-all ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
        >
            <div className={`text-4xl mb-2`}>{icon}</div>
            <div className={`text-3xl font-black ${textColors[color]} mb-1`}>
                {typeof value === 'number' ? value.toFixed(0) : value}{suffix}
            </div>
            <div className="text-sm font-medium text-gray-500">{title}</div>
            {onClick && <div className="mt-2 text-xs text-blue-400 bg-white/50 px-2 py-1 rounded-full">اضغط للتفاصيل</div>}
        </div>
    );
}
