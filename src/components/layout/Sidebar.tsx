'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';

const Icons = {
    Home: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    ),
    Class: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    Plan: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
        </svg>
    ),
    Protocols: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    Analytics: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" x2="18" y1="20" y2="10" />
            <line x1="12" x2="12" y1="20" y2="4" />
            <line x1="6" x2="6" y1="20" y2="14" />
        </svg>
    ),
    School: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
    ),
    Intervention: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
    ),
    Principal: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 1 0-16 0" />
            <path d="M12 13v8" />
            <path d="M9 16 l3-3 3 3" />
        </svg>
    ),
    Coordinators: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    Calendar: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    Tasks: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17h.01"></path>
            <path d="M12 12h.01"></path>
            <path d="M12 7h.01"></path>
            <rect x="3" y="4" width="18" height="18" rx="2"></rect>
        </svg>
    ),
    PersonalPlan: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
};

export default function Sidebar() {
    const { user, role, logout } = useAuth();
    const isAdmin = role === 'admin';
    const isCoordinator = role === 'coordinator';

    const displayName = user?.displayName || user?.email?.split('@')[0] || 'المستخدم';

    // Mapping roles to display text
    const roleText = isAdmin ? 'مدير المدرسة' : isCoordinator ? 'مركز الموضوع' : 'معلم';

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                <div className={styles.logoIcon}>
                    <Icons.School />
                </div>
                <span>مدرستي</span>
            </div>

            <nav className={styles.nav}>
                <Link href="/dashboard" className={`${styles.navItem} ${styles.active}`}>
                    <div className={styles.navIcon}>
                        <Icons.Home />
                    </div>
                    <span>الصفحة الرئيسية</span>
                </Link>

                {/* Admin Only Links */}
                {isAdmin && (
                    <>
                        <Link href="/dashboard/inbox" className={styles.navItem}>
                            <div className={styles.navIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                            </div>
                            <span>البريد الوارد</span>
                        </Link>

                        <Link href="/dashboard/principal" className={styles.navItem}>
                            <div className={styles.navIcon}>
                                <Icons.Principal />
                            </div>
                            <span>لوحة تحكم المدير</span>
                        </Link>

                        <Link href="/coordinator-portal" className={styles.navItem}>
                            <div className={styles.navIcon}>
                                <Icons.Coordinators />
                            </div>
                            <span>بوابة المركزين</span>
                        </Link>
                    </>
                )}

                {/* Common Links (All authenticated users typically see these, or at least Admin + Coordinator) */}
                <Link href="/dashboard/calendar" className={styles.navItem}>
                    <div className={styles.navIcon}>
                        <Icons.Calendar />
                    </div>
                    <span>التقويم المدرسي</span>
                </Link>

                <Link href="/dashboard/classes" className={styles.navItem}>
                    <div className={styles.navIcon}>
                        <Icons.Class />
                    </div>
                    <span>الصفوف المدرسية</span>
                </Link>

                <Link href="/dashboard/tasks" className={styles.navItem}>
                    <div className={styles.navIcon}>
                        <Icons.Tasks />
                    </div>
                    <span>مهامي</span>
                </Link>

                <Link href="/dashboard/planning" className={styles.navItem}>
                    <div className={styles.navIcon}>
                        <Icons.Plan />
                    </div>
                    <span>خطط العمل</span>
                </Link>

                <Link href="/dashboard/annual-planning" className={styles.navItem}>
                    <div className={styles.navIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="9" y1="21" x2="9" y2="9" />
                        </svg>
                    </div>
                    <span>التخطيط السنوي</span>
                </Link>

                <Link href="/dashboard/intervention" className={styles.navItem}>
                    <div className={styles.navIcon}>
                        <Icons.Intervention />
                    </div>
                    <span>خطة التدخل</span>
                </Link>

                <Link href="/dashboard/personal-intervention" className={styles.navItem}>
                    <div className={styles.navIcon}>
                        <Icons.PersonalPlan />
                    </div>
                    <span>תכנית התערבות אישית</span>
                </Link>

                <Link href="/dashboard/protocols" className={styles.navItem} style={{ marginRight: '1.5rem' }}>
                    <div className={styles.navIcon}>
                        <Icons.Protocols />
                    </div>
                    <span>بروتوكولات الجلسات</span>
                </Link>

                {/* Analytics - Admin Only (Typically) */}
                {isAdmin && (
                    <Link href="/dashboard/analytics" className={styles.navItem}>
                        <div className={styles.navIcon}>
                            <Icons.Analytics />
                        </div>
                        <span>التحليلات والإحصائيات</span>
                    </Link>
                )}
            </nav>

            <div className={styles.userProfile}>
                <div className={styles.userInfo}>
                    <h4>{displayName}</h4>
                    <span className="text-xs text-gray-400">{roleText}</span>
                </div>
                <button onClick={logout} className="mt-2 text-xs text-red-400 hover:text-red-300">تسجيل الخروج</button>
            </div>
        </aside>
    );
}
