'use client';

import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    setDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

import { ClassGroup, Student } from './types';

export interface Coordinator {
    id?: string;
    name: string;
    subject: string;
    email: string;
    phone: string;
    avatar: string;
    planStatus: 'complete' | 'incomplete' | 'pending';
    createdAt?: any;
}

export interface WorkPlan {
    id?: string;
    coordinatorId: string;
    year: number;
    status: 'draft' | 'pending' | 'approved' | 'rejected';
    goals: any[];
    tasks: any[];
    completionRate: number;
    lastUpdated?: any;
}

export interface InterventionPlan {
    id?: string;
    coordinatorId: string;
    level: 'individual' | 'group' | 'class';
    students: {
        studentName: string;
        currentGrade: string;
        targetGoal: string;
        assessmentMethod: string;
        notes: string;
    }[];
    createdAt?: any;
}

// Coordinators CRUD
export const addCoordinator = async (coordinator: Omit<Coordinator, 'id' | 'createdAt'>) => {
    try {
        const docRef = await addDoc(collection(db, 'coordinators'), {
            ...coordinator,
            createdAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding coordinator:', error);
        throw error;
    }
};

export const getCoordinators = async (): Promise<Coordinator[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, 'coordinators'));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Coordinator));
    } catch (error) {
        console.error('Error getting coordinators:', error);
        throw error;
    }
};

export const updateCoordinator = async (id: string, data: Partial<Coordinator>) => {
    try {
        const docRef = doc(db, 'coordinators', id);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error('Error updating coordinator:', error);
        throw error;
    }
};

export const deleteCoordinator = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'coordinators', id));
    } catch (error) {
        console.error('Error deleting coordinator:', error);
        throw error;
    }
};

// Work Plans CRUD
export const addWorkPlan = async (plan: Omit<WorkPlan, 'id' | 'lastUpdated'>) => {
    try {
        const docRef = await addDoc(collection(db, 'workPlans'), {
            ...plan,
            lastUpdated: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding work plan:', error);
        throw error;
    }
};

export const getWorkPlans = async (): Promise<WorkPlan[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, 'workPlans'));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as WorkPlan));
    } catch (error) {
        console.error('Error getting work plans:', error);
        throw error;
    }
};

export const updateWorkPlan = async (id: string, data: Partial<WorkPlan>) => {
    try {
        const docRef = doc(db, 'workPlans', id);
        await updateDoc(docRef, {
            ...data,
            lastUpdated: Timestamp.now()
        });
    } catch (error) {
        console.error('Error updating work plan:', error);
        throw error;
    }
};

// Intervention Plans CRUD
export const addInterventionPlan = async (plan: Omit<InterventionPlan, 'id' | 'createdAt'>) => {
    try {
        const docRef = await addDoc(collection(db, 'interventionPlans'), {
            ...plan,
            createdAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding intervention plan:', error);
        throw error;
    }
};

export const getInterventionPlans = async (coordinatorId?: string): Promise<InterventionPlan[]> => {
    try {
        let q;
        if (coordinatorId) {
            q = query(collection(db, 'interventionPlans'), where('coordinatorId', '==', coordinatorId));
        } else {
            q = collection(db, 'interventionPlans');
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as InterventionPlan));
    } catch (error) {
        console.error('Error getting intervention plans:', error);
        throw error;
    }
};

export const updateInterventionPlan = async (id: string, data: Partial<InterventionPlan>) => {
    try {
        const docRef = doc(db, 'interventionPlans', id);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error('Error updating intervention plan:', error);
        throw error;
    }
};

// Classes CRUD
export const addClass = async (classData: ClassGroup) => {
    try {
        if (classData.id) {
            const docRef = doc(db, 'classes', classData.id);
            await setDoc(docRef, classData);
            return classData.id;
        } else {
            const docRef = await addDoc(collection(db, 'classes'), classData);
            return docRef.id;
        }
    } catch (error) {
        console.error('Error adding class:', error);
        throw error;
    }
};

export const getClasses = async (): Promise<ClassGroup[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, 'classes'));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ClassGroup)).sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Error getting classes:', error);
        throw error;
    }
};

export const getClass = async (id: string): Promise<ClassGroup | null> => {
    try {
        const docRef = doc(db, 'classes', id);
        const docSnap = await import('firebase/firestore').then(mod => mod.getDoc(docRef));

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as ClassGroup;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error getting class:', error);
        throw error;
    }
};

export const updateClass = async (id: string, data: Partial<ClassGroup>) => {
    try {
        const docRef = doc(db, 'classes', id);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error('Error updating class:', error);
        throw error;
    }
};

// Students CRUD
export const addStudent = async (student: Omit<Student, 'id'> & { id?: string }) => {
    try {
        if (student.id && student.id.startsWith('student-')) {
            const { id, ...rest } = student;
            const docRef = await addDoc(collection(db, 'students'), rest);
            return docRef.id;
        }

        const docRef = await addDoc(collection(db, 'students'), student);
        return docRef.id;
    } catch (error) {
        console.error('Error adding student:', error);
        throw error;
    }
};

