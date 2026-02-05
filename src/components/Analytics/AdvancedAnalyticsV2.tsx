import React from 'react';
import { STUDENT_COLUMNS } from '@/lib/studentColumns';

interface AdvancedAnalyticsV2Props {
    data: any[];
    className: string;
}

export default function AdvancedAnalyticsV2({ data, className }: AdvancedAnalyticsV2Props) {
    if (!data || data.length === 0) return null;

    // Helper: Count occurrences in a list
    const countOccurrences = (arr: any[]) => {
        return arr.reduce((acc, curr) => {
            const val = curr?.toString().trim();
            if (val) {
                acc[val] = (acc[val] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    };

    // 1. Process Grades
    const gradeColumns = STUDENT_COLUMNS.filter(c => c.type === 'numeric');
    const subjectStats = gradeColumns.map(col => {
        const grades = data.map(row => Number(row[col.key])).filter(g => !isNaN(g) && g > 0);
        const average = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
        return { name: col.label, average, count: grades.length };
    });

    // 2. Process Categorical Data (Dropdowns)
    const categoricalColumns = STUDENT_COLUMNS.filter(c => c.type === 'dropdown');

    return (
        <div className="space-y-8 mt-12 animate-fade-in">
            <h2 className="text-3xl font-black text-gray-800 text-center mb-8 border-b pb-4">
                📊 التحليل الشامل لبيانات الصف
            </h2>

            {/* Top Cards: General Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="عدد الطلاب" value={data.length} icon="👨‍🎓" color="blue" />
                <StatCard title="متوسط المعدل العام" value={subjectStats.reduce((acc, curr) => acc + curr.average, 0) / (subjectStats.length || 1)} suffix="%" icon="📈" color="green" />
                <StatCard title="عدد المواد" value={subjectStats.length} icon="📚" color="purple" />
                <StatCard title="بيانات مكتملة" value={`${Math.round((Object.values(data).filter(v => v).length / (data.length * STUDENT_COLUMNS.length)) * 100)}%`} icon="✅" color="orange" />
            </div>

            {/* Section 1: Academic Performance */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-lg">🎓</span>
                    الأداء الأكاديمي (المعدلات)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjectStats.map(stat => (
                        <div key={stat.name} className="bg-gray-50 rounded-xl p-4 relative overflow-hidden group hover:shadow-md transition-all">
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
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 2: Behavioral & Social Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {categoricalColumns.map(col => {
                    const counts = countOccurrences(data.map(row => row[col.key]));
                    const total = data.length;

                    // Skip if empty
                    if (Object.keys(counts).length === 0) return null;

                    return (
                        <div key={col.key} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-4 flex justify-between items-center border-b pb-2">
                                <span>{col.label}</span>
                                <span className="text-xs font-normal bg-gray-100 px-2 py-1 rounded text-gray-500">{total} سجل</span>
                            </h4>
                            <div className="space-y-3">
                                {(Object.entries(counts) as [string, number][]).map(([label, count]) => (
                                    <div key={label} className="relative">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-gray-700">{label}</span>
                                            <span className="font-bold text-gray-900">{count}</span>
                                        </div>
                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                                style={{ width: `${(count / total) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Section 3: Text Analysis (Strengths/Weaknesses/Notes) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['strengths', 'weaknesses', 'notes'].map(key => {
                    const col = STUDENT_COLUMNS.find(c => c.key === key);
                    if (!col) return null;
                    const items = data.map(r => r[key]).filter(v => v);
                    if (items.length === 0) return null;

                    return (
                        <div key={key} className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 border border-indigo-100 shadow-sm">
                            <h4 className="font-bold text-indigo-900 mb-4">{col.label} ({items.length})</h4>
                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {items.map((item, idx) => (
                                    <div key={idx} className="text-sm bg-white p-2 rounded border border-indigo-50 text-gray-600 shadow-sm leading-relaxed">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function StatCard({ title, value, suffix = '', icon, color }: any) {
    const bgColors: any = { blue: 'bg-blue-50', green: 'bg-green-50', purple: 'bg-purple-50', orange: 'bg-orange-50' };
    const textColors: any = { blue: 'text-blue-600', green: 'text-green-600', purple: 'text-purple-600', orange: 'text-orange-600' };

    return (
        <div className={`${bgColors[color]} rounded-2xl p-6 flex flex-col items-center justify-center text-center border-2 border-transparent hover:border-${color}-200 transition-all`}>
            <div className={`text-4xl mb-2`}>{icon}</div>
            <div className={`text-3xl font-black ${textColors[color]} mb-1`}>
                {typeof value === 'number' ? value.toFixed(0) : value}{suffix}
            </div>
            <div className="text-sm font-medium text-gray-500">{title}</div>
        </div>
    );
}
