// Academic Year Date Utilities

export interface WeekInfo {
    weekNumber: number;
    startDate: Date;
    endDate: Date;
    dateRange: string;
    content?: string;
    status?: 'completed' | 'partial' | 'not-started';
    notes?: string;
}

export interface MonthPlan {
    monthNumber: number;
    monthName: string;
    monthNameArabic: string;
    year: number;
    weeks: WeekInfo[];
    content: string;
}

const ARABIC_MONTHS = [
    'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'
];

const ENGLISH_MONTHS = [
    'September', 'October', 'November', 'December',
    'January', 'February', 'March', 'April', 'May', 'June'
];

/**
 * Get the start date of the academic year
 * Academic year starts on September 1st
 */
export function getAcademicYearStart(year: number): Date {
    return new Date(year, 8, 1); // September 1st (month is 0-indexed)
}

/**
 * Get the end date of the academic year  
 * Academic year ends on June 30th of next year
 */
export function getAcademicYearEnd(year: number): Date {
    return new Date(year + 1, 5, 30); // June 30th of next year
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Format date as DD/MM/YYYY
 */
export function formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Format date range
 */
export function formatDateRange(start: Date, end: Date): string {
    return `${formatDate(start)} - ${formatDate(end)}`;
}

/**
 * Get next Sunday (or same day if already Sunday)
 * Sunday = 0 in JavaScript
 */
function getNextSunday(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    if (day !== 0) {
        result.setDate(result.getDate() + (7 - day));
    }
    return result;
}

/**
 * Calculate weeks for a given month in the academic year
 * Each week is Sunday-Thursday (5 days)
 */
export function calculateMonthWeeks(monthIndex: number, academicYear: number): WeekInfo[] {
    const weeks: WeekInfo[] = [];
    const yearStart = getAcademicYearStart(academicYear);

    // Calculate which calendar month this academic month maps to
    const calendarMonth = (8 + monthIndex) % 12; // September = 8
    const calendarYear = monthIndex < 4 ? academicYear : academicYear + 1;

    // Get first day of the month
    const monthStart = new Date(calendarYear, calendarMonth, 1);

    // Find first Sunday of the month (or the Sunday before if month doesn't start on Sunday)
    let weekStart = getNextSunday(monthStart);
    if (weekStart > monthStart) {
        weekStart = addDays(weekStart, -7);
    }

    // Generate 4 weeks
    for (let i = 0; i < 4; i++) {
        const weekEnd = addDays(weekStart, 4); // Thursday (5 days: Sun-Thu)

        weeks.push({
            weekNumber: i + 1,
            startDate: new Date(weekStart),
            endDate: new Date(weekEnd),
            dateRange: formatDateRange(weekStart, weekEnd),
            content: '',
            status: 'not-started',
            notes: ''
        });

        weekStart = addDays(weekStart, 7); // Next Sunday
    }

    return weeks;
}

/**
 * Generate all months for an academic year
 */
export function generateAcademicYearMonths(academicYear: number): MonthPlan[] {
    const months: MonthPlan[] = [];

    for (let i = 0; i < 10; i++) {
        const calendarMonth = (8 + i) % 12;
        const calendarYear = i < 4 ? academicYear : academicYear + 1;

        months.push({
            monthNumber: i + 1,
            monthName: ENGLISH_MONTHS[i],
            monthNameArabic: ARABIC_MONTHS[i],
            year: calendarYear,
            weeks: calculateMonthWeeks(i, academicYear),
            content: ''
        });
    }

    return months;
}

/**
 * Get a specific month's planning data
 */
export function getMonthPlan(monthIndex: number, academicYear: number): MonthPlan {
    const calendarMonth = (8 + monthIndex) % 12;
    const calendarYear = monthIndex < 4 ? academicYear : academicYear + 1;

    return {
        monthNumber: monthIndex + 1,
        monthName: ENGLISH_MONTHS[monthIndex],
        monthNameArabic: ARABIC_MONTHS[monthIndex],
        year: calendarYear,
        weeks: calculateMonthWeeks(monthIndex, academicYear),
        content: ''
    };
}
