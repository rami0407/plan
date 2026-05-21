'use client';

// ... imports
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

export type UserRole = 'admin' | 'coordinator' | 'user' | 'pending' | 'unauthorized';

interface AuthContextType {
    user: User | null;
    role: UserRole;
    coordinatorId: string | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: 'user',
    coordinatorId: null,
    loading: true,
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>('user');
    const [coordinatorId, setCoordinatorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let isMounted = true;
        // Safety timeout to prevent infinite loading
        const safetyTimer = setTimeout(() => {
            if (isMounted) {
                console.warn('Auth loading timed out - forcing render');
                setLoading(false);
            }
        }, 8000);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!isMounted) return;

            try {
                if (user) {
                    setUser(user);

                    // 1. Check if Admin
                    const isAdmin = user.email?.toLowerCase() === 'rami0407@gmail.com' || user.email?.toLowerCase() === 'admin@school.edu';

                    if (isAdmin) {
                        setRole('admin');
                        setCoordinatorId(null);
                    } else {
                        try {
                            // 2. Check User Document for Role and Status in 'users' collection
                            const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
                            const userSnapshot = await getDocs(userQuery);

                            if (isMounted) {
                                if (!userSnapshot.empty) {
                                    const userData = userSnapshot.docs[0].data();
                                    
                                    if (userData.status === 'pending') {
                                        setRole('pending');
                                        setCoordinatorId(null);
                                    } else {
                                        const userRole = userData.role || 'coordinator';
                                        if (userRole === 'admin') {
                                            setRole('admin');
                                            setCoordinatorId(null);
                                        } else if (userRole === 'coordinator') {
                                            setRole('coordinator');
                                            // Look up coordinatorId in coordinators collection if possible
                                            const qCoord = query(collection(db, 'coordinators'), where('email', '==', user.email));
                                            const snapshotCoord = await getDocs(qCoord);
                                            const coordId = !snapshotCoord.empty ? snapshotCoord.docs[0].id : userSnapshot.docs[0].id;
                                            setCoordinatorId(coordId);
                                        } else {
                                            setRole('user');
                                            setCoordinatorId(null);
                                        }
                                    }
                                } else {
                                    // 3. Fallback: Check 'coordinators' collection (legacy or separate)
                                    const qCoord = query(collection(db, 'coordinators'), where('email', '==', user.email));
                                    const snapshotCoord = await getDocs(qCoord);

                                    if (!snapshotCoord.empty) {
                                        setRole('coordinator');
                                        setCoordinatorId(snapshotCoord.docs[0].id);
                                    } else {
                                        // 4. Check if in pendingUsers collection
                                        const qPending = query(collection(db, 'pendingUsers'), where('email', '==', user.email));
                                        const snapshotPending = await getDocs(qPending);

                                        if (!snapshotPending.empty) {
                                            setRole('pending');
                                            setCoordinatorId(null);
                                        } else {
                                            // Not found anywhere -> Unauthorized
                                            setRole('unauthorized');
                                            setCoordinatorId(null);
                                        }
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Error fetching role:', error);
                            if (isMounted) setRole('user');
                        }
                    }
                } else {
                    setUser(null);
                    setRole('user');
                    setCoordinatorId(null);
                }
            } catch (err) {
                console.error('Auth state change error:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                    clearTimeout(safetyTimer);
                }
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
            clearTimeout(safetyTimer);
        };
    }, []);

    // Handling Redirects in a separate effect to avoid async race conditions in onAuthStateChanged
    useEffect(() => {
        if (loading) return;

        // Protected Routes Logic
        const isPublicRoute = pathname === '/';
        const isPendingPage = pathname === '/approval-pending';
        const isProtected = !isPublicRoute && !isPendingPage;

        if (!user && (isProtected || isPendingPage)) {
            router.push('/');
            return;
        }

        if (user) {
            if (role === 'unauthorized') {
                signOut(auth).catch(err => console.error("Error signing out:", err));
                alert('عذراً، هذا الحساب غير مصرح له بالدخول أو تم رفضه. يرجى التواصل مع الإدارة.');
                return;
            }

            if (role === 'pending') {
                if (!isPendingPage) {
                    router.push('/approval-pending');
                }
                return;
            }

            // If user is approved (admin/coordinator) but on pending page, send to dashboard
            if (isPendingPage && (role === 'admin' || role === 'coordinator')) {
                router.push(role === 'admin' ? '/dashboard/principal' : '/dashboard');
                return;
            }

            if (isPublicRoute) {
                if (role === 'admin') {
                    router.push('/dashboard/principal');
                } else {
                    router.push('/dashboard');
                }
            }
        }
    }, [user, role, loading, pathname, router]);

    const logout = async () => {
        try {
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, coordinatorId, loading, logout }}>
            {loading ? (
                <div className="min-h-screen flex items-center justify-center dashboard-bg">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                        <p className="mt-4 text-xl font-bold text-gray-700">جاري التحميل...</p>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