export const getStudents = async (classId?: string): Promise<Student[]> => {
    try {
        let q;
        if (classId) {
            q = query(collection(db, 'students'), where('classId', '==', classId));
        } else {
            q = collection(db, 'students');
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Student));
    } catch (error) {
        console.error('Error getting students:', error);
        throw error;
    }
};

export const updateStudent = async (id: string, data: Partial<Student>) => {
    try {
        const docRef = doc(db, 'students', id);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error('Error updating student:', error);
        throw error;
    }
};

export const deleteStudent = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'students', id));
    } catch (error) {
        console.error('Error deleting student:', error);
        throw error;
    }
};

// Tasks CRUD
export interface Task {
    id: string;
    text: string;
    assignedTo: string; // User ID
    isCompleted: boolean;
    createdAt: any;
    createdBy: string;
}

export const addTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    try {
        const docRef = await addDoc(collection(db, 'tasks'), {
            ...task,
            createdAt: Timestamp.now(),
            isCompleted: false
        });

        // Create a notification for the assigned user
        if (task.assignedTo) {
            await addDoc(collection(db, 'notifications'), {
                type: 'general_message',
                senderName: 'المدير', // Can be dynamic if we pass creator name
                senderRole: 'principal',
                title: 'مهمة جديدة',
                message: `تم إسناد مهمة جديدة لك: ${task.text}`,
                date: Timestamp.now(),
                createdAt: Timestamp.now(), // Ensure consistent field usage
                read: false,
                recipientId: task.assignedTo,
                link: '/dashboard/tasks' // Link to tasks page
            });
        }

        return docRef.id;
    } catch (error) {
        console.error('Error adding task:', error);
        throw error;
    }
};

export const getTasksForUser = async (userId: string): Promise<Task[]> => {
    try {
        const q = query(
            collection(db, 'tasks'),
            where('assignedTo', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toMillis() || Date.now()
        } as Task));
    } catch (error) {
        console.error('Error getting tasks:', error);
        throw error;
    }
};

export const toggleTaskCompletion = async (taskId: string, isCompleted: boolean) => {
    try {
        const docRef = doc(db, 'tasks', taskId);
        await updateDoc(docRef, { isCompleted });
    } catch (error) {
        console.error('Error toggling task:', error);
        throw error;
    }
};

export const updateTask = async (taskId: string, newText: string) => {
    try {
        const docRef = doc(db, 'tasks', taskId);
        await updateDoc(docRef, { text: newText });
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
};

export const deleteTask = async (taskId: string) => {
    try {
        await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
};

// Notifications (Inbox) System
export interface Notification {
    id: string;
    type: 'plan_submission' | 'intervention_update' | 'general_message' | 'SYSTEM' | 'FEEDBACK';
    senderName: string;
    senderRole: string;
    title: string;
    message: string;
    date: any; // Firestore Timestamp
    read: boolean;
    status?: 'pending' | 'approved' | 'changes_requested';
    link?: string;
    feedback?: string;
    recipientId?: string; // 'admin' or specific user ID
    pinned?: boolean;
    archived?: boolean;
}

export const createNotification = async (notification: Omit<Notification, 'id' | 'date' | 'read'>) => {
    try {
        const docRef = await addDoc(collection(db, 'notifications'), {
            ...notification,
            date: Timestamp.now(),
            read: false,
            createdAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

export const getNotifications = async (recipientId: string = 'admin'): Promise<Notification[]> => {
    try {
        // Query notifications for 'admin' (Principal)
        const q = query(
            collection(db, 'notifications'),
            where('recipientId', '==', recipientId),
            orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Notification));
    } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }
};

export const updateNotificationStatus = async (
    id: string,
    status: 'approved' | 'changes_requested',
    feedback?: string
) => {
    try {
        const docRef = doc(db, 'notifications', id);
        await updateDoc(docRef, {
            status,
            feedback,
            read: true
        });
    } catch (error) {
        console.error('Error updating notification:', error);
        throw error;
    }
};

export const markNotificationRead = async (id: string) => {
    try {
        const docRef = doc(db, 'notifications', id);
        await updateDoc(docRef, { read: true });
    } catch (error) {
        console.error('Error marking notification read:', error);
        throw error;
    }
};

// Protocols System
export interface MeetingProtocol {
    id?: string;
    coordinatorId: string;
    date: string;
    type: 'principal' | 'staff' | 'counselor';
    participants: string;
    topic: string;
    summary: string;
    decisions: string;
    nextSteps: string;
    createdAt?: any;
}

export const addProtocol = async (protocol: Omit<MeetingProtocol, 'id' | 'createdAt'>) => {
    try {
        const docRef = await addDoc(collection(db, 'protocols'), {
            ...protocol,
            createdAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding protocol:', error);
        throw error;
    }
};

export const getProtocols = async (coordinatorId?: string): Promise<MeetingProtocol[]> => {
    try {
        let q;
        if (coordinatorId) {
            // Remove orderBy to avoid composite index requirement
            q = query(
                collection(db, 'protocols'),
                where('coordinatorId', '==', coordinatorId)
            );
        } else {
            q = query(collection(db, 'protocols'), orderBy('date', 'desc'));
        }

        const querySnapshot = await getDocs(q);
        const protocols = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as MeetingProtocol));

        // Sort client-side to ensure correct order without complex DB index
        return protocols.sort((a, b) => {
            return (b.date || '').localeCompare(a.date || '');
        });
    } catch (error) {
        console.error('Error getting protocols:', error);
        throw error;
    }
};

export const updateProtocol = async (id: string, data: Partial<MeetingProtocol>) => {
    try {
        const docRef = doc(db, 'protocols', id);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error('Error updating protocol:', error);
        throw error;
    }
};

export const deleteProtocol = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'protocols', id));
    } catch (error) {
        console.error('Error deleting protocol:', error);
        throw error;
    }
};

