'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { SchoolEvent, EventType, CalendarMetadata } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Calendar.module.css';

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const EVENT_COLORS: Record<EventType, string> = {
    holiday: '#d93025', // Google Red
    event: '#1a73e8',   // Google Blue
    exam: '#9334e6',    // Google Purple
    meeting: '#188038', // Google Green
    admin: '#616161',   // Google Graphite
};

const EVENT_LABELS: Record<EventType, string> = {
    holiday: 'عطلة',
    event: 'فعالية',
    exam: 'امتحان',
    meeting: 'اجتماع',
    admin: 'إداري',
};

// Interface for day object
interface CalendarDay {
    day: number;
    date: string;
    isCurrentMonth: boolean;
    events: SchoolEvent[];
}

const MAX_VISIBLE_EVENTS = 3;

export default function CalendarClient() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [metadata, setMetadata] = useState<CalendarMetadata>({ id: '', monthValue: '', notes: '' });

    // Modals State
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isDayViewOpen, setIsDayViewOpen] = useState(false); // For "Show more"

    const [selectedDate, setSelectedDate] = useState<string>('');
    const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
    const [dayViewEvents, setDayViewEvents] = useState<SchoolEvent[]>([]); // Events to show in Day modal

    const [formData, setFormData] = useState({
        title: '',
        type: 'event' as EventType,
        description: ''
    });

    const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Fetch Events & Metadata
    useEffect(() => {
        const q = query(collection(db, 'calendarEvents'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedEvents: SchoolEvent[] = [];
            snapshot.forEach((doc) => {
                loadedEvents.push({ id: doc.id, ...doc.data() } as SchoolEvent);
            });
            setEvents(loadedEvents);
        });

        const fetchMetadata = async () => {
            const metaId = currentMonthStr;
            const docRef = doc(db, 'calendarMetadata', metaId);
            try {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setMetadata({ id: metaId, ...docSnap.data() } as CalendarMetadata);
                } else {
                    setMetadata({ id: metaId, monthValue: '', notes: '' });
                }
            } catch (err) {
                console.error("Error fetching metadata", err);
            }
        };

        fetchMetadata();

        return () => unsubscribe();
    }, [currentMonthStr]);

    const getCalendarDays = (): CalendarDay[] => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const startDayOfWeek = firstDayOfMonth.getDay();

        const days: CalendarDay[] = [];

        // Previous Month Days
        const prevMonthDate = new Date(year, month, 0);
        const daysInPrevMonth = prevMonthDate.getDate();

        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const date = new Date(year, month - 1, day);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            days.push({
                day,
                date: dateStr,
                isCurrentMonth: false,
                events: events.filter(e => e.start === dateStr)
            });
        }

        // Current Month Days
        const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInCurrentMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({
                day: i,
                date: dateStr,
                isCurrentMonth: true,
                events: events.filter(e => e.start === dateStr)
            });
        }

        // Next Month Days - Fill to 42 cells (6 rows)
        const totalCells = 42;
        const remainingDays = totalCells - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(year, month + 1, i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            days.push({
                day: i,
                date: dateStr,
                isCurrentMonth: false,
                events: events.filter(e => e.start === dateStr)
            });
        }

        return days;
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Click on day cell -> opens Create Event Modal
    const handleDayClick = (dateStr: string) => {
        setSelectedDate(dateStr);
        setEditingEvent(null);
        setFormData({ title: '', type: 'event', description: '' });
        setIsEventModalOpen(true);
    };

    // Click on a specific event -> Open Edit Modal
    const handleEventClick = (e: React.MouseEvent, event: SchoolEvent) => {
        e.stopPropagation();
        setEditingEvent(event);
        setSelectedDate(event.start);
        setFormData({
            title: event.title,
            type: event.type,
            description: event.description || ''
        });
        setIsEventModalOpen(true);
    };

    // Click on "+X more" -> Open Day View Modal
    const handleMoreClick = (e: React.MouseEvent, dayEvents: SchoolEvent[], dateStr: string) => {
        e.stopPropagation();
        setSelectedDate(dateStr);
        setDayViewEvents(dayEvents);
        setIsDayViewOpen(true);
    };

    const handleSaveEvent = async () => {
        if (!formData.title) return alert('الرجاء إدخال العنوان');

        try {
            const eventData = {
                title: formData.title,
                start: selectedDate,
                type: formData.type,
                description: formData.description,
                color: EVENT_COLORS[formData.type],
                createdBy: user?.uid || 'anonymous',
                createdAt: Date.now()
            };

            if (editingEvent) {
                await updateDoc(doc(db, 'calendarEvents', editingEvent.id), eventData);
            } else {
                await addDoc(collection(db, 'calendarEvents'), eventData);
            }
            setIsEventModalOpen(false);
            // If editing from Day View, we might want to close that too or update it? 
            // Realtime listener updates events so day view updates automatically.
        } catch (error) {
            console.error('Error saving event:', error);
            alert('حدث خطأ');
        }
    };

    const handleDeleteEvent = async () => {
        if (!editingEvent) return;
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        try {
            await deleteDoc(doc(db, 'calendarEvents', editingEvent.id));
            setIsEventModalOpen(false);
        } catch (error) {
            console.error('Error deleting:', error);
            alert('حدث خطأ');
        }
    };

    const handleMetadataChange = async (field: 'monthValue' | 'notes', value: string) => {
        const newMeta = { ...metadata, [field]: value };
        setMetadata(newMeta);
        await setDoc(doc(db, 'calendarMetadata', currentMonthStr), newMeta);
    };

    const calendarDays = getCalendarDays();
    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <div className="h-full flex flex-col p-4 animate-fade-in" style={{ direction: 'rtl' }}>
            {/* Value of the Month Banner */}
            <div className="mb-4">
                <div className="glass-panel p-3 rounded-2xl flex items-center justify-center gap-3 border border-purple-100 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 backdrop-blur-md shadow-sm">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                        <span className="text-xl">✨</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-500 uppercase tracking-wider bg-white/50 px-2 py-1 rounded-lg">قيمة الشهر</span>
                        <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-700">
                            {metadata.monthValue || 'لم يتم تحديد القيمة'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6 bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-white/20 sticky top-0 z-10 transition-all hover:shadow-md">
                <div className="flex items-center gap-6">
                    <div className="flex items-center bg-gray-100/50 rounded-full p-1 border border-gray-200">
                        <button
                            onClick={handlePrevMonth}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-600 active:scale-95"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-4 py-1.5 text-sm font-bold text-gray-600 hover:text-primary transition-colors border-x border-gray-200 mx-1"
                        >
                            اليوم
                        </button>
                        <button
                            onClick={handleNextMonth}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-600 active:scale-95"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                    </div>

                    <div className="relative group">
                        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3 cursor-pointer select-none">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark">
                                {MONTHS[currentDate.getMonth()]}
                            </span>
                            <span className="text-gray-400 font-light text-xl">
                                {currentDate.getFullYear()}
                            </span>
                            <svg
                                className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </h2>

                        {/* Month Picker Dropdown */}
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right">
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {MONTHS.map((month, idx) => (
                                    <button
                                        key={month}
                                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), idx, 1))}
                                        className={`p-2 text-sm rounded-lg transition-colors ${currentDate.getMonth() === idx
                                                ? 'bg-primary text-white font-bold'
                                                : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                    >
                                        {month}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                <button
                                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))}
                                    className="p-1 hover:bg-white rounded shadow-sm"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                </button>
                                <span className="font-bold text-gray-700">{currentDate.getFullYear()}</span>
                                <button
                                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))}
                                    className="p-1 hover:bg-white rounded shadow-sm"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Empty div to balance flex if needed, or remove if causing spacing issues */}
                <div className="w-[120px]"></div>
            </div>

            {/* Calendar Container */}
            <div className={styles.calendarContainer}>
                {/* Headers */}
                <div className={styles.header}>
                    {DAYS.map(day => (
                        <div key={day} className={styles.headerDay}>{day}</div>
                    ))}
                </div>

                {/* Grid */}
                <div className={styles.grid}>
                    {calendarDays.map((dayObj, idx) => {
                        const visibleEvents = dayObj.events.slice(0, MAX_VISIBLE_EVENTS);
                        const overflowCount = dayObj.events.length - MAX_VISIBLE_EVENTS;

                        return (
                            <div
                                key={idx}
                                className={`${styles.dayCell} ${!dayObj.isCurrentMonth ? styles.otherMonth : ''}`}
                                onClick={() => handleDayClick(dayObj.date)}
                            >
                                <div className={styles.dayHeader}>
                                    <span className={`${styles.dayNumber} ${dayObj.date === todayStr ? styles.today : ''}`}>
                                        {dayObj.day === 1 ? `${dayObj.day} ${MONTHS[parseInt(dayObj.date.split('-')[1]) - 1]}` : dayObj.day}
                                    </span>
                                </div>

                                <div className={styles.eventList}>
                                    {visibleEvents.map(event => (
                                        <div
                                            key={event.id}
                                            className={styles.eventItem}
                                            style={{ backgroundColor: event.color }}
                                            onClick={(e) => handleEventClick(e, event)}
                                            title={event.title}
                                        >
                                            {event.title}
                                        </div>
                                    ))}
                                    {overflowCount > 0 && (
                                        <div
                                            className={styles.moreEvents}
                                            onClick={(e) => handleMoreClick(e, dayObj.events, dayObj.date)}
                                        >
                                            {overflowCount}+ المزيد
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Event Create/Edit Modal */}
            {isEventModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                            <h3 className="font-medium text-gray-800">
                                {editingEvent ? 'تعديل حدث' : 'حدث جديد'}
                            </h3>
                            <button onClick={() => setIsEventModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <input
                                    type="text"
                                    className="w-full text-lg font-medium border-b-2 border-gray-200 focus:border-blue-500 outline-none pb-2 transition-colors placeholder-gray-400"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="أضف عنواناً"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                {Object.entries(EVENT_LABELS).map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: key as EventType })}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${formData.type === key
                                            ? 'ring-2 ring-offset-1 ring-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        style={{
                                            backgroundColor: formData.type === key ? EVENT_COLORS[key as EventType] : undefined
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 text-gray-600 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span>{selectedDate}</span>
                            </div>

                            <div>
                                <textarea
                                    className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px] resize-none"
                                    placeholder="أضف وصفاً أو ملاحظات..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t flex justify-end gap-2">
                            {editingEvent && (
                                <button
                                    onClick={handleDeleteEvent}
                                    className="px-4 py-2 text-red-600 text-sm font-medium hover:bg-red-50 rounded mr-auto"
                                >
                                    حذف
                                </button>
                            )}
                            <button
                                onClick={() => setIsEventModalOpen(false)}
                                className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSaveEvent}
                                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 shadow-sm"
                            >
                                حفظ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Day View Modal (Show More) */}
            {isDayViewOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 font-medium">{DAYS[new Date(selectedDate).getDay()]}</span>
                                <span className="text-xl font-bold text-gray-800">{new Date(selectedDate).getDate()}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditingEvent(null);
                                        setFormData({ title: '', type: 'event', description: '' });
                                        setIsEventModalOpen(true);
                                        // Optional: keep day view open or close it? usually creating event closes popup.
                                    }}
                                    className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100"
                                    title="إضافة حدث"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </button>
                                <button onClick={() => setIsDayViewOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">✕</button>
                            </div>
                        </div>

                        <div className="overflow-y-auto p-2 flex-1">
                            {dayViewEvents.length === 0 ? (
                                <p className="text-center text-gray-400 py-8 text-sm">لا توجد فعاليات</p>
                            ) : (
                                dayViewEvents.map(event => (
                                    <div
                                        key={event.id}
                                        className="mb-2 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group border-r-4 border-transparent hover:border-r-gray-200 transition-all"
                                        style={{ borderRightColor: event.color }}
                                        onClick={(e) => {
                                            setIsDayViewOpen(false); // Close day view to open edit ? Or stack? stack is better but complexity.
                                            handleEventClick(e, event);
                                        }}
                                    >
                                        <div className="font-medium text-gray-800 text-sm mb-1">{event.title}</div>
                                        <div className="text-xs text-gray-500 flex gap-2">
                                            <span style={{ color: event.color }}>{EVENT_LABELS[event.type]}</span>
                                            {event.description && <span className="truncate max-w-[150px]">- {event.description}</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
