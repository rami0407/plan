'use client';

import { useState, useEffect, Suspense } from 'react';
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
import AIAssistant from '@/components/AIAssistant';

function ProtocolsContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();

    // Determine context
    const paramCoordinatorId = searchParams.get('coordinatorId');
    const effectiveCoordinatorId = paramCoordinatorId || user?.uid;

    const [meetingProtocols, setMeetingProtocols] = useState<MeetingProtocol[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAI, setShowAI] = useState(false);
    const [activeTab, setActiveTab] = useState<'new' | 'drafts' | 'sent'>('new');
    const [editingProtocol, setEditingProtocol] = useState<MeetingProtocol | null>(null);

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
            // Ensure status exists (migration fallback)
            const processedData: MeetingProtocol[] = data.map(p => ({
                ...p,
                status: p.status || 'draft' // Default to draft if undefined
            }));
            setMeetingProtocols(processedData);
        } catch (error) {
            console.error('Error loading protocols:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewProtocol = () => {
        const newProtocol: Omit<MeetingProtocol, 'id'> = {
            coordinatorId: effectiveCoordinatorId!,
            date: new Date().toISOString().split('T')[0],
            type: 'staff',
            participants: '',
            topic: '',
            summary: '',
            decisions: '',
            nextSteps: '',
            status: 'draft'
        };
        // We act like we are editing a new one, but not saving yet until they click save
        setEditingProtocol({ id: 'temp_new', ...newProtocol });
        setActiveTab('new');
    };

    const handleSaveDraft = async () => {
        if (!editingProtocol) return;

        try {
            if (editingProtocol.id === 'temp_new') {
                const { id, ...data } = editingProtocol;
                const newId = await addProtocol({ ...data, status: 'draft' });
                setMeetingProtocols(prev => [{ ...data, id: newId, status: 'draft' }, ...prev]);
                setEditingProtocol({ ...data, id: newId, status: 'draft' });
            } else {
                await updateProtocol(editingProtocol.id!, { ...editingProtocol, status: 'draft' });
                setMeetingProtocols(prev => prev.map(p => p.id === editingProtocol.id ? { ...editingProtocol, status: 'draft' } : p));
            }
            alert('✅ تم حفظ المسودة');
        } catch (error) {
            console.error('Error saving draft:', error);
            alert('❌ حدث خطأ أثناء الحفظ');
        }
    };

    const handleSend = async () => {
        if (!editingProtocol || !editingProtocol.id || editingProtocol.id === 'temp_new') {
            alert('يرجى حفظ البروتوكول أولاً قبل الإرسال');
            return;
        }

        if (!confirm('هل أنت متأكد من إرسال البروتوكول للمدير؟ لا يمكن تعديله بعد الإرسال.')) return;

        try {
            await updateProtocol(editingProtocol.id, { status: 'sent' });

            // Notification logic
            await createNotification({
                recipientId: 'admin',
                title: 'بروتوكول جلسة جديد',
                message: `قام المركز بإرسال بروتوكول جلسة بعنوان "${editingProtocol.topic || 'بدون عنوان'}" للمراجعة.`,
                link: `/dashboard/protocols?coordinatorId=${effectiveCoordinatorId}`,
                type: 'general_message',
                senderName: 'Coordinator',
                senderRole: 'coordinator'
            });

            setMeetingProtocols(prev => prev.map(p => p.id === editingProtocol.id ? { ...p, status: 'sent' } : p));
            setActiveTab('sent');
            setEditingProtocol(null);
            alert('✅ تم إرسال البروتوكول بنجاح');
        } catch (error) {
            console.error('Error sending:', error);
            alert('❌ حدث خطأ أثناء الإرسال');
        }
    };

    const filteredProtocols = meetingProtocols.filter(p => {
        if (activeTab === 'drafts') return p.status === 'draft';
        if (activeTab === 'sent') return p.status === 'sent';
        return false;
    });

    return (
        <div className="animate-fade-in pb-20">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-3xl font-black mb-2">بروتوكولات الجلسات</h1>
                    <p className="text-gray-500 text-lg">نظام توثيق الاجتماعات والملفات</p>
                </div>
                <button
                    onClick={() => setShowAI(true)}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2 animate-pulse"
                >
                    <span>✨</span> المساعد الذكي
                </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-white p-1 rounded-2xl shadow-sm mb-8 w-fit mx-auto border border-gray-100">
                <button
                    onClick={() => { setActiveTab('new'); handleNewProtocol(); }}
                    className={`px-8 py-3 rounded-xl text-lg font-bold transition-all ${activeTab === 'new' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    + بروتوكول جديد
                </button>
                <button
                    onClick={() => { setActiveTab('drafts'); setEditingProtocol(null); }}
                    className={`px-8 py-3 rounded-xl text-lg font-bold transition-all ${activeTab === 'drafts' ? 'bg-amber-500 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    📁 المسودات ({meetingProtocols.filter(p => p.status === 'draft').length})
                </button>
                <button
                    onClick={() => { setActiveTab('sent'); setEditingProtocol(null); }}
                    className={`px-8 py-3 rounded-xl text-lg font-bold transition-all ${activeTab === 'sent' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    📩 الأرشيف المرسل ({meetingProtocols.filter(p => p.status === 'sent').length})
                </button>
            </div>

            {showAI && (
                <AIAssistant
                    onClose={() => setShowAI(false)}
                    context={{ meetingProtocols }}
                    pageTitle="مساعد البروتوكولات"
                    suggestions={[
                        { label: 'تحليل الجلسة', prompt: 'راجع محتوى آخر بروتوكول واستخرج أهم 3 قرارات.', icon: '🔍' }
                    ]}
                />
            )}

            {/* Content Area */}
            {activeTab === 'new' || (editingProtocol && activeTab === 'drafts') ? (
                // Editor Mode
                <div className="glass-panel p-8 animate-fade-in relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-t-2xl"></div>
                    <div className="mb-6 flex justify-between items-center">
                        <h2 className="text-2xl font-black text-gray-800">
                            {editingProtocol?.id === 'temp_new' ? 'تحرير بروتوكول جديد' : 'تعديل مسودة'}
                        </h2>
                        {activeTab === 'drafts' && (
                            <button onClick={() => setEditingProtocol(null)} className="text-gray-500 hover:text-gray-700">
                                ❌ إغلاق
                            </button>
                        )}
                    </div>

                    {editingProtocol && (
                        <>
                            {/* Basic Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-700">التاريخ</label>
                                    <input
                                        type="date"
                                        value={editingProtocol.date}
                                        onChange={(e) => setEditingProtocol({ ...editingProtocol, date: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-700">نوع الجلسة</label>
                                    <select
                                        value={editingProtocol.type}
                                        onChange={(e) => setEditingProtocol({ ...editingProtocol, type: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                    >
                                        <option value="principal">👔 جلسة مع المدير</option>
                                        <option value="staff">👥 جلسة مع الطاقم</option>
                                        <option value="counselor">🎯 جلسة مع المرشد</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-700">المشاركون</label>
                                    <input
                                        type="text"
                                        value={editingProtocol.participants}
                                        onChange={(e) => setEditingProtocol({ ...editingProtocol, participants: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                        placeholder="الأسماء..."
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold mb-2 text-gray-700">موضوع الجلسة</label>
                                <input
                                    type="text"
                                    value={editingProtocol.topic}
                                    onChange={(e) => setEditingProtocol({ ...editingProtocol, topic: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none transition-all font-bold text-lg"
                                    placeholder="اكتب موضوع الجلسة هنا..."
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-6 mb-8">
                                <textarea
                                    value={editingProtocol.summary}
                                    onChange={(e) => setEditingProtocol({ ...editingProtocol, summary: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none transition-all h-32 resize-none"
                                    placeholder="ملخص الجلسة..."
                                />
                                <textarea
                                    value={editingProtocol.decisions}
                                    onChange={(e) => setEditingProtocol({ ...editingProtocol, decisions: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none transition-all h-32 resize-none"
                                    placeholder="القرارات والتوصيات..."
                                />
                                <textarea
                                    value={editingProtocol.nextSteps}
                                    onChange={(e) => setEditingProtocol({ ...editingProtocol, nextSteps: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none transition-all h-32 resize-none"
                                    placeholder="الخطوات القادمة..."
                                />
                            </div>

                            <div className="flex gap-4 border-t pt-6">
                                <button
                                    onClick={handleSaveDraft}
                                    className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-amber-200"
                                >
                                    💾 حفظ كمسودة
                                </button>
                                <button
                                    onClick={handleSend}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-green-200"
                                >
                                    🚀 إرسال للمدير
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                // File/Grid View (Drafts or Sent)
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                    {filteredProtocols.length > 0 ? (
                        filteredProtocols.map(protocol => (
                            <div
                                key={protocol.id}
                                onClick={() => activeTab === 'drafts' ? setEditingProtocol(protocol) : null}
                                className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-md
                                    ${activeTab === 'drafts' ? 'border-amber-100 hover:border-amber-300' : 'border-green-50 hover:border-green-300'}
                                `}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl
                                      ${activeTab === 'drafts' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}
                                `}>
                                    {activeTab === 'drafts' ? '📁' : '📄'}
                                </div>
                                <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-1 group-hover:text-purple-600 transition-colors">
                                    {protocol.topic || 'بدون عنوان'}
                                </h3>
                                <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                                    📅 {protocol.date}
                                </div>

                                {activeTab === 'sent' && (
                                    <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                                        تم الإرسال
                                    </div>
                                )}
                                {activeTab === 'drafts' && (
                                    <div className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">
                                        مسودة - انقر للتعديل
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 opacity-50">
                            <div className="text-6xl mb-4">📭</div>
                            <p className="text-xl font-bold text-gray-400">لا يوجد {activeTab === 'drafts' ? 'مسودات محفوظة' : 'بروتوكولات مرسلة'}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ProtocolsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">جاري تحميل البروتوكولات...</div>}>
            <ProtocolsContent />
        </Suspense>
    );
}