// Personal Intervention Plans (Detailed)
export interface PersonalInterventionPlan {
    id?: string;
    coordinatorId: string;
    studentDetails: {
        firstName: string; lastName: string;
        id: string; dob: string;
        city: string; address: string;
        phone: string; grade: string;
        responsibleStaff: string; role: string;
        regularAttendance: string; familyWelfare: string;
    };
    disabilities: any;
    functionalAreas: any;
    planStatus: any;
    supports: any;
    documents: any;
    interventionPlan: any;
    grade?: string;
    section?: string;
    createdAt?: any;
    updatedAt?: any;
}

export const addPersonalInterventionPlan = async (plan: Omit<PersonalInterventionPlan, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
        const docRef = await addDoc(collection(db, 'personalInterventionPlans'), {
            ...plan,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding personal plan:', error);
        throw error;
    }
};

export const getPersonalInterventionPlansByCoordinatorAndYear = async (coordinatorId: string, year: string): Promise<PersonalInterventionPlan[]> => {
    try {
        const q = query(
            collection(db, 'personalInterventionPlans'),
            where('coordinatorId', '==', coordinatorId),
            where('selectedYear', '==', year),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonalInterventionPlan));
    } catch (error) {
        console.error('Error getting plans by year:', error);
        // Fallback to local filter if query fails (e.g. missing index)
        const qAll = query(collection(db, 'personalInterventionPlans'), where('coordinatorId', '==', coordinatorId));
        const snap = await getDocs(qAll);
        return snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as PersonalInterventionPlan))
            .filter((p: any) => p.selectedYear === year);
    }
};

export const getPersonalInterventionPlanByStudentId = async (studentId: string): Promise<PersonalInterventionPlan | null> => {
    try {
        const q = query(
            collection(db, 'personalInterventionPlans'),
            where('studentDetails.id', '==', studentId),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            return { id: docSnap.id, ...docSnap.data() } as PersonalInterventionPlan;
        }
        return null;
    } catch (error) {
        // If index is missing for compound query, try simpler
        console.warn('Index might be missing, trying simple query', error);
        const qSimple = query(collection(db, 'personalInterventionPlans'), where('studentDetails.id', '==', studentId));
        const snap = await getDocs(qSimple);
        if (!snap.empty) {
            return { id: snap.docs[0].id, ...snap.docs[0].data() } as PersonalInterventionPlan;
        }
        return null;
    }
};

export const updatePersonalInterventionPlan = async (id: string, data: Partial<PersonalInterventionPlan>) => {
    try {
        const docRef = doc(db, 'personalInterventionPlans', id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error updating personal plan:', error);
        throw error;
    }
};

export const deletePersonalInterventionPlan = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'personalInterventionPlans', id));
    } catch (error) {
        console.error('Error deleting personal plan:', error);
        throw error;
    }
};

export const getPersonalInterventionPlansByCoordinator = async (coordinatorId: string): Promise<PersonalInterventionPlan[]> => {
    try {
        // Query by coordinatorId
        const q = query(
            collection(db, 'personalInterventionPlans'),
            where('coordinatorId', '==', coordinatorId)
            // orderBy can be problematic without index, sorting client side is safer for now if needed.
        );
        const querySnapshot = await getDocs(q);
        const plans = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as PersonalInterventionPlan));

        // Sort by updatedAt desc
        return plans.sort((a, b) => {
            const tA = a.updatedAt?.toMillis() || 0;
            const tB = b.updatedAt?.toMillis() || 0;
            return tB - tA;
        });
    } catch (error) {
        console.error('Error getting personal plans by coordinator:', error);
        throw error;
    }
};
