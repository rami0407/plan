'use client';

import { Student } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';
import styles from './HolisticGrid.module.css';

interface Props {
    students: Student[];
    onUpdate: (students: Student[]) => void;
    subjects?: string[];
    onDeleteStudent?: (id: string) => void;
    onDeleteSubject?: (subject: string) => void;
}

export default function HolisticGrid({ students: initialData, onUpdate, subjects: propSubjects, onDeleteStudent, onDeleteSubject }: Props) {
    const [students, setStudents] = useState(initialData);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    // Refs for synchronization
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const [scrollWidth, setScrollWidth] = useState(0);
    const [clientWidth, setClientWidth] = useState(0);
    const isScrolling = useRef<'table' | 'top' | null>(null);
    const timeoutRef = useRef<any>(null);

    // Update local state when props change (sync)
    if (initialData !== students) {
        setStudents(initialData);
    }

    // Update dimensions on data change
    useEffect(() => {
        const updateWidth = () => {
            if (tableContainerRef.current) {
                const { scrollWidth, clientWidth } = tableContainerRef.current;
                setScrollWidth(scrollWidth);
                setClientWidth(clientWidth);
            }
        };

        // Initial check with small delay to ensure rendering
        const timer = setTimeout(updateWidth, 100);

        // Add ResizeObserver to detect container resizing
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
    }, [students, propSubjects]);

    // Handlers for synchronized scrolling
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

    const handleChange = (id: string, field: keyof Student | string, value: any, nestedKey?: string) => {
        const updated = students.map(s => {
            if (s.id !== id) return s;

            if (nestedKey && field === 'grades') {
                // Keep value as-is (string or number), don't convert to Number
                return { ...s, grades: { ...s.grades, [nestedKey]: value } };
            }

            return { ...s, [field]: value };
        });

        onUpdate(updated);
    };

    const handleEditStudent = (student: Student) => {
        setEditingStudent(student);
    };

    const handleSaveEdit = () => {
        if (!editingStudent) return;

        const updated = students.map(s => s.id === editingStudent.id ? editingStudent : s);
        onUpdate(updated);
        setEditingStudent(null);
    };

    const handleCancelEdit = () => {
        setEditingStudent(null);
    };

    // Subject Translation Map
    const subjectTranslations: { [key: string]: string } = {
        'Arabic': 'لغة عربية',
        'Hebrew': 'لغة عبرية',
        'Math': 'رياضيات',
        'English': 'لغة إنجليزية',
        'Science': 'علوم'
    };

    const getSubjectLabel = (subject: string) => subjectTranslations[subject] || subject;

    const defaultSubjects = ['Arabic', 'Hebrew', 'Math', 'English', 'Science'];
    const subjects = propSubjects && propSubjects.length > 0 ? propSubjects : defaultSubjects;

    const getGradeClass = (grade: number | string | undefined | null) => {
        if (grade === undefined || grade === null || grade === '') return '';

        // Convert to number and check if it's valid
        const numGrade = Number(grade);

        // If it's not a valid number (e.g., text like "غائب"), return no color
        if (isNaN(numGrade)) return '';

        // Apply color coding for valid numbers
        if (numGrade >= 90) return '!bg-emerald-200 !text-emerald-900 !font-bold'; // Excellent
        if (numGrade >= 80) return '!bg-green-100 !text-green-800 !font-bold'; // Very Good
        if (numGrade >= 70) return '!bg-blue-100 !text-blue-800 !font-bold'; // Good
        if (numGrade >= 55) return '!bg-yellow-100 !text-yellow-800 !font-bold'; // Fair
        return '!bg-red-100 !text-red-800 !font-bold'; // Weak/Fail
    };

    // Calculate statistics for a subject
    const calculateSubjectStats = (subject: string) => {
        const grades = students
            .map(s => s.grades[subject])
            .filter(g => g !== undefined && g !== null && g !== '')
            .map(g => Number(g));

        if (grades.length === 0) {
            return { avg: 0, min: 0, max: 0, passRate: 0, excellenceRate: 0, count: 0 };
        }

        const sum = grades.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / grades.length);
        const min = Math.min(...grades);
        const max = Math.max(...grades);
        const passCount = grades.filter(g => g >= 55).length;
        const excellenceCount = grades.filter(g => g >= 90).length;
        const passRate = Math.round((passCount / grades.length) * 100);
        const excellenceRate = Math.round((excellenceCount / grades.length) * 100);

        return { avg, min, max, passRate, excellenceRate, count: grades.length };
    };

    const getStatsBgClass = (avg: number) => {
        if (avg >= 80) return 'bg-green-50';
        if (avg >= 70) return 'bg-yellow-50';
        return 'bg-red-50';
    };

    return (
        <div className="w-full relative">
            {/* Top Scrollbar - Styled for visibility */}
            <div
                ref={topScrollRef}
                onScroll={handleTopScroll}
                className="w-full overflow-x-auto print:hidden bg-gray-100 border border-gray-300 rounded-t-lg mb-0 sticky top-0 z-20 shadow-sm"
                style={{
                    height: '24px',
                    direction: 'rtl',
                    // Force visibility if there's possibly overflow, or rely on scrollWidth > clientWidth logic if solid
                    display: scrollWidth > clientWidth ? 'block' : 'none'
                }}
            >
                <div style={{ width: `${scrollWidth}px`, height: '1px' }}></div>
            </div>

            <div
                className={`${styles.container} ${scrollWidth > clientWidth ? 'rounded-t-none border-t-0' : ''}`}
                ref={tableContainerRef}
                onScroll={handleTableScroll}
            >
                <table className={styles.table}>
                    <thead className="bg-[#2D5DA1] text-white">
                        <tr>
                            <th style={{ width: '50px' }}></th>
                            <th>اسم الطالب</th>
                            <th style={{ minWidth: '120px' }}>التحصيل الأكاديمي</th>
                            <th style={{ minWidth: '120px' }}>الوضع الاجتماعي</th>
                            <th style={{ width: '80px' }}>الغيابات</th>
                            {subjects.map(sub => (
                                <th key={sub} style={{ minWidth: '100px' }} className="group/th relative">
                                    <div className="flex items-center justify-between gap-2">
                                        <span>{getSubjectLabel(sub)}</span>
                                        {!defaultSubjects.includes(sub) && onDeleteSubject && (
                                            <button
                                                onClick={() => onDeleteSubject(sub)}
                                                className="p-1 text-red-300 hover:text-red-100 hover:bg-red-600/50 rounded transition-colors opacity-0 group-hover/th:opacity-100"
                                                title="حذف العمود"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th style={{ minWidth: '200px' }}>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student) => (
                            <tr key={student.id}>
                                <td className="text-center">
                                    <div className="flex gap-1 justify-center">
                                        <button
                                            onClick={() => handleEditStudent(student)}
                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                                            title="تعديل الطالب"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => onDeleteStudent?.(student.id)}
                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                                            title="حذف الطالب"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                                <td className="font-medium">{student.name}</td>

                                <td>
                                    <select
                                        className={styles.input}
                                        value={student.academicStatus || ''}
                                        onChange={(e) => handleChange(student.id, 'academicStatus', e.target.value)}
                                    >
                                        <option value="">اختر...</option>
                                        <option value="Excellent">ممتاز</option>
                                        <option value="Good">جيد</option>
                                        <option value="Fair">متوسط</option>
                                        <option value="Poor">ضعيف</option>
                                    </select>
                                </td>

                                <td>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={student.socialStatus || ''}
                                        onChange={(e) => handleChange(student.id, 'socialStatus', e.target.value)}
                                        placeholder="-"
                                    />
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        style={{ width: '60px', textAlign: 'center' }}
                                        value={student.absences}
                                        onChange={(e) => handleChange(student.id, 'absences', Number(e.target.value))}
                                    />
                                </td>

                                {/* Grades */}
                                {subjects.map(sub => (
                                    <td key={sub}>
                                        <input
                                            type="text"
                                            className={`${styles.input} ${getGradeClass(student.grades[sub])}`}
                                            style={{ minWidth: '80px', textAlign: 'center', transition: 'background-color 0.3s' }}
                                            value={student.grades[sub] || ''}
                                            onChange={(e) => handleChange(student.id, 'grades', e.target.value, sub)}
                                            placeholder="-"
                                        />
                                    </td>
                                ))}

                                <td>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={student.notes || ''}
                                        onChange={(e) => handleChange(student.id, 'notes', e.target.value)}
                                        placeholder="ملاحظات..."
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-primary">
                        <tr>
                            <td colSpan={2} className="p-4 font-bold text-gray-700 text-right">
                                📊 التحليل الإحصائي
                            </td>
                            <td colSpan={3}></td>
                            {subjects.map(sub => {
                                const stats = calculateSubjectStats(sub);
                                return (
                                    <td key={sub} className={`p-3 ${getStatsBgClass(stats.avg)} border-l border-gray-200`}>
                                        <div className="text-xs space-y-1">
                                            <div className="font-bold text-gray-800">المعدل: {stats.avg}</div>
                                            <div className="text-gray-600">أعلى: {stats.max} | أدنى: {stats.min}</div>
                                            <div className="text-gray-600">نجاح: {stats.passRate}%</div>
                                            <div className="text-green-700 font-semibold">امتياز: {stats.excellenceRate}%</div>
                                        </div>
                                    </td>
                                );
                            })}
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Edit Student Modal */}
            {editingStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCancelEdit}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            تعديل بيانات الطالب
                        </h3>

                        <div className="space-y-4">
                            {/* Student Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">اسم الطالب</label>
                                <input
                                    type="text"
                                    value={editingStudent.name}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                                    placeholder="أدخل اسم الطالب"
                                />
                            </div>

                            {/* Academic Achievement */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">التحصيل الأكاديمي</label>
                                <select
                                    value={editingStudent.academicStatus || ''}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, academicStatus: e.target.value as 'Excellent' | 'Good' | 'Fair' | 'Poor' })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                                >
                                    <option value="">اختر...</option>
                                    <option value="Excellent">ممتاز</option>
                                    <option value="Good">جيد</option>
                                    <option value="Fair">متوسط</option>
                                    <option value="Poor">ضعيف</option>
                                </select>
                            </div>

                            {/* Social Status */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الوضع الاجتماعي</label>
                                <input
                                    type="text"
                                    value={editingStudent.socialStatus || ''}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, socialStatus: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                                    placeholder="مثال: عادي، منفصل، يتيم..."
                                />
                            </div>

                            {/* Absences */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الغيابات</label>
                                <input
                                    type="number"
                                    value={editingStudent.absences || 0}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, absences: Number(e.target.value) })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSaveEdit}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
                            >
                                💾 حفظ التعديلات
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                            >
                                ❌ إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
