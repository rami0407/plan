'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { initializeApp, getApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import Link from 'next/link';

// Firebase Config (Must match the one in lib/firebase.ts)
const firebaseConfig = {
    apiKey: "AIzaSyCMCXiCaiwRrZ6ms_337MZAXstGeow-2hE",
    authDomain: "gen-lang-client-0576446793.firebaseapp.com",
    projectId: "gen-lang-client-0576446793",
    storageBucket: "gen-lang-client-0576446793.firebasestorage.app",
    messagingSenderId: "341882667122",
    appId: "1:341882667122:web:9558ee8db16e3d3b5c42eb",
    measurementId: "G-26FCGHGJ9B"
};

interface CoordinatorPlan {
    id: string;
    coordinatorName: string;
    subject: string;
    year: number;
    status: 'draft' | 'pending' | 'approved' | 'rejected';
    lastUpdated: string;
    completionRate: number;
    goalsCount: number;
    tasksCount: number;
    userId?: string;
}

export default function PrincipalDashboard() {
    // Monthly Values State for 10 Months (Sep - June)
    const [monthlyValues, setMonthlyValues] = useState<Record<string, string>>({});
    const [isSavingValues, setIsSavingValues] = useState(false);

    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const availableYears = Array.from({ length: 2040 - 2023 }, (_, i) => 2024 + i);

    // Generate month keys for the academic year (e.g., if 2024 is selected -> Sep 2024 to June 2025)
    const getAcademicMonths = (startYear: number) => {
        const months = [];
        // Sep (9) to Dec (12) of startYear
        for (let m = 9; m <= 12; m++) {
            months.push(`${startYear}-${m.toString().padStart(2, '0')}`);
        }
        // Jan (1) to June (6) of startYear + 1
        for (let m = 1; m <= 6; m++) {
            months.push(`${startYear + 1}-${m.toString().padStart(2, '0')}`);
        }
        return months;
    };

    const academicMonths = getAcademicMonths(selectedYear);

    // Fetch values when year changes
    useEffect(() => {
        const fetchValues = async () => {
            const newValues: Record<string, string> = {};
            try {
                // Fetch in parallel for better performance
                await Promise.all(academicMonths.map(async (monthKey) => {
                    const docRef = doc(db, 'calendarMetadata', monthKey);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        newValues[monthKey] = snap.data().monthValue || '';
                    } else {
                        newValues[monthKey] = '';
                    }
                }));
                setMonthlyValues(newValues);
            } catch (e) {
                console.error("Error fetching month values:", e);
            }
        };
        fetchValues();
    }, [selectedYear]);

    const handleSaveAllValues = async () => {
        setIsSavingValues(true);
        try {
            const promises = academicMonths.map(monthKey => {
                const val = monthlyValues[monthKey];
                if (val !== undefined) {
                    return setDoc(doc(db, 'calendarMetadata', monthKey), {
                        monthValue: val
                    }, { merge: true });
                }
                return Promise.resolve();
            });
            await Promise.all(promises);
            alert('✅ تم حفظ جميع قيم الأشهر بنجاح');
        } catch (e) {
            console.error("Error saving month values:", e);
            alert('❌ حدث خطأ أثناء الحفظ');
        } finally {
            setIsSavingValues(false);
        }
    };

    const handleValueChange = (monthKey: string, val: string) => {
        setMonthlyValues(prev => ({
            ...prev,
            [monthKey]: val
        }));
    };

    const getMonthName = (monthKey: string) => {
        const date = new Date(`${monthKey}-01`);
        return date.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
    };

    // ... existing handleAddUser and other functions ...

    // (Make sure to remove the old useEffect for single month if it exists, or just ensure this replaces the relevant section and we remove the old state refs if possible, but replace tool replaces specific lines. I will assume I need to replace the state definitions at the top too?)
    // Wait, I can only replace one block. 
    // The "Instruction" says "Replace the 'Value of the Month Management' section (and related state/logic)".
    // But `state` is at the top of the component, and `UI` is in the middle.
    // I should use `multi_replace_file_content` if I need to change separate parts.
    // However, I can try to put the new logic right before the UI if I can't edit the top easily without context loss.
    // Actually, `useState` hooks must be at the top level.
    // I will use `replace_file_content` to replace the UI section, and `replace_file_content` for the state section? No, "Do NOT make multiple parallel calls".
    // I will use `multi_replace_file_content`.




    // User Management State
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'coordinator', subject: '' });
    const [addingUser, setAddingUser] = useState(false);

    const [plans, setPlans] = useState<CoordinatorPlan[]>([]);

    // Fetch Plans for Selected Year
    useEffect(() => {
        const q = query(collection(db, 'annualPlans'), where('year', '==', selectedYear));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedPlans = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as CoordinatorPlan[];
            setPlans(loadedPlans);
        });
        return () => unsubscribe();
    }, [selectedYear]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingUser(true);

        let secondaryApp: FirebaseApp | null = null;
        try {
            // 1. Create a secondary app instance
            const appName = `secondaryApp-${Date.now()}`;
            secondaryApp = initializeApp(firebaseConfig, appName);
            const secondaryAuth = getAuth(secondaryApp);

            // 2. Create the user
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
            const uid = userCredential.user.uid;

            // 3. Create document
            await setDoc(doc(db, 'users', uid), {
                uid: uid,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                subject: newUser.subject,
                createdAt: new Date().toISOString()
            });

            // 4. Sign out secondary
            await signOut(secondaryAuth);

            alert(`✅ تم إضافة المستخدم "${newUser.name}" بنجاح!`);
            setNewUser({ name: '', email: '', password: '', role: 'coordinator', subject: '' });
        } catch (error: any) {
            console.error("Error creating user:", error);
            if (error.code === 'auth/email-already-in-use') {
                alert('❌ البريد الإلكتروني مستخدم بالفعل');
            } else {
                alert('❌ حدث خطأ أثناء إنشاء المستخدم: ' + error.message);
            }
        } finally {
            if (secondaryApp) {
                await deleteApp(secondaryApp);
            }
            setAddingUser(false);
        }
    };

    // ... [getStatusInfo and stats calculation remains same] ...

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'approved':
                return { label: 'موافق عليها', color: 'bg-green-100 text-green-800 border-green-300' };
            case 'pending':
                return { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
            case 'rejected':
                return { label: 'مرفوضة', color: 'bg-red-100 text-red-800 border-red-300' };
            default:
                return { label: 'مسودة', color: 'bg-gray-100 text-gray-800 border-gray-300' };
        }
    };

    const stats = {
        totalPlans: plans.length,
        approved: plans.filter(p => p.status === 'approved').length,
        pending: plans.filter(p => p.status === 'pending').length,
        draft: plans.filter(p => p.status === 'draft').length,
        avgCompletion: plans.length > 0 ? Math.round(plans.reduce((acc, p) => acc + (p.completionRate || 0), 0) / plans.length) : 0
    };

    // Filter plans by selected year (Already handled by query, but keeping redundancy is fine or just using plans)
    const filteredPlans = plans; // Plans are already filtered by query

    return (
        <div className="min-h-screen dashboard-bg">
            <div className="container py-8">
                {/* Header */}
                <div className="glass-panel p-8 mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-primary to-primary-dark p-4 rounded-2xl text-white">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black mb-2 text-primary">لوحة تحكم المدير</h1>
                            <p className="text-gray-600 text-lg">نظرة عامة على سير العمل في المدرسة</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2">
                            <span className="text-gray-500 font-bold">السنة الدراسية:</span>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-transparent font-bold text-primary focus:outline-none cursor-pointer"
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="text-left hidden md:block">
                            <p className="font-bold text-lg">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-5 gap-4 mt-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl">
                        <div className="text-3xl font-black mb-2">{stats.totalPlans}</div>
                        <div className="text-blue-100">إجمالي الخطط</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
                        <div className="text-3xl font-black mb-2">{stats.approved}</div>
                        <div className="text-green-100">خطط موافق عليها</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-xl">
                        <div className="text-3xl font-black mb-2">{stats.pending}</div>
                        <div className="text-yellow-100">قيد المراجعة</div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-500 to-gray-600 text-white p-6 rounded-xl">
                        <div className="text-3xl font-black mb-2">{stats.draft}</div>
                        <div className="text-gray-100">مسودات</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl">
                        <div className="text-3xl font-black mb-2">{stats.avgCompletion}%</div>
                        <div className="text-purple-100">متوسط الإنجاز</div>
                    </div>
                </div>

                {/* START: User Management Section (NEW) */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 mt-8 border-2 border-indigo-50">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-indigo-900">
                            <span className="text-indigo-600 bg-indigo-100 p-2 rounded-lg">👥</span>
                            إدارة المستخدمين
                        </h2>
                    </div>

                    <form onSubmit={handleAddUser} className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
                        <h3 className="text-lg font-bold text-indigo-800 mb-4">إضافة مستخدم جديد (مركز/معلم)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">اسم المستخدم</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="الاسم الكامل..."
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">البريد الإلكتروني</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="email@school.edu"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">كلمة المرور</label>
                                <input
                                    type="text"
                                    required
                                    minLength={6}
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="******"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">المادة / الدور</label>
                                <div className="flex gap-2">
                                    <select
                                        className="p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    >
                                        <option value="coordinator">مركز موضوع</option>
                                        <option value="teacher">معلم</option>
                                        <option value="admin">مدير النظام</option>
                                    </select>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="الرياضيات / لغة عربية..."
                                        value={newUser.subject}
                                        onChange={(e) => setNewUser({ ...newUser, subject: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={addingUser}
                                className={`btn bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 ${addingUser ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'}`}
                            >
                                {addingUser ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        جاري الإضافة...
                                    </>
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        إضافة مستخدم
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Users List Table */}
                    <div className="mt-8 border-t pt-6">
                        <h3 className="text-lg font-bold text-indigo-800 mb-4 flex items-center gap-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            قائمة المستخدمين الحاليين
                        </h3>
                        <UsersListTable />
                    </div>
                </div>
                {/* END: User Management Section */}

                {/* Value of the Month Management */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-purple-600">✨</span>
                            إعداد قيم الأشهر للعام الدراسي {selectedYear}
                        </h2>
                        <button
                            onClick={handleSaveAllValues}
                            disabled={isSavingValues}
                            className={`btn bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-purple-200 transition-all ${isSavingValues ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'}`}
                        >
                            {isSavingValues ? 'جاري الحفظ...' : 'حفظ جميع القيم 💾'}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {academicMonths.map((monthKey) => (
                            <div key={monthKey} className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    {getMonthName(monthKey)}
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                    placeholder="القيمة التربوية..."
                                    value={monthlyValues[monthKey] || ''}
                                    onChange={(e) => handleValueChange(monthKey, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Plans Table */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">خطط المركزين للعام {selectedYear}</h2>
                        <Link href="/coordinator-portal" className="btn btn-primary px-6 py-3">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline ml-2">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            إضافة مركز جديد
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-gray-200">
                                    <th className="text-right p-4 font-bold text-gray-700">المركز</th>
                                    <th className="text-right p-4 font-bold text-gray-700">المادة</th>
                                    <th className="text-right p-4 font-bold text-gray-700">الحالة</th>
                                    <th className="text-right p-4 font-bold text-gray-700">نسبة الإنجاز</th>
                                    <th className="text-right p-4 font-bold text-gray-700">الأهداف</th>
                                    <th className="text-right p-4 font-bold text-gray-700">المهام</th>
                                    <th className="text-right p-4 font-bold text-gray-700">آخر تحديث</th>
                                    <th className="text-center p-4 font-bold text-gray-700">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPlans.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-gray-400">لا توجد خطط لهذا العام</td>
                                    </tr>
                                ) : (
                                    filteredPlans.map((plan) => {
                                        const statusInfo = getStatusInfo(plan.status);
                                        return (
                                            <tr key={plan.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-900">{plan.coordinatorName}</div>
                                                </td>
                                                <td className="p-4 text-gray-700">{plan.subject}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-2 rounded-lg text-sm font-bold border-2 ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${plan.completionRate >= 75 ? 'bg-green-500' :
                                                                    plan.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}
                                                                style={{ width: `${plan.completionRate}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-bold text-gray-700 min-w-[3rem]">{plan.completionRate}%</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
                                                        {plan.goalsCount}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-bold">
                                                        {plan.tasksCount}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-600 text-sm">{plan.lastUpdated}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Link
                                                            href={`/dashboard/planning/view/${plan.year}?userId=${plan.userId || plan.id.split('_')[1]}`}
                                                            className="btn btn-ghost text-sm px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                        >
                                                            مراجعة
                                                        </Link>

                                                        {/* Actions always visible but disabled if not applicable */}
                                                        <button
                                                            className={`btn btn-ghost text-sm px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 ${plan.status === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            disabled={plan.status === 'approved'}
                                                        >
                                                            موافقة
                                                        </button>
                                                        <button
                                                            className={`btn btn-ghost text-sm px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 ${plan.status === 'rejected' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            disabled={plan.status === 'rejected'}
                                                        >
                                                            رفض
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Task Assignment Section */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mt-8 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-blue-600">📝</span>
                            إسناد مهام للمنسقين
                        </h2>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <TaskAssignmentForm coordinators={plans} />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-6 mt-8">
                    <Link href="/dashboard/analytics" className="glass-panel p-6 hover:shadow-xl transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white group-hover:scale-110 transition-transform">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" x2="18" y1="20" y2="10" />
                                    <line x1="12" x2="12" y1="20" y2="4" />
                                    <line x1="6" x2="6" y1="20" y2="14" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">التحليلات والإحصائيات</h3>
                                <p className="text-gray-600">تقارير تفصيلية عن الأداء</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/dashboard/protocols" className="glass-panel p-6 hover:shadow-xl transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white group-hover:scale-110 transition-transform">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">بروتوكولات الجلسات</h3>
                                <p className="text-gray-600">متابعة الاجتماعات واللقاءات</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/coordinator-portal" className="glass-panel p-6 hover:shadow-xl transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white group-hover:scale-110 transition-transform">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">بوابة المركزين</h3>
                                <p className="text-gray-600">الوصول لصفحات المركزين</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}

// Sub-component for Task Assignment to keep main component clean
function TaskAssignmentForm({ coordinators }: { coordinators: CoordinatorPlan[] }) {
    const [taskText, setTaskText] = useState('');
    const [selectedCoordinator, setSelectedCoordinator] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            const { getDocs, collection } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchUsers();
    }, []);

    const { user } = { user: { uid: 'principal-id' } }; // Mock or context

    // Dynamic import workaround for now or just stub
    const handleAssignTask = async () => {
        if (!taskText || !selectedCoordinator) return;
        setIsSending(true);
        try {
            const { addTask } = await import('@/lib/firestoreService');
            await addTask({
                text: taskText,
                assignedTo: selectedCoordinator,
                isCompleted: false,
                createdBy: user.uid
            });
            setTaskText('');
            alert('✅ تم إرسال المهمة بنجاح');
        } catch (error) {
            console.error(error);
            alert('❌ حدث خطأ أثناء إرسال المهمة');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-gray-700 mb-2">نص المهمة</label>
                <input
                    type="text"
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="اكتب المهمة المطلوبة..."
                    value={taskText}
                    onChange={(e) => setTaskText(e.target.value)}
                />
            </div>
            <div className="w-full md:w-1/3">
                <label className="block text-sm font-bold text-gray-700 mb-2">إسناد إلى</label>
                <select
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={selectedCoordinator}
                    onChange={(e) => setSelectedCoordinator(e.target.value)}
                >
                    <option value="">اختر المنسق...</option>
                    {users.length > 0 ? users.map(user => (
                        <option key={user.uid} value={user.uid}>{user.name} ({user.subject || user.role})</option>
                    )) : coordinators.map(c => (
                        <option key={c.id} value={c.id}>{c.coordinatorName}</option>
                    ))}
                </select>
            </div>
            <button
                onClick={handleAssignTask}
                disabled={isSending || !taskText || !selectedCoordinator}
                className={`btn bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-blue-200 transition-all ${isSending ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'}`}
            >
                {isSending ? 'جاري الإرسال...' : 'إرسال المهمة 📤'}
            </button>
        </div>
    );
}

// Sub-component for editing/listing users
function UsersListTable() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<any>(null);

    // Fetch users on mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersList);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.')) return;

        try {
            // Optimistic update
            setUsers(prev => prev.filter(u => u.id !== userId));

            // Delete from Firestore
            await deleteDoc(doc(db, 'users', userId));

            alert('تم حذف سجل المستخدم بنجاح');
        } catch (error) {
            console.error("Error deleting user:", error);
            alert('حدث خطأ أثناء الحذف');
            fetchUsers(); // Revert
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            // Optimistic Update
            setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));

            await updateDoc(doc(db, 'users', editingUser.id), {
                name: editingUser.name,
                subject: editingUser.subject,
                role: editingUser.role
            });

            setEditingUser(null);
            alert('تم تحديث بيانات المستخدم بنجاح');
        } catch (error) {
            console.error("Error updating user:", error);
            alert('حدث خطأ أثناء التحديث');
            fetchUsers();
        }
    };

    if (loading) return <div className="text-center py-4">جاري تحميل المستخدمين...</div>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3">الاسم</th>
                        <th scope="col" className="px-6 py-3">البريد الإلكتروني</th>
                        <th scope="col" className="px-6 py-3">الدور / المادة</th>
                        <th scope="col" className="px-6 py-3 text-center">الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-bold text-gray-900">
                                {editingUser?.id === user.id ? (
                                    <input
                                        value={editingUser.name}
                                        onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                        className="border p-1 rounded w-full"
                                    />
                                ) : user.name}
                            </td>
                            <td className="px-6 py-4">
                                {user.email}
                            </td>
                            <td className="px-6 py-4">
                                {editingUser?.id === user.id ? (
                                    <input
                                        value={editingUser.subject}
                                        onChange={e => setEditingUser({ ...editingUser, subject: e.target.value })}
                                        className="border p-1 rounded w-full placeholder-gray-300"
                                        placeholder="المادة..."
                                    />
                                ) : (
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded">{user.subject || user.role}</span>
                                )}
                            </td>
                            <td className="px-6 py-4 flex justify-center gap-2">
                                {editingUser?.id === user.id ? (
                                    <>
                                        <button onClick={handleUpdateUser} className="font-medium text-green-600 hover:underline">حفظ</button>
                                        <button onClick={() => setEditingUser(null)} className="font-medium text-gray-600 hover:underline">إلغاء</button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setEditingUser(user)}
                                            className="font-medium text-blue-600 hover:underline"
                                        >
                                            تعديل
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="font-medium text-red-600 hover:underline"
                                        >
                                            حذف
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && (
                        <tr>
                            <td colSpan={4} className="text-center py-4">لا يوجد مستخدمين مسجلين</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
