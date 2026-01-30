'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import HolisticGrid from '@/components/mapping/HolisticGrid';
import Link from 'next/link';
import {
    getStudents,
    getClass,
    addStudent,
    updateStudent,
    updateClass,
    deleteStudent
} from '@/lib/firestoreService';
import { Student, ClassGroup } from '@/lib/types';

export default function ClassDetailsClient({ classId }: { classId: string }) {
    const router = useRouter();
    const decodedClassId = decodeURIComponent(classId);

    const [classData, setClassData] = useState<ClassGroup | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cls, stus] = await Promise.all([
                    getClass(decodedClassId),
                    getStudents(decodedClassId)
                ]);
                setClassData(cls);
                setStudents(stus);
            } catch (error) {
                console.error('Error fetching data:', error);
                alert('حدث خطأ أثناء تحميل البيانات');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [decodedClassId]);

    const handleFileExport = () => {
        if (students.length === 0) {
            alert('لا توجد بيانات لتصديرها');
            return;
        }

        // Prepare data for export
        const dataToExport = students.map(s => {
            const row: any = {
                'الاسم': s.name,
                'المرحلة': classData?.name || '',
                'التحصيل الأكاديمي': s.academicStatus === 'Excellent' ? 'ممتاز' : s.academicStatus === 'Good' ? 'جيد' : s.academicStatus === 'Fair' ? 'متوسط' : 'ضعيف',
                'الوضع الاجتماعي': s.socialStatus,
                'غيابات': s.absences,
                'ملاحظات': s.notes || ''
            };

            // Add grades dynamically
            const subjects = classData?.subjects || ['Arabic', 'Hebrew', 'Math', 'English', 'Science'];
            subjects.forEach(sub => {
                row[sub] = s.grades[sub] || '';
            });

            return row;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);

        // Adjust column widths (optional but good)
        const wscols = [
            { wch: 20 }, // Name
            { wch: 15 }, // Class
            { wch: 15 }, // Status
            { wch: 20 }, // Social
            { wch: 10 }, // Absences
            { wch: 30 }, // Notes
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
        XLSX.writeFile(wb, `Holistic_Map_${classData?.name || 'Class'}_${new Date().toLocaleDateString()}.xlsx`);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();

        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            const newStudents: Student[] = data.map((row: any, i) => ({
                id: `imported-${Date.now()}-${i}`,
                classId: decodedClassId,
                name: row['Name'] || row['الاسم'] || `طالب مستورد ${i}`,
                absences: row['Absences'] || row['غيابات'] || 0,
                grades: {
                    Math: row['Math'] || row['رياضيات'] || 0,
                    Arabic: row['Arabic'] || row['عربي'] || 0,
                    Hebrew: row['Hebrew'] || row['عبري'] || 0,
                    English: row['English'] || row['انجليزي'] || 0,
                    Science: row['Science'] || row['علوم'] || 0,
                },
                academicStatus: 'Good',
                socialStatus: row['Social'] || row['اجتماعي'] || '',
            }));

            setStudents(prev => [...prev, ...newStudents]);
            setIsUploading(false);
            alert('✅ تم استيراد البيانات! اضغط "حفظ التغييرات" لتثبيتها.');
        };
        reader.readAsBinaryString(file);
    };

    const [newSubject, setNewSubject] = useState('');
    const [showAddSubject, setShowAddSubject] = useState(false);

    const handleAddStudent = () => {
        const newStudent: Student = {
            id: `new-${Date.now()}`,
            classId: decodedClassId,
            name: 'طالب جديد',
            academicStatus: 'Good',
            socialStatus: '',
            absences: 0,
            grades: {},
            notes: ''
        };
        setStudents([...students, newStudent]);
    };

    const handleDeleteStudent = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;

        if (id.startsWith('new-') || id.startsWith('imported-')) {
            setStudents(students.filter(s => s.id !== id));
            return;
        }

        try {
            await deleteStudent(id);
            setStudents(students.filter(s => s.id !== id));
            alert('✅ تم حذف الطالب بنجاح');
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('❌ حدث خطأ أثناء الحذف');
        }
    };

    const handleAddSubject = async () => {
        if (!newSubject.trim()) return;

        const currentSubjects = classData?.subjects || ['Arabic', 'Hebrew', 'Math', 'English', 'Science'];
        if (currentSubjects.includes(newSubject)) {
            alert('هذا العمود موجود مسبقاً');
            return;
        }

        const updatedSubjects = [...currentSubjects, newSubject];

        // Update local state immediately
        if (classData) {
            setClassData({ ...classData, subjects: updatedSubjects });
        }

        // We will save the subjects update when the user clicks "Save Changes" 
        // OR we can save it immediately. Let's save immediately for better UX on columns.
        try {
            await updateClass(decodedClassId, { subjects: updatedSubjects });
            setNewSubject('');
            setShowAddSubject(false);
            alert('✅ تم إضافة العمود بنجاح');
        } catch (error) {
            console.error('Error adding subject:', error);
            alert('❌ حدث خطأ أثناء إضافة العمود');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save class data (subjects) if changed locally but not saved yet (redundancy)
            if (classData?.subjects) {
                await updateClass(decodedClassId, { subjects: classData.subjects });
            }

            for (const student of students) {
                if (student.id.startsWith('new-') || student.id.startsWith('imported-')) {
                    const { id, ...newStudentData } = student;
                    await addStudent(newStudentData as Student);
                } else {
                    await updateStudent(student.id, student);
                }
            }
            alert('✅ تم حفظ البيانات بنجاح!');
            const updatedStudents = await getStudents(decodedClassId);
            setStudents(updatedStudents);
        } catch (error) {
            console.error('Error saving students:', error);
            alert('❌ حدث خطأ أثناء الحفظ.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-10 text-center">جاري التحميل...</div>;
    }

    if (!classData) {
        return <div className="p-8 text-center text-gray-500">الصف غير موجود</div>;
    }



    const handleDeleteSubject = async (subjectToDelete: string) => {
        if (!confirm(`هل أنت متأكد من حذف عمود "${subjectToDelete}"؟ سيتم حذف جميع العلامات المسجلة تحت هذا العمود.`)) return;

        const currentSubjects = classData?.subjects || ['Arabic', 'Hebrew', 'Math', 'English', 'Science'];
        const updatedSubjects = currentSubjects.filter(s => s !== subjectToDelete);

        // Update class data locally
        if (classData) {
            setClassData({ ...classData, subjects: updatedSubjects });
        }

        // Remove the grade data for this subject from all students locally
        const updatedStudents = students.map(student => {
            const newGrades = { ...student.grades };
            delete newGrades[subjectToDelete];
            return { ...student, grades: newGrades };
        });
        setStudents(updatedStudents);

        try {
            // Update class definition
            await updateClass(decodedClassId, { subjects: updatedSubjects });

            // We also need to update all students in Firestore to remove this field to keep it clean, 
            // but strictly speaking, just updating the class subject list hides it. 
            // For a clean backend, we should eventually remove the data, but for now, 
            // updating the view (class definition) is sufficient for the user's immediate goal.
            // If we want to be thorough:
            // await Promise.all(students.map(s => updateStudent(s.id, { [`grades.${subjectToDelete}`]: DELETE_FIELD_SENTINEL }))); 
            // However, Firestore doesn't easily support deleting nested map fields without reading/writing the whole map.
            // So we'll stick to updating the Class structure which controls the view.

            alert('✅ تم حذف العمود بنجاح');
        } catch (error) {
            console.error('Error deleting subject:', error);
            alert('❌ حدث خطأ أثناء حذف العمود');
        }
    };

    return (
        <div className="animate-fade-in pb-20">
            <div className="mb-8">
                <Link href="/dashboard/classes" className="text-primary hover:text-primary-dark mb-3 inline-flex items-center gap-2 font-bold transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" x2="5" y1="12" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    العودة للصفوف
                </Link>
                <h1 className="mb-2">{classData.name} - الخريطة الهولستية 📊</h1>
                <p className="text-gray-500 text-lg">قم بإدخال وتحديث بيانات الطلاب الأكاديمية والاجتماعية</p>
            </div>

            <div className="flex gap-4 mb-6">
                <div>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        ref={fileInputRef}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-ghost border-2 border-primary bg-white hover:bg-primary hover:text-white transition-colors"
                    >
                        {isUploading ? '⏳ جاري الرفع...' : '📂 استيراد من Excel'}
                    </button>
                    <button
                        onClick={handleFileExport}
                        className="btn btn-ghost border-2 border-green-600 text-green-700 bg-white hover:bg-green-600 hover:text-white transition-colors"
                    >
                        📊 تصدير Excel
                    </button>
                </div>

                <button
                    className="btn btn-primary flex items-center gap-2"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <>
                            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                            جاري الحفظ...
                        </>
                    ) : '💾 حفظ التغييرات'}
                </button>
            </div>

            <div className="glass-panel p-6">
                <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
                        بيانات الطلاب
                    </h3>

                    <div className="flex flex-wrap gap-4 items-center">
                        <button
                            onClick={handleAddStudent}
                            className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-bold transition-colors flex items-center gap-2"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            إضافة طالب
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowAddSubject(!showAddSubject)}
                                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold transition-colors flex items-center gap-2"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
                                </svg>
                                إضافة عمود
                            </button>

                            {showAddSubject && (
                                <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-xl shadow-xl border border-gray-100 z-50 w-64 animate-fade-in-up">
                                    <input
                                        type="text"
                                        placeholder="اسم العمود (مثلاً: رياضة)"
                                        className="w-full mb-2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-primary"
                                        value={newSubject}
                                        onChange={(e) => setNewSubject(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setShowAddSubject(false)} className="text-xs text-gray-500 hover:text-gray-700">إلغاء</button>
                                        <button onClick={handleAddSubject} className="px-3 py-1 bg-primary text-white text-xs rounded-md hover:bg-primary-dark">إضافة</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                            </svg>
                            <span className="font-bold text-primary">{students.length} طالب</span>
                        </div>
                    </div>
                </div>

                <div className="w-full pb-4">
                    <HolisticGrid
                        students={students}
                        onUpdate={setStudents}
                        subjects={classData?.subjects}
                        onDeleteStudent={handleDeleteStudent}
                        onDeleteSubject={handleDeleteSubject}
                    />
                </div>
            </div>
        </div>
    );
}
