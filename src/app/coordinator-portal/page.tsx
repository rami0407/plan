'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getCoordinators, addCoordinator, type Coordinator } from '@/lib/firestoreService';

export default function CoordinatorPortal() {
    const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newCoordinator, setNewCoordinator] = useState({
        name: '',
        subject: '',
        email: '',
        phone: '',
        avatar: ''
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Load coordinators from Firebase
    useEffect(() => {
        loadCoordinators();
    }, []);

    const loadCoordinators = async () => {
        try {
            setLoading(true);
            const { getCoordinators } = await import('@/lib/firestoreService');
            const data = await getCoordinators();
            setCoordinators(data);
        } catch (error) {
            console.error('Error loading coordinators:', error);
            alert('خطأ في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCoordinator = async () => {
        if (!newCoordinator.name || !newCoordinator.subject) {
            alert('⚠️ يرجى ملء الاسم والمادة على الأقل');
            return;
        }

        try {
            const { addCoordinator, updateCoordinator } = await import('@/lib/firestoreService');

            const coordinatorData = {
                name: newCoordinator.name,
                subject: newCoordinator.subject,
                email: newCoordinator.email || `${newCoordinator.subject.toLowerCase()}@school.edu`,
                phone: newCoordinator.phone || '050-0000000',
                avatar: newCoordinator.avatar || newCoordinator.name.charAt(0),
                planStatus: 'incomplete' as const // Keep existing status if updating? Ideally yes, but simpler for now.
            };

            if (isEditing && editingId) {
                // For updates, we shouldn't overwrite planStatus ideally, unless we fetch the existing one.
                // But the simplified logic here is acceptable for this quick task, or we can just send partial update.
                // updateCoordinator takes Partial<Coordinator>, so let's exclude planStatus from update to be safe
                const { planStatus, ...updateData } = coordinatorData;
                await updateCoordinator(editingId, updateData);
                alert('✅ تم تحديث بيانات المركز بنجاح!');
            } else {
                await addCoordinator(coordinatorData);
                alert('✅ تم إضافة المركز بنجاح!');
            }

            await loadCoordinators();
            closeModal();
        } catch (error) {
            console.error('Error saving coordinator:', error);
            alert('❌ حدث خطأ أثناء الحفظ');
        }
    };

    const handleDeleteCoordinator = async (id: string, name: string) => {
        if (!confirm(`هل أنت متأكد من حذف المركز "${name}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;

        try {
            const { deleteCoordinator } = await import('@/lib/firestoreService');
            await deleteCoordinator(id);
            alert('✅ تم حذف المركز بنجاح');
            loadCoordinators();
        } catch (error) {
            console.error('Error deleting coordinator:', error);
            alert('❌ حدث خطأ أثناء الحذف');
        }
    }

    const startEdit = (coord: Coordinator) => {
        setNewCoordinator({
            name: coord.name,
            subject: coord.subject,
            email: coord.email,
            phone: coord.phone,
            avatar: coord.avatar
        });
        setEditingId(coord.id!);
        setIsEditing(true);
        setShowModal(true);
    }

    const openAddModal = () => {
        setNewCoordinator({ name: '', subject: '', email: '', phone: '', avatar: '' });
        setIsEditing(false);
        setEditingId(null);
        setShowModal(true);
    }

    const closeModal = () => {
        setShowModal(false);
        setNewCoordinator({ name: '', subject: '', email: '', phone: '', avatar: '' });
        setIsEditing(false);
        setEditingId(null);
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'complete':
                return <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold border-2 border-green-300">✓ مكتملة</span>;
            case 'pending':
                return <span className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-bold border-2 border-yellow-300">⏳ قيد العمل</span>;
            default:
                return <span className="bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-bold border-2 border-red-300">✗ غير مكتملة</span>;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen dashboard-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                    <p className="mt-4 text-xl font-bold text-gray-700">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen dashboard-bg">
            <div className="container py-8">
                {/* Header */}
                <div className="glass-panel p-8 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-primary to-primary-dark p-4 rounded-2xl text-white">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-4xl font-black">بوابة المركزين</h1>
                                <p className="text-gray-600 text-lg">الوصول السريع لخطط وأنظمة جميع المركزين ({coordinators.length} مركز)</p>
                            </div>
                        </div>
                        <Link href="/dashboard/principal" className="btn btn-ghost border-2 border-gray-300 px-6 py-3">
                            ← العودة للوحة تحكم المدير
                        </Link>
                    </div>
                </div>

                {/* Coordinators Grid */}
                {coordinators.length === 0 ? (
                    <div className="glass-panel p-12 text-center">
                        <div className="text-gray-400 mb-4">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-700 mb-2">لا يوجد مركزين حالياً</h3>
                        <p className="text-gray-500 mb-6">ابدأ بإضافة أول مركز للمدرسة</p>
                        <button
                            onClick={openAddModal}
                            className="btn btn-primary px-8 py-3"
                        >
                            + إضافة مركز جديد
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-6">
                        {coordinators.map((coord) => (
                            <div key={coord.id} className="glass-panel p-6 hover:shadow-2xl transition-all group relative">
                                {/* Edit/Delete Actions */}
                                <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEdit(coord)}
                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                        title="تعديل"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCoordinator(coord.id!, coord.name)}
                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                        title="حذف"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>

                                {/* Avatar and Name */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center text-3xl font-black">
                                        {coord.avatar}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">{coord.name}</h3>
                                        <p className="text-gray-600">{coord.subject}</p>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="mb-4">
                                    {getStatusBadge(coord.planStatus)}
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-2 mb-6 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect width="20" height="16" x="2" y="4" rx="2" />
                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                        </svg>
                                        {coord.email}
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                        </svg>
                                        {coord.phone}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-2">
                                    <Link
                                        href={`/dashboard/planning/edit/2024`}
                                        className="btn btn-primary px-4 py-3 text-center"
                                    >
                                        📋 خطة العمل
                                    </Link>
                                    <Link
                                        href={`/dashboard/intervention?coordinatorId=${coord.id}`}
                                        className="btn bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 text-center"
                                    >
                                        📝 خطة التدخل
                                    </Link>
                                    <Link
                                        href="/dashboard/protocols"
                                        className="btn bg-green-500 hover:bg-green-600 text-white px-4 py-3 text-center"
                                    >
                                        👥 البروتوكولات
                                    </Link>
                                    <Link
                                        href="/dashboard/analytics"
                                        className="btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 text-center"
                                    >
                                        📊 الإحصائيات
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add New Coordinator Button */}
                {coordinators.length > 0 && (
                    <div className="mt-8">
                        <button
                            onClick={openAddModal}
                            className="glass-panel p-8 w-full hover:shadow-xl transition-all group border-2 border-dashed border-gray-300"
                        >
                            <div className="flex items-center justify-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-3xl group-hover:bg-primary group-hover:text-white transition-all">
                                    +
                                </div>
                                <div className="text-right">
                                    <h3 className="text-xl font-bold text-gray-700 group-hover:text-primary transition-all">إضافة مركز جديد</h3>
                                    <p className="text-gray-500">انقر لإضافة مركز جديد للمدرسة</p>
                                </div>
                            </div>
                        </button>
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl font-bold">{isEditing ? 'تعديل بيانات المركز' : 'إضافة مركز جديد'}</h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-500 hover:text-gray-700 text-3xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-700 font-bold mb-2">اسم المركز *</label>
                                    <input
                                        type="text"
                                        value={newCoordinator.name}
                                        onChange={(e) => setNewCoordinator({ ...newCoordinator, name: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        placeholder="مثال: مركز الرياضيات"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-bold mb-2">المادة *</label>
                                    <input
                                        type="text"
                                        value={newCoordinator.subject}
                                        onChange={(e) => setNewCoordinator({ ...newCoordinator, subject: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        placeholder="مثال: الرياضيات"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-bold mb-2">البريد الإلكتروني</label>
                                    <input
                                        type="email"
                                        value={newCoordinator.email}
                                        onChange={(e) => setNewCoordinator({ ...newCoordinator, email: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        placeholder="مثال: math@school.edu"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-bold mb-2">رقم الهاتف</label>
                                    <input
                                        type="tel"
                                        value={newCoordinator.phone}
                                        onChange={(e) => setNewCoordinator({ ...newCoordinator, phone: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        placeholder="مثال: 050-1234567"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-bold mb-2">الحرف الأول (للأيقونة)</label>
                                    <input
                                        type="text"
                                        maxLength={1}
                                        value={newCoordinator.avatar}
                                        onChange={(e) => setNewCoordinator({ ...newCoordinator, avatar: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        placeholder="حرف واحد"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={closeModal}
                                    className="flex-1 btn btn-ghost border-2 border-gray-300 px-6 py-3"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleSaveCoordinator}
                                    className="flex-1 btn btn-primary px-6 py-3"
                                >
                                    {isEditing ? 'حفظ التغييرات' : 'إضافة المركز'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
