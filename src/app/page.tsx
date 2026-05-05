'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_DEFAULT_USER_EMAIL || '');
  const [password, setPassword] = useState(process.env.NEXT_PUBLIC_DEFAULT_USER_PASSWORD || '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [stars] = useState(() =>
    Array.from({ length: 50 }, () => ({
      width: Math.random() * 3 + 1,
      height: Math.random() * 3 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: Math.random() * 2 + 2,
    }))
  );

  // Forgot Password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user is approved in Firestore
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.status === 'pending') {
          setError('حسابك قيد المراجعة. يرجى الانتظאר حتى يتم اعتماده من قبل الإدارة.');
          await auth.signOut();
          setLoading(false);
          return;
        }
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential') {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      } else if (err.code === 'auth/user-not-found') {
        setError('المستخدم غير موجود');
      } else if (err.code === 'auth/wrong-password') {
        setError('كلمة المرور غير صحيحة');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus('sending');
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetStatus('sent');
    } catch (error: any) {
      console.error("Reset password error", error);
      setResetStatus('error');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Google login error", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('تم إلغاء تسجيل الدخول');
      } else {
        setError('فشل تسجيل الدخول باستخدام Google: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-bg-effect min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Stars Animation */}
      <div className="stars">
        {mounted && stars.map((s, i) => (
          <div
            key={i}
            className="star"
            style={{
              width: `${s.width}px`,
              height: `${s.height}px`,
              left: `${s.left}%`,
              top: `${s.top}%`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`
            }}
          ></div>
        ))}
      </div>

      <div className="login-container">

        {/* Main Login View */}
        {!showForgotPassword ? (
          <>
            <div className="login-header">
              <div className="login-logo">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="#667eea" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 22V12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 7L12 12L22 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="8" r="2" fill="white" />
                </svg>
              </div>
              <h1>مدرسة مشيرفة</h1>
              <p>المشروع التربوي المتميز</p>
            </div>

            <div className="form-container">
              <div className="welcome-text">
                <h2>أهلاً بك!</h2>
                <p>سجل دخولك للوصول إلى المنصة التعليمية</p>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="input-group">
                  <label htmlFor="username" className="input-label">البريد الإلكتروني</label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      id="username"
                      name="username"
                      className="form-input"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <span className="input-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="password" className="input-label">كلمة المرور</label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      className="form-input"
                      placeholder="أدخل كلمة المرور"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={togglePasswordVisibility}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="remember-forgot">
                  <label className="remember">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>تذكرني</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setResetStatus('idle'); setResetEmail(''); }}
                    className="forgot-link bg-transparent border-none cursor-pointer text-sm font-semibold p-0"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>جاري الدخول...</span>
                    </>
                  ) : (
                    <span>تسجيل الدخول</span>
                  )}
                </button>
              </form>

              <div className="divider">
                <span>أو</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-all mb-6 shadow-sm"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.52 12.29C23.52 11.43 23.44 10.61 23.3 9.82H12V14.4H18.47C18.19 15.9 17.34 17.18 16.08 18.03V21.03H19.95C22.21 18.94 23.52 15.89 23.52 12.29Z" fill="#4285F4" />
                  <path d="M12 24C15.24 24 17.96 22.92 19.95 21.08L16.08 18.06C15 18.79 13.62 19.22 12 19.22C8.87 19.22 6.22 17.11 5.27 14.28H1.27V17.38C3.25 21.32 7.31 24 12 24Z" fill="#34A853" />
                  <path d="M5.27 14.29C5.03 13.56 4.89 12.79 4.89 12C4.89 11.21 5.03 10.45 5.27 9.71V6.62H1.27C0.46 8.23 0 10.06 0 12C0 13.94 0.46 15.77 1.27 17.38L5.27 14.29Z" fill="#FBBC05" />
                  <path d="M12 4.78C13.76 4.78 15.34 5.39 16.58 6.58L20.04 3.12C17.96 1.18 15.24 0 12 0C7.31 0 3.25 2.68 1.27 6.62L5.27 9.71C6.22 6.89 8.87 4.78 12 4.78Z" fill="#EA4335" />
                </svg>
                <span>تسجيل الدخول عبر Google</span>
              </button>

              <div className="footer-text mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                <span className="text-gray-600 block mb-2">ليس لديك حساب؟</span>
                <Link
                  href="/signup"
                  className="inline-block px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-all shadow-md cursor-pointer"
                >
                  إنشاء حساب جديد
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Forgot Password View */}
            <div className="login-header">
              <div className="login-logo">
                <span className="text-4xl">🔒</span>
              </div>
              <h1>استعادة كلمة المرور</h1>
              <p>لا تقلق، سنساعدك في استعادتها</p>
            </div>

            <div className="form-container">
              {resetStatus === 'sent' ? (
                <div className="text-center py-6">
                  <div className="text-green-500 text-5xl mb-4">✅</div>
                  <h3 className="text-xl font-bold mb-2">تم الإرسال بنجاح!</h3>
                  <p className="text-gray-600 mb-6">تحقق من بريدك الإلكتروني لإعادة تعيين كلمة المرور.</p>
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="submit-btn"
                  >
                    العودة لتسجيل الدخول
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword}>
                  <div className="input-group">
                    <label htmlFor="reset-email" className="input-label">البريد الإلكتروني</label>
                    <div className="input-wrapper">
                      <input
                        type="email"
                        id="reset-email"
                        className="form-input"
                        placeholder="email@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {resetStatus === 'error' && (
                    <div className="error-message mb-4">
                      حدث خطأ، تأكد من صحة البريد الإلكتروني.
                    </div>
                  )}

                  <button type="submit" className="submit-btn mb-4" disabled={resetStatus === 'sending'}>
                    {resetStatus === 'sending' ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full text-center text-gray-500 hover:text-gray-700"
                  >
                    إلغاء والعودة
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
