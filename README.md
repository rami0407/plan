# 🏫 نظام إدارة المدرسة - School Management System

نظام شامل لإدارة المدارس يشمل التخطيط، المتابعة، والتقييم.

## ✨ المميزات

### 📊 لوحة تحكم المدير
- متابعة جميع المركزين وخططهم
- الموافقة على خطط العمل السنوية
- إحصائيات شاملة عن الأداء

### 👥 بوابة المركزين
- إدارة معلومات المركزين
- إضافة مركزين جدد
- متابعة حالة كل مركز

### 📋 خطط العمل السنوية
- إنشاء خطط عمل تفصيلية
- تحديد الأهداف والمهام
- متابعة نسبة الإنجاز

### 📝 خطط التدخل
- خطط فردية للطلاب
- خطط على مستوى المجموعات
- خطط على مستوى الصف

### 📑 البروتوكولات
- توثيق الجلسات والاجتماعات
- متابعة القرارات والتوصيات

### 📈 التحليلات والإحصائيات
- تقارير تفصيلية
- رسوم بيانية تفاعلية
- مؤشرات الأداء

## 🚀 التثبيت

### المتطلبات الأساسية
- Node.js 18 أو أحدث
- npm أو yarn

### خطوات التثبيت

1. **استنساخ المشروع**
```bash
git clone https://github.com/rami0407/plan.git
cd plan
```

2. **تثبيت الحزم**
```bash
npm install
```

3. **تثبيت Firebase**
```bash
npm install firebase
```

4. **إنشاء ملف البيئة**
أنشئ ملف `.env.local` في المجلد الرئيسي:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

5. **تشغيل المشروع**
```bash
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000) في المتصفح.

## 🔧 التكنولوجيا المستخدمة

- **[Next.js 15](https://nextjs.org/)** - إطار عمل React
- **[TypeScript](https://www.typescriptlang.org/)** - لغة البرمجة
- **[Firebase](https://firebase.google.com/)** - قاعدة البيانات والمصادقة
- **[Tailwind CSS](https://tailwindcss.com/)** - التصميم والأنماط

## 📁 هيكل المشروع

```
school-sys/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── principal/       # لوحة تحكم المدير
│   │   │   ├── planning/        # خطط العمل
│   │   │   ├── intervention/    # خطط التدخل
│   │   │   ├── protocols/       # البروتوكولات
│   │   │   └── analytics/       # الإحصائيات
│   │   └── coordinator-portal/  # بوابة المركزين
│   ├── components/
│   │   ├── layout/              # المكونات الأساسية
│   │   └── mapping/             # جداول التخطيط
│   └── lib/
│       ├── firebase.ts          # إعدادات Firebase
│       └── firestoreService.ts  # عمليات قاعدة البيانات
└── public/
```

## 🔐 إعداد Firebase

1. أنشئ مشروع جديد في [Firebase Console](https://console.firebase.google.com/)
2. فعّل Firestore Database
3. أضف القواعد التالية في Firestore Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // للتطوير فقط
    }
  }
}
```

> ⚠️ **تحذير**: للإنتاج، استخدم قواعد مصادقة آمنة.

## 📊 قاعدة البيانات

### Collections المطلوبة

#### coordinators
```typescript
{
  name: string,
  subject: string,
  email: string,
  phone: string,
  avatar: string,
  planStatus: 'complete' | 'incomplete' | 'pending',
  createdAt: Timestamp
}
```

#### workPlans
```typescript
{
  coordinatorId: string,
  year: number,
  status: 'draft' | 'pending' | 'approved' | 'rejected',
  goals: array,
  tasks: array,
  completionRate: number,
  lastUpdated: Timestamp
}
```

#### interventionPlans
```typescript
{
  coordinatorId: string,
  level: 'individual' | 'group' | 'class',
  students: array,
  createdAt: Timestamp
}
```

## 🎨 التصميم

النظام يستخدم:
- نظام ألوان عصري (Teal & Purple)
- Glassmorphism Effects
- تصميم متجاوب (Responsive)
- دعم كامل للعربية (RTL)

## 📱 الصفحات الرئيسية

| الصفحة | المسار | الوصف |
|--------|---------|--------|
| الرئيسية | `/dashboard` | الصفحة الرئيسية |
| لوحة المدير | `/dashboard/principal` | متابعة جميع المركزين |
| بوابة المركزين | `/coordinator-portal` | إدارة المركزين |
| خطط العمل | `/dashboard/planning` | الخطط السنوية |
| خطة التدخل | `/dashboard/intervention` | خطط التدخل |
| البروتوكولات | `/dashboard/protocols` | توثيق الجلسات |
| الإحصائيات | `/dashboard/analytics` | التحليلات |

## 🤝 المساهمة

نرحب بالمساهمات! يرجى:
1. Fork المشروع
2. إنشاء فرع جديد (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add some AmazingFeature'`)
4. Push للفرع (`git push origin feature/AmazingFeature`)
5. فتح Pull Request

## 📄 الرخصة

هذا المشروع مرخص تحت MIT License.

## 👤 المطور

**رامي**
- GitHub: [@rami0407](https://github.com/rami0407)

## 📞 الدعم

إذا كان لديك أي أسئلة أو مشاكل، يرجى فتح [Issue](https://github.com/rami0407/plan/issues).

---

صُنع بـ ❤️ لإدارة المدارس بكفاءة
