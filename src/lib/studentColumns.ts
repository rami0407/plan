export interface ColumnDefinition {
    key: string;
    label: string;
    type: 'text' | 'dropdown' | 'checkbox' | 'numeric';
    options?: string[];
    width?: number;
}

export const STUDENT_COLUMNS: ColumnDefinition[] = [
    { key: 'name', label: 'שם התלמיד', type: 'text', width: 150 },
    {
        key: 'attendance',
        label: 'נוכחות',
        type: 'dropdown',
        options: ['סדירה (לא נעדר)', 'לעיתים רחוקות(פעם בחודש)', 'לעיתים קרובות (פעם בשבוע)', 'נשירה (יותר מפעם בשבוע)'],
        width: 130
    },
    {
        key: 'violence',
        label: 'אלימות',
        type: 'dropdown',
        options: ['לא אלים (אפס אלימות)', 'אלימות מילולית לעיתים רחוקות (פעם בחודש)', 'אלימות מילולית לעיתים קרובות (פעם בשבוע )', 'לעיתים רחוקות (פעם בחודש)', 'לעיתים קרובות (פעם בשבוע)'],
        width: 150
    },
    {
        key: 'socialStatus',
        label: 'מצב חברתי',
        type: 'dropdown',
        options: ['מוביל', 'מעורב', 'בודד', 'דחוי'],
        width: 100
    },
    {
        key: 'needsDiagnosis',
        label: 'צורך לאבחון',
        type: 'dropdown',
        options: ['כן', 'לא'],
        width: 100
    },
    {
        key: 'learningResource',
        label: 'מקבל משאב לימודי',
        type: 'dropdown',
        options: ['פרטני', 'שילוב', 'תגבור', 'אחר'],
        width: 140
    },
    {
        key: 'emotionalResource',
        label: 'מקבל משאב רגשי',
        type: 'dropdown',
        options: ['פסיכולוגי', 'יועצת', 'אומנות', 'אחר'],
        width: 140
    },
    { key: 'strengths', label: 'נקודות חוזק', type: 'text', width: 200 },
    { key: 'weaknesses', label: 'נקודות לחיזוק', type: 'text', width: 200 },
    {
        key: 'enrichmentPrograms',
        label: 'תוכניות העשרה',
        type: 'dropdown',
        options: ['בית ספרית', 'מחוץ לבית הספר', 'שני האפשריות', 'אין'],
        width: 140
    },
    { key: 'layerEnrichmentType', label: 'סוג ההעשרה לשכבה', type: 'text', width: 150 },
    {
        key: 'familyStatus',
        label: 'מצב משפחתי',
        type: 'dropdown',
        options: ['נישואים', 'גרושים', 'אחר'],
        width: 120
    },
    {
        key: 'scholarship',
        label: 'מלגה',
        type: 'dropdown',
        options: ['מקבל', 'לא מקבל'],
        width: 100
    },
    {
        key: 'healthCondition',
        label: 'מצב בריאותי (רגישות)',
        type: 'dropdown',
        options: ['אין רגשות', 'מוצרי חלב', 'עקיצה של דבורים', 'שעועית', 'פרחים וצמחים', 'תרופות', 'חיות', 'אחר'],
        width: 160
    },
    {
        key: 'disabilities',
        label: 'סוג לקויות',
        type: 'dropdown',
        options: ['מחלות נדירות', 'שמיעה', 'ראיה', 'עיכוב התפתחות פיזית', 'עיכוב התפתחות שפתית', 'לקות למידה adhd', 'מחלות נפשיות', 'אחר'],
        width: 160
    },
    { key: 'resourceType', label: 'סוג המשאב לתלמידים', type: 'text', width: 150 },

    // Grades Section (Flattened for spreadsheet view)
    { key: 'grade_english', label: 'אנגלית', type: 'numeric', width: 80 },
    { key: 'grade_hebrew', label: 'עברית', type: 'numeric', width: 80 },
    { key: 'grade_arabic', label: 'ערבית', type: 'numeric', width: 80 },
    { key: 'grade_math', label: 'מתמטיקה', type: 'numeric', width: 80 },
    { key: 'grade_science', label: 'מדעים', type: 'numeric', width: 80 },

    { key: 'notes', label: 'הערות', type: 'text', width: 200 },
];

