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
