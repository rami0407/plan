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
                return { ...s, grades: { ...s.grades, [nestedKey]: value === '' ? '' : Number(value) } };
            }

            return { ...s, [field]: value };
        });

        onUpdate(updated);
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
        const numGrade = Number(grade);
        if (numGrade >= 90) return '!bg-emerald-200 !text-emerald-900 !font-bold'; // Excellent
        if (numGrade >= 80) return '!bg-green-100 !text-green-800 !font-bold'; // Very Good
        if (numGrade >= 70) return '!bg-blue-100 !text-blue-800 !font-bold'; // Good
        if (numGrade >= 55) return '!bg-yellow-100 !text-yellow-800 !font-bold'; // Fair
        return '!bg-red-100 !text-red-800 !font-bold'; // Weak/Fail
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
                    <thead>
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
                </table>
            </div>
        </div>
    );
}
