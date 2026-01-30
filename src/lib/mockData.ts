import { ClassGroup, Student, Teacher, User } from './types';

// Helper to generate IDs
const uid = () => Math.random().toString(36).substring(2, 9);

// 1. Initial Data Setup
const SUBJECTS = ['Arabic', 'Hebrew', 'Math', 'Science', 'English', 'History', 'Art'];
const GRADE_NAMES = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
const SECTION_NAMES = ['أ', 'ب', 'ج'];

// Generate 35 Teachers
export const mockTeachers: Teacher[] = Array.from({ length: 35 }).map((_, i) => ({
    id: `teacher-${i + 1}`,
    name: `Teacher ${i + 1}`,
    email: `teacher${i + 1}@school.edu`,
    role: 'TEACHER',
    subjects: [SUBJECTS[i % SUBJECTS.length], SUBJECTS[(i + 1) % SUBJECTS.length]],
}));

// Generate 18 Classes (Grades 1-6, 3 per grade)
export const mockClasses: ClassGroup[] = [];
let classCounter = 0;

for (let g = 1; g <= 6; g++) {
    for (let s = 1; s <= 3; s++) {
        mockClasses.push({
            id: `class-${g}-${s}`,
            name: `الصف ${GRADE_NAMES[g - 1]} ${SECTION_NAMES[s - 1]}`,
            grade: g,
            homeroomTeacherId: mockTeachers[classCounter % mockTeachers.length].id,
        });
        mockTeachers[classCounter % mockTeachers.length].homeroomClassId = `class-${g}-${s}`;
        classCounter++;
    }
}

// Generate Students (approx 25 per class)
export const mockStudents: Student[] = mockClasses.flatMap((cls) =>
    Array.from({ length: 25 }).map((_, i) => ({
        id: `student-${cls.id}-${i}`,
        name: `Student ${i + 1} (${cls.name})`,
        classId: cls.id,
        absences: Math.floor(Math.random() * 10),
        grades: {
            Arabic: 60 + Math.floor(Math.random() * 40),
            Hebrew: 60 + Math.floor(Math.random() * 40),
            Math: 50 + Math.floor(Math.random() * 50),
            Science: 70 + Math.floor(Math.random() * 30),
            English: 60 + Math.floor(Math.random() * 40),
        },
        academicStatus: Math.random() > 0.7 ? 'Excellent' : Math.random() > 0.4 ? 'Good' : 'Fair',
        socialStatus: 'Stable',
        economicStatus: 'Average'
    }))
);

// Principal Mock
export const mockPrincipal: User = {
    id: 'principal-1',
    name: 'Principal Al-Mudeer',
    email: 'admin@school.edu',
    role: 'PRINCIPAL'
};

// Coordinators (Subset of teachers or new users)
export const mockCoordinators: User[] = mockTeachers.slice(0, 12).map(t => ({
    ...t,
    role: 'COORDINATOR'
}));
