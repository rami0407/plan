'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    subject: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }

    try {
      // 1. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Update Profile with Name
      await updateProfile(user, { displayName: formData.name });

      // 3. Create User Document in Firestore with 'pending' status
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        phone: formData.phone,
        role: 'coordinator', // Default role for new signups
        status: 'pending',   // Needs admin approval
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      // Optional: Sign out user immediately so they can't access dashboard until approved
      // await auth.signOut(); 
    } catch (err: any) {
      console.error('SignUp error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('البريد الإلكتروني مستخدم بالفعل');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرור ضعيفة جداً');
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-bg-effect min-h-screen flex items-center justify-center p-4" dir="rtl">
        <div className="login-container text-center p-8">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">تم إنشاء طلب التسجيل بنجاح!</h2>
          <p className="text-gray-600 mb-8">
            طلبك الآن قيد المراجعة من قبل إدارة المدرسة. 
            ستتمكن من الدخول إلى النظام فور اعتماد حسابך.
          </p>
          <Link href="/" className="submit-btn block text-center">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-bg-effect min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="login-container max-w-md w-full">
        <div className="login-header">
          <div className="login-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="#667eea" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 22V12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 7L12 12L22 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="8" r="2" fill="white" />
            </svg>
          </div>
          <h1>إنشاء حساب جديد</h1>
          <p>انضم إلى أسرة مدرسة مشيرفة</p>
        </div>

        <div className="form-container">
          {error && (
            <div className="error-message mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="input-group">
              <label className="input-label">الاسم الكامل</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="أدخل اسمك الكامل"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="input-group">
                <label className="input-label">التخصص / الموضوع</label>
                <input
                  type="text"
                  name="subject"
                  className="form-input"
                  placeholder="مثلاً: رياضيات"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">رقم الهاتف</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  placeholder="050-0000000"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">كلمة المرور</label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="********"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">تأكيد كلمة المرور</label>
              <input
                type="password"
                name="confirmPassword"
                className="form-input"
                placeholder="********"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="submit-btn w-full" disabled={loading}>
              {loading ? 'جاري إنشاء الحساب...' : 'إرسال طلب التسجيل'}
            </button>
          </form>

          <div className="footer-text mt-6 text-center">
            لديك حساب بالفعل؟ <Link href="/" className="font-bold text-primary hover:underline">تسجيل الدخول</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
