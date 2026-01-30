'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    addProtocol,
    getProtocols,
    updateProtocol,
    deleteProtocol,
    type MeetingProtocol,
    createNotification
} from '@/lib/firestoreService';

export default function ProtocolsPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Determine context: Principal viewing a specific coordinator, or Coordinator viewing themselves
    const paramCoordinatorId = searchParams.get('coordinatorId');
    const effectiveCoordinatorId = paramCoordinatorId || user?.uid;

    const [meetingProtocols, setMeetingProtocols] = useState<MeetingProtocol[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (effectiveCoordinatorId) {
            loadProtocols();
        } else {
            setLoading(false);
        }
    }, [effectiveCoordinatorId]);

    const loadProtocols = async () => {
        try {
            setLoading(true);
            const data = await getProtocols(effectiveCoordinatorId!);
            setMeetingProtocols(data);
        } catch (error) {
            console.error('Error loading protocols:', error);
            alert('خطأ في تحميل البروتوكولات');
        } finally {
            setLoading(false);
        }
    };

    const addMeetingProtocol = async () => {
        if (!effectiveCoordinatorId) {
            alert('لا يمكن الإضافة: هوية المركز غير معروفة');
            return;
        }

        const newProtocol: any = {
            coordinatorId: effectiveCoordinatorId,
            date: new Date().toISOString().split('T')[0],
            type: 'staff',
            participants: '',
            topic: '',
            summary: '',
            decisions: '',
            nextSteps: ''
        };

        try {
            const id = await addProtocol(newProtocol);
            setMeetingProtocols([{ id, ...newProtocol }, ...meetingProtocols]);
        } catch (error) {
            console.error('Error adding protocol:', error);
            alert('فشل إنشاء بروتوكول جديد');
        }
    };

    const updateMeetingProtocolState = (id: string, field: keyof MeetingProtocol, value: any) => {
        setMeetingProtocols(protocols => protocols.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    const handleSaveProtocol = async (protocol: MeetingProtocol) => {
        if (!protocol.id) return;
        try {
            await updateProtocol(protocol.id, protocol);
            alert('✅ تم حفظ التغييرات بنجاح');
        } catch (error) {
            console.error('Error saving protocol:', error);
            alert('❌ حدث خطأ أثناء الحفظ');
        }
    };

    const handleDeleteProtocol = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا البروتوكول؟')) return;

        try {
            await deleteProtocol(id);
            setMeetingProtocols(protocols => protocols.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting protocol:', error);
            alert('❌ حدث خطأ أثناء الحذف');
        }
    };

    const handleSendToPrincipal = async (protocol: MeetingProtocol) => {
        if (!effectiveCoordinatorId) return;

        try {
            // Since we don't have a direct "admin" ID constant, we assign to 'admin' (Principal checks this by default or filtered)
            await createNotification({
                recipientId: 'admin',
                title: 'بروتوكول جلسة جديد',
                message: `قام المركز بإرسال بروتوكول جلسة بعنوان "${protocol.topic || 'بدون عنوان'}" للمراجعة.`,
                link: `/dashboard/protocols?coordinatorId=${effectiveCoordinatorId}`, // Link for principal to see it
                type: 'general_message',
                senderName: 'مركز موضوع', // We should strictly get real name but this is ok for now
                senderRole: 'coordinator'
            });
            alert('✅ تم إرسال الإشعار للإدارة');
        } catch (error) {
            console.error('Error sending notification:', error);
            alert('❌ حدث خطأ أثناء الإرسال');
        }
    }

    const exportToPDF = () => {
        window.print();
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'principal': return 'جلسة مع المدير';
            case 'staff': return 'جلسة مع الطاقم';
            case 'counselor': return 'جلسة مع المرشد';
            default: return type;
        }
    };

    return (
        <div className="animate-fade-in pb-20">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="mb-1">بروتوكولات الجلسات</h1>
                        <p className="text-gray-500 text-lg">توثيق اللقاءات مع المدير والطاقم والمرشدين التربويين</p>
                    </div>
                </div>

                {/* PDF Export Button */}
                <button
                    onClick={exportToPDF}
                    className="btn btn-ghost border-2 border-purple-500 text-lg px-6 py-3 flex items-center gap-2 hover:bg-purple-500 hover:text-white"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    تنزيل PDF
                </button>
            </div>

            {/* Print Title */}
            <div className="hidden print:block mb-8 text-center">
                <h1 className="text-4xl font-black mb-2">بروتوكولات الجلسات</h1>
                <p className="text-xl text-gray-600">سجل الاجتماعات والنقاشات</p>
            </div>

            {/* Add Protocol Button */}
            <div className="mb-8 print:hidden">
                <button
                    onClick={addMeetingProtocol}
                    className="btn btn-primary text-lg px-8 py-4 shadow-xl"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    إضافة بروتوكول جلسة جديد
                </button>
            </div>

            {/* Protocols List */}
            <div className="space-y-8">
                {meetingProtocols.map((protocol, index) => (
                    <div key={protocol.id} className="glass-panel p-8 relative overflow-hidden print:border print:border-gray-300 page-break-inside-avoid">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-600 print:hidden"></div>

                        {/* Protocol Header */}
                        <div className="flex items-center justify-between mb-6 print:mb-4">
                            <h2 className="text-2xl font-black text-purple-700">
                                بروتوكول رقم {meetingProtocols.length - index}
                            </h2>
                            <button
                                onClick={() => handleDeleteProtocol(protocol.id!)}
                                className="text-red-500 hover:text-red-700 font-bold flex items-center gap-2 print:hidden"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                حذف
                            </button>
                        </div>

                        {/* Basic Info Grid */}
                        <div className="grid grid-cols-3 gap-6 mb-6 print:gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-3 text-gray-700 flex items-center gap-2">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                        <line x1="16" x2="16" y1="2" y2="6" />
                                        <line x1="8" x2="8" y1="2" y2="6" />
                                        <line x1="3" x2="21" y1="10" y2="10" />
                                    </svg>
                                    التاريخ
                                </label>
                                <input
                                    type="date"
                                    value={protocol.date}
                                    onChange={(e) => updateMeetingProtocolState(protocol.id!, 'date', e.target.value)}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl print:border print:border-gray-400 print:p-2 focus:border-purple-500 focus:ring-4 focus:ring-purple-200 font-medium text-lg transition-all shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-3 text-gray-700 flex items-center gap-2">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                    نوع الجلسة
                                </label>
                                <select
                                    value={protocol.type}
                                    onChange={(e) => updateMeetingProtocolState(protocol.id!, 'type', e.target.value)}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl print:border print:border-gray-400 print:p-2 focus:border-purple-500 focus:ring-4 focus:ring-purple-200 font-bold text-lg transition-all shadow-sm"
                                >
                                    <option value="principal">👔 جلسة مع المدير</option>
                                    <option value="staff">👥 جلسة مع الطاقم</option>
                                    <option value="counselor">🎯 جلسة مع المرشد</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-3 text-gray-700 flex items-center gap-2">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="8.5" cy="7" r="4" />
                                        <line x1="23" x2="17" y1="11" y2="11" />
                                    </svg>
                                    المشاركون
                                </label>
                                <input
                                    type="text"
                                    value={protocol.participants}
                                    onChange={(e) => updateMeetingProtocolState(protocol.id!, 'participants', e.target.value)}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl print:border print:border-gray-400 print:p-2 focus:border-purple-500 focus:ring-4 focus:ring-purple-200 font-medium text-lg transition-all shadow-sm"
                                    placeholder="أسماء المشاركين..."
                                />
                            </div>
                        </div>

                        {/* Topic */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold mb-3 text-gray-700 flex items-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" x2="8" y1="13" y2="13" />
                                    <line x1="16" x2="8" y1="17" y2="17" />
                                    <polyline points="10 9 9 9 8 9" />
                                </svg>
                                موضوع الجلسة
                            </label>
                            <input
                                type="text"
                                value={protocol.topic}
                                onChange={(e) => updateMeetingProtocolState(protocol.id!, 'topic', e.target.value)}
                                className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl print:border print:border-gray-400 print:p-2 focus:border-purple-500 focus:ring-4 focus:ring-purple-200 font-bold text-xl transition-all shadow-sm"
                                placeholder="الموضوع الرئيسي للجلسة..."
                            />
                        </div>

                        {/* Detailed Fields */}
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-bold mb-3 text-gray-700">ملخص الجلسة والنقاط الرئيسية</label>
                                <textarea
                                    value={protocol.summary}
                                    onChange={(e) => updateMeetingProtocolState(protocol.id!, 'summary', e.target.value)}
                                    className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl print:border print:border-gray-400 print:p-2 h-40 resize-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 font-medium text-lg transition-all shadow-sm"
                                    placeholder="ملخص النقاش والمواضيع التي تم طرحها..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-3 text-gray-700">القرارات والتوصيات</label>
                                <textarea
                                    value={protocol.decisions}
                                    onChange={(e) => updateMeetingProtocolState(protocol.id!, 'decisions', e.target.value)}
                                    className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl print:border print:border-gray-400 print:p-2 h-40 resize-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 font-medium text-lg transition-all shadow-sm"
                                    placeholder="القرارات التي تم اتخاذها والتوصيات..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-3 text-gray-700">الخطوات التالية والمتابعة</label>
                                <textarea
                                    value={protocol.nextSteps}
                                    onChange={(e) => updateMeetingProtocolState(protocol.id!, 'nextSteps', e.target.value)}
                                    className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl print:border print:border-gray-400 print:p-2 h-40 resize-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 font-medium text-lg transition-all shadow-sm"
                                    placeholder="ما هي الخطوات والمهام التالية المطلوبة..."
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100 print:hidden">
                            <button
                                onClick={() => handleSaveProtocol(protocol)}
                                className="btn btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                حفظ التغييرات
                            </button>
                            <button
                                onClick={() => handleSendToPrincipal(protocol)}
                                className="btn btn-ghost bg-purple-50 text-purple-700 hover:bg-purple-100 flex-1 py-3 flex items-center justify-center gap-2"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                                إرسال للإدارة
                            </button>
                        </div>
                    </div>
                ))}

                {meetingProtocols.length === 0 && (
                    <div className="glass-panel text-center py-20">
                        <div className="mb-6">
                            <svg className="mx-auto text-gray-300" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-400 mb-3">لا توجد بروتوكولات جلسات</h3>
                        <p className="text-xl text-gray-400 mb-6">ابدأ بتوثيق جلساتك واجتماعاتك</p>
                        <button
                            onClick={addMeetingProtocol}
                            className="btn btn-primary text-lg px-8 py-4"
                        >
                            إضافة بروتوكول الجلسة الأولى
                        </button>
                    </div>
                )}
            </div>

            {/* Print Styles */}
            <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}</style>
        </div>
    );
}
