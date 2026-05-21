'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// ... imports
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { addPendingUser } from '@/lib/firestoreService';

export default function LoginPage() {
  const router = useRouter();
  // Login State
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_DEFAULT_USER_EMAIL || '');
  const [password, setPassword] = useState(process.env.NEXT_PUBLIC_DEFAULT_USER_PASSWORD || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Forgot Password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Registration State
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regStatus, setRegStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthContext will handle redirection based on role/status
      // But we can verify here if needed
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegStatus('registering');
    setError('');

    try {
      // 1. Create User in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      const user = userCredential.user;

      // 2. Update Profile Name
      await updateProfile(user, { displayName: regName });

      // 3. Add to Pending Users Collection
      await addPendingUser({
        uid: user.uid,
        name: regName,
        email: regEmail,
        phone: regPhone,
      });

      setRegStatus('success');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('البريد الإلكتروني مستخدم بالفعل');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل)');
      } else {
        setError('فشل إنشاء الحساب: ' + err.message);
      }
      setRegStatus('error');
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
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 2 + 2}s`
            }}
          ></div>
        ))}
      </div>

      <div className="login-container">

        {/* Main Interface Logic */}
        {!showForgotPassword && !isRegistering ? (
          /* LOGIN VIEW */
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
                      type="text"
                      id="username"
                      name="username"
                      className="form-input"
                      placeholder="أدخل البريد الإلكتروني"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <span className="input-icon">✉️</span>
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
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div className="remember-forgot">
                  <label className="remember">
                    <input type="checkbox" id="remember" />
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
                className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-all mb-4 shadow-sm"
              >
                <span>G</span>
                <span>تسجيل الدخول عبر Google</span>
              </button>

              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-gray-600 mb-2">ليس لديك حساب؟</p>
                <button
                  onClick={() => { setIsRegistering(true); setError(''); }}
                  className="text-primary font-bold hover:underline"
                >
                  إنشاء حساب جديد ✨
                </button>
              </div>
            </div>
          </>
        ) : showForgotPassword ? (
          /* FORGOT PASSWORD VIEW */
          <>
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
        ) : (
          /* REGISTRATION VIEW */
          <>
            <div className="login-header">
              <div className="login-logo">
                <span className="text-4xl">📝</span>
              </div>
              <h1>إنشاء حساب جديد</h1>
              <p>انضم إلى طاقم المدرسة المميز</p>
            </div>

            <div className="form-container">
              {regStatus === 'success' ? (
                <div className="text-center py-6 animate-fade-in">
                  <div className="text-green-500 text-6xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold mb-2 text-gray-800">تم إرسال الطلب!</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    شكراً لتسجيلك. حسابك الآن قيد المراجعة من قبل الإدارة.<br />
                    سيتم تفعيل حسابك بعد الموافقة عليه.
                  </p>
                  <button
                    onClick={() => { setIsRegistering(false); setRegStatus('idle'); }}
                    className="submit-btn"
                  >
                    العودة للرئيسية
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegister}>
                  {error && (
                    <div className="error-message mb-4">
                      {error}
                    </div>
                  )}

                  <div className="input-group mb-4">
                    <label className="input-label">الاسم الكامل</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="الاسم الثلاثي"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group mb-4">
                    <label className="input-label">البريد الإلكتروني</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="example@school.edu"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group mb-4">
                    <label className="input-label">رقم الهاتف</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="050xxxxxxx"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group mb-6">
                    <label className="input-label">كلمة المرور</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="******"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <button type="submit" className="submit-btn mb-4" disabled={regStatus === 'registering'}>
                    {regStatus === 'registering' ? 'جاري التسجيل...' : 'إنشاء الحساب'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsRegistering(false); setError(''); }}
                    className="w-full text-center text-gray-500 hover:text-gray-700 font-medium"
                  >
                    إلغاء والعودة لتسجيل الدخول
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