const ARABIC_LABELS: Record<string, string> = {
    'שם התלמיד': 'اسم الطالب',
    'נוכחות': 'الحضور',
    'אלימות': 'العنف',
    'מצב חברתי': 'الوضع الاجتماعي',
    'צורך לאבחון': 'حاجة لتشخيص',
    'מקבל משאב לימודי': 'دعم تعليمي',
    'מקבל משאב רגשי': 'دعم عاطفي',
    'נקודות חוזק': 'نقاط القوة',
    'נקודות לחיזוק': 'نقاط للتحسين',
    'תוכניות העשרה': 'برامج إثراء',
    'סוג ההעשרה לשכבה': 'نوع الإثراء للطبقة',
    'מצב משפחתי': 'الوضع العائلي',
    'מלגה': 'منحة',
    'מצב בריאותי (רגישות)': 'الوضع الصحي (حساسية)',
    'סוג לקויות': 'نوع الصعوبة/الإعاقة',
    'סוג המשאב לתלמידים': 'نوع الدعم للطلاب',
    'אנגלית': 'اللغة الإنجليزية',
    'עברית': 'اللغة العبرية',
    'ערבית': 'اللغة العربية',
    'מתמטיקה': 'الرياضيات',
    'מדעים': 'العلوم',
    'הערות': 'ملاحظات'
};

const ARABIC_OPTIONS: Record<string, string> = {
    'סדירה (לא נעדר)': 'منتظم (لا يغيب)',
    'לעיתים רחוקות(פעם בחודש)': 'نادراً (مرة في الشهر)',
    'לעיתים קרובות (פעם בשבוע)': 'غالباً (مرة في الأسبوع)',
    'נשירה (יותר מפעם בשבוע)': 'تسرب (أكثر من مرة في الأسبوع)',
    
    'לא אלים (אפס אלימות)': 'غير عنيف (بدون عنف)',
    'אלימות מילולית לעיתים רחוקות (פעם בחודש)': 'عنف لفظي نادراً (مرة في الشهر)',
    'אלימות מילולית לעיתים קרובות (פעם בשבוע )': 'عنف لفظي غالباً (مرة في الأسبوع)',
    'לעיתים רחוקות (פעם בחודש)': 'نادراً (مرة في الشهر)',
    
    'מוביל': 'قيادي',
    'מעורב': 'مندمج',
    'בודד': 'وحيد',
    'דחוי': 'منבוذ',
    
    'כן': 'نعم',
    'לא': 'لا',
    
    'פרטני': 'تعليم فردي',
    'שילוב': 'دمج',
    'תגבור': 'تقوية',
    'אחר': 'آخر',
    
    'פסיכולוגי': 'نفسي',
    'יועצת': 'مستشارة',
    'אומנות': 'علاج بالفن',
    
    'בית ספרית': 'مدرسية',
    'מחוץ לבית הספר': 'خارج المدرسة',
    'שני האפשריות': 'الخيارين معاً',
    'אין': 'لا يوجد',
    
    'נישואים': 'متزوجين',
    'גרושים': 'مطلقين',
    
    'מקבל': 'يحصل',
    'לא מקבל': 'لا يحصل',
    
    'אין רגשות': 'لا يوجد حساسية',
    'מוצרי חלב': 'منتجات الحليب',
    'עקיצה של דבורים': 'لسعة نحل',
    'שעועית': 'فاصوليا',
    'פרחים וצמחים': 'أزهار ونباتات',
    'תרופות': 'أدوية',
    'חיות': 'حيوانات',
    
    'מחלות נדירות': 'أمراض نادرة',
    'שמיעה': 'سمعية',
    'ראיה': 'بصرية',
    'עיכוב התפתחות פיזית': 'تأخر تطور حركي',
    'עיכוב התפתחות שפתית': 'تأخر تطور لغوي',
    'לקות למידה adhd': 'عسر تعليمي ADHD',
    'מחלות נפשיות': 'اضطرابات نفسية'
};

export function getLocalizedColumns(language: 'ar' | 'he'): ColumnDefinition[] {
    if (language === 'he') return STUDENT_COLUMNS;
    
    return STUDENT_COLUMNS.map(col => {
        const localizedCol = { ...col };
        if (ARABIC_LABELS[col.label]) {
            localizedCol.label = ARABIC_LABELS[col.label];
        }
        if (col.options) {
            localizedCol.options = col.options.map(opt => ARABIC_OPTIONS[opt] || opt);
        }
        return localizedCol;
    });
}
