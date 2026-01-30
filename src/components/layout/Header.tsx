'use client';

import { useState, useEffect } from 'react';
import styles from './Header.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';
import { Notification } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Header() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        // Query all notifications sorted by date
        const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));

            // Filter notifications based on user role/ID
            // If user is Admin (principal), show notifications sent TO 'admin' or general system alerts
            // If user is normal user, show notifications assigned TO them (recipientId === user.uid)

            // Note: In TaskAssignmentForm we need to make sure we are adding 'recipientId' to the notification object when creating it.
            // Currently, 'assignedTo' in tasks implies it's for them.
            // But this header listens to 'notifications' collection.
            // We need to ensure that when a task is assigned, a notification is ALSO created, OR we assume this component
            // listens to tasks/changes. Re-reading requirements: "I sent a task... but no notification appeared".
            // This implies we need to CREATE a notification when a task is created.

            // For now, let's fix the DISPLAY logic first.
            const myNotifs = notifs.filter(n => {
                // If the notification is explicitly addressed to this user
                if (n.recipientId === user.uid) return true;

                // If it's an admin viewing, maybe show system alerts? (Optional, stick to strict ID for now)

                return false;
            });

            // Fallback for this session: Show ALL notifications if we are debugging, or fix the filtering.
            // Let's implement strict filtering:
            // MATCH user.uid with notification.recipientId
            // BUT, looking at the previous code, it was showing ALL. 
            // The user says "I sent a task... but no notification appeared".
            // This likely means the TRIGGER to create a notification is missing in `addTask`.
            // However, here we will ensuring filtering is correct so they only see THEIR notifications.

            const relevantNotifs = notifs.filter(n =>
                n.recipientId === user.uid ||
                n.recipientId === 'all' ||
                (n.recipientId === 'admin' && user.email === 'rami0407@gmail.com')
            );

            setNotifications(relevantNotifs);
            setUnreadCount(relevantNotifs.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [user]);

    const markAsRead = async (id: string) => {
        try {
            await updateDoc(doc(db, 'notifications', id), { read: true });
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }
        setShowNotifications(false);
        if (notification.link) {
            router.push(notification.link);
        }
    };

    return (
        <header className={styles.header}>
            <div className={styles.title}>
                <h2>لوحة التحكم</h2>
            </div>
            <div className={styles.actions}>
                <span className="text-sm text-gray-600 ml-4 font-bold">
                    {user?.email}
                </span>

                {/* Notification Bell */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="btn btn-ghost relative p-2"
                    >
                        <span className="text-2xl">🔔</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse border-2 border-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                            <div className="p-3 bg-gray-50 border-b border-gray-200 font-bold flex justify-between items-center">
                                <span>التنبيهات</span>
                                <span className="text-xs text-gray-500">{unreadCount} غير مقروء</span>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif)}
                                            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${!notif.read ? 'bg-blue-50/50' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-sm ${!notif.read ? 'font-bold text-primary' : 'font-semibold text-gray-700'}`}>
                                                    {notif.title}
                                                </h4>
                                                {!notif.read && <span className="w-2 h-2 bg-primary rounded-full"></span>}
                                            </div>
                                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{notif.message}</p>
                                            <div className="flex justify-between items-center text-[10px] text-gray-400">
                                                <span>
                                                    {(() => {
                                                        const date = notif.createdAt as any;
                                                        if (date?.toDate) {
                                                            return date.toDate().toLocaleDateString('he-IL');
                                                        }
                                                        return new Date(date).toLocaleDateString('he-IL');
                                                    })()}
                                                </span>
                                                {notif.link && <span className="text-primary font-bold">عرض التفاصيل</span>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-400">
                                        <p>لا توجد تنبيهات جديدة</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-[1px] bg-gray-300 mx-2"></div>

                <button
                    onClick={logout}
                    className="btn bg-red-500 hover:bg-red-600 text-white px-4 py-2 flex items-center gap-2 text-sm shadow-md transition-transform hover:scale-105"
                    title="تسجيل الخروج"
                >
                    🚪 خروج
                </button>
            </div>
        </header>
    );
}
