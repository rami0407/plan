'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Notification } from '@/lib/firestoreService';



export default function InboxPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [loading, setLoading] = useState(true);
    const [feedbackText, setFeedbackText] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all');

    // Dummy data for initial visualization if no real data exists
    const dummyNotifications: Notification[] = [
        {
            id: '1',
            type: 'plan_submission',
            senderName: 'أحمد محمود',
            senderRole: 'مركز الرياضيات',
            title: 'تقديم خطة العمل السنوية 2026',
            message: 'مرحباً، قمت بالانتهاء من إعداد مسودة الخطة السنوية لمركز الرياضيات. أرجو الاطلاع عليها واعتمادها.',
            date: Timestamp.now(),
            read: false,
            status: 'pending',
            link: '/dashboard/planning/edit/2026'
        },
        {
            id: '2',
            type: 'intervention_update',
            senderName: 'سارة علي',
            senderRole: 'مركزة اللغة العربية',
            title: 'تحديث خطة التدخل للصف الخامس',
            message: 'تم تحديث قائمة الطلاب في خطة التدخل بناءً على نتائج الامتحانات الأخيرة.',
            date: Timestamp.fromDate(new Date(Date.now() - 86400000)), // Yesterday
            read: true,
            status: 'pending',
            link: '/dashboard/intervention'
        }
    ];

    useEffect(() => {
        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const { getNotifications } = await import('@/lib/firestoreService');
                const result = await getNotifications('admin'); // 'admin' is the principal recipient ID
                setNotifications(result);
            } catch (error) {
                console.error("Error loading notifications:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    const handleAction = async (action: 'approve' | 'reject') => {
        if (!selectedNotification) return;
        setActionLoading(true);

        try {
            const { updateNotificationStatus } = await import('@/lib/firestoreService');

            await updateNotificationStatus(
                selectedNotification.id,
                action === 'approve' ? 'approved' : 'changes_requested',
                feedbackText
            );

            // Update local state
            const updatedNotif = {
                ...selectedNotification,
                status: action === 'approve' ? 'approved' : 'changes_requested' as any,
                feedback: feedbackText
            };

            setNotifications(prev => prev.map(n => n.id === selectedNotification.id ? updatedNotif : n));
            setSelectedNotification(updatedNotif);

            alert(action === 'approve' ? '✅ تم اعتماد الخطة وإشعار المركز' : '⚠️ تم إرسال طلب التعديلات للمركز');

        } catch (error) {
            console.error(error);
            alert('حدث خطأ');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
        try {
            await deleteDoc(doc(db, 'notifications', id));
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (selectedNotification?.id === id) setSelectedNotification(null);
        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء الحذف');
        }
    };

    const handlePin = async (e: React.MouseEvent, notif: Notification) => {
        e.stopPropagation();
        try {
            const newPinned = !notif.pinned;
            await updateDoc(doc(db, 'notifications', notif.id), { pinned: newPinned });
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, pinned: newPinned } : n));
            if (selectedNotification?.id === notif.id) setSelectedNotification({ ...selectedNotification, pinned: newPinned });
        } catch (error) {
            console.error(error);
        }
    };

    const handleArchive = async (e: React.MouseEvent, notif: Notification) => {
        e.stopPropagation();
        try {
            const newArchived = !notif.archived;
            await updateDoc(doc(db, 'notifications', notif.id), { archived: newArchived });
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, archived: newArchived } : n));
            if (selectedNotification?.id === notif.id) setSelectedNotification(null); // Deselect if archived
        } catch (error) {
            console.error(error);
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.read;
        if (filter === 'pinned') return n.pinned;
        if (filter === 'archived') return n.archived;
        if (filter === 'all') return !n.archived; // Default: hide archived
        return true;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'plan_submission': return '📝';
            case 'intervention_update': return '🎯';
            default: return '📬';
        }
    };

    return (
        <div className="min-h-screen dashboard-bg p-8 text-right" dir="rtl">
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-white p-3 rounded-2xl shadow-sm text-blue-600">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-800">البريد الوارد</h1>
                    <p className="text-gray-500">متابعة التحديثات والطلبات من الطاقم</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
                {/* List Column */}
                <div className="col-span-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-100">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <span className="font-bold text-gray-700">الرسائل ({filteredNotifications.length})</span>
                        <div className="flex gap-1">
                            <button onClick={() => setFilter('all')} className={`text-[10px] border px-2 py-1 rounded transition-colors ${filter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>الكل</button>
                            <button onClick={() => setFilter('unread')} className={`text-[10px] border px-2 py-1 rounded transition-colors ${filter === 'unread' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>غير مقروء</button>
                            <button onClick={() => setFilter('pinned')} className={`text-[10px] border px-2 py-1 rounded transition-colors ${filter === 'pinned' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>مثبتة</button>
                            <button onClick={() => setFilter('archived')} className={`text-[10px] border px-2 py-1 rounded transition-colors ${filter === 'archived' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>مؤرشفة</button>
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
                        ) : (
                            filteredNotifications.map(notif => (
                                <div
                                    key={notif.id}
                                    onClick={() => setSelectedNotification(notif)}
                                    className={`p-4 border-b border-gray-50 cursor-pointer transition-all hover:bg-blue-50 group ${selectedNotification?.id === notif.id ? 'bg-blue-50 border-r-4 border-r-blue-500' : 'border-r-4 border-r-transparent'} ${!notif.read ? 'bg-white' : 'bg-gray-50/50'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-gray-800 text-xs flex items-center gap-2">
                                            <span>{getIcon(notif.type)}</span>
                                            {notif.pinned && <span className="text-orange-500">📌</span>}
                                            {notif.senderName}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {notif.date.toDate().toLocaleDateString('ar-EG')}
                                        </span>
                                    </div>
                                    <h4 className={`text-sm mb-1 ${!notif.read ? 'font-bold text-black' : 'text-gray-600'}`}>
                                        {notif.title}
                                    </h4>
                                    <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                                        {notif.message}
                                    </p>

                                    {/* Action Buttons (Visible on Hover or Selected) */}
                                    <div className={`flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity ${selectedNotification?.id === notif.id ? 'opacity-100' : ''}`}>
                                        <button
                                            onClick={(e) => handlePin(e, notif)}
                                            className={`p-1 rounded-full hover:bg-gray-200 ${notif.pinned ? 'text-orange-500 bg-orange-50' : 'text-gray-400'}`}
                                            title={notif.pinned ? "إلغاء التثبيت" : "تثبيت"}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
                                        </button>
                                        <button
                                            onClick={(e) => handleArchive(e, notif)}
                                            className={`p-1 rounded-full hover:bg-gray-200 ${notif.archived ? 'text-blue-500 bg-blue-50' : 'text-gray-400'}`}
                                            title={notif.archived ? "إلغاء الأرشفة" : "أرشفة"}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, notif.id)}
                                            className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500"
                                            title="حذف"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Detail Column */}
                <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl shadow-xl p-8 border border-gray-100 flex flex-col">
                    {selectedNotification ? (
                        <>
                            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedNotification.title}</h2>
                                        {selectedNotification.status === 'approved' && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">تم الاعتماد</span>}
                                        {selectedNotification.status === 'changes_requested' && <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">طلبت تعديلات</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span className="font-bold text-blue-600">{selectedNotification.senderName}</span>
                                        <span>•</span>
                                        <span>{selectedNotification.senderRole}</span>
                                        <span>•</span>
                                        <span>{selectedNotification.date.toDate().toLocaleString('ar-EG')}</span>
                                    </div>
                                </div>
                                {selectedNotification.link && (
                                    <button
                                        onClick={() => router.push(selectedNotification.link!)}
                                        className="btn btn-ghost text-blue-600 hover:bg-blue-50 border-blue-100 flex items-center gap-2"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                        معاينة الملف
                                    </button>
                                )}
                            </div>

                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8 flex-1 overflow-y-auto">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {selectedNotification.message}
                                </p>
                            </div>

                            {/* Action Area */}
                            {selectedNotification.status === 'pending' && (
                                <div className="bg-white border-t border-gray-100 pt-6">
                                    <h3 className="font-bold text-gray-800 mb-3">اتخاذ قرار</h3>
                                    <div className="mb-4">
                                        <textarea
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-24"
                                            placeholder="اكتب ملاحظاتك أو تعقيبك هنا..."
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleAction('approve')}
                                            disabled={actionLoading}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex justify-center items-center gap-2"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            اعتماد وموافقة
                                        </button>
                                        <button
                                            onClick={() => handleAction('reject')}
                                            disabled={actionLoading || !feedbackText}
                                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12" y2="16"></line></svg>
                                            طلب تعديلات
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selectedNotification.status !== 'pending' && (
                                <div className={`p-4 rounded-xl border ${selectedNotification.status === 'approved' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
                                    <p className="font-bold mb-1">
                                        {selectedNotification.status === 'approved' ? '✅ تم اعتماد هذا الطلب' : '⚠️ تم طلب تعديلات'}
                                    </p>
                                    {selectedNotification.feedback && (
                                        <p className="text-sm opacity-80">
                                            ملاحظاتك: {selectedNotification.feedback}
                                        </p>
                                    )}
                                </div>
                            )}

                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 text-gray-300">
                                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                                <rect x="9" y="9" width="6" height="6"></rect>
                                <line x1="9" y1="1" x2="9" y2="4"></line>
                                <line x1="15" y1="1" x2="15" y2="4"></line>
                                <line x1="9" y1="20" x2="9" y2="23"></line>
                                <line x1="15" y1="20" x2="15" y2="23"></line>
                                <line x1="20" y1="9" x2="23" y2="9"></line>
                                <line x1="20" y1="14" x2="23" y2="14"></line>
                                <line x1="1" y1="9" x2="4" y2="9"></line>
                                <line x1="1" y1="14" x2="4" y2="14"></line>
                            </svg>
                            <p className="text-lg">اختر رسالة من القائمة لعرض التفاصيل</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
