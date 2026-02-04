'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AIAssistant from '@/components/AIAssistant';

interface Protocol {
    id?: string;
    number: number;
    date: string;
    subject: string;
    participants: string;
    content: string;
    createdAt?: any;
    updatedAt?: any;
    createdBy?: string;
}

interface SentProtocol extends Protocol {
    sentAt?: any;
    sentBy?: string;
}

export default function ProtocolsClient() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'new' | 'drafts' | 'archive'>('new');
    const [showAI, setShowAI] = useState(false);

    // New Protocol State
    const [newProtocol, setNewProtocol] = useState<Protocol>({
        number: 1,
        date: new Date().toISOString().split('T')[0],
        subject: '',
        participants: '',
        content: ''
    });

    // Drafts State
    const [drafts, setDrafts] = useState<Protocol[]>([]);
    const [loadingDrafts, setLoadingDrafts] = useState(false);

    // Archive State
    const [sentProtocols, setSentProtocols] = useState<SentProtocol[]>([]);
    const [loadingArchive, setLoadingArchive] = useState(false);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        if (user) {
            loadDrafts();
            loadSentProtocols();
        }
    }, [user]);

    // Load Drafts
    const loadDrafts = async () => {
        if (!user) return;
        setLoadingDrafts(true);
        try {
            const q = query(
                collection(db, 'protocols', 'drafts', 'items'),
                where('createdBy', '==', user.email),
                orderBy('updatedAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Protocol[];
            setDrafts(data);
        } catch (error) {
            console.error('Error loading drafts:', error);
        } finally {
            setLoadingDrafts(false);
        }
    };

    // Load Sent Protocols
    const loadSentProtocols = async () => {
        setLoadingArchive(true);
        try {
            const q = query(
                collection(db, 'protocols', 'sent', 'items'),
                orderBy('sentAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SentProtocol[];
            setSentProtocols(data);
        } catch (error) {
            console.error('Error loading sent protocols:', error);
        } finally {
            setLoadingArchive(false);
        }
    };

    // Save Draft
    const saveDraft = async () => {
        if (!user || !newProtocol.subject) {
            alert('⚠️ الرجاء إدخال موضوع البروتوكول');
            return;
        }

        try {
            const draftData = {
                ...newProtocol,
                createdBy: user.email,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'protocols', 'drafts', 'items'), draftData);
            alert('✅ تم حفظ المسودة بنجاح');

            // Reset form
            setNewProtocol({
                number: newProtocol.number + 1,
                date: new Date().toISOString().split('T')[0],
                subject: '',
                participants: '',
                content: ''
            });

            // Reload drafts
            loadDrafts();
        } catch (error) {
            console.error('Error saving draft:', error);
            alert('❌ حدث خطأ أثناء حفظ المسودة');
        }
    };

    // Send Protocol
    const sendProtocol = async (protocol?: Protocol) => {
        const protocolToSend = protocol || newProtocol;

        if (!user || !protocolToSend.subject) {
            alert('⚠️ الرجاء إدخال موضوع البروتوكول');
            return;
        }

        if (!confirm('هل أنت متأكد من إرسال هذا البروتوكول للمدير؟')) {
            return;
        }

        try {
            const sentData = {
                ...protocolToSend,
                sentBy: user.email,
                sentAt: serverTimestamp(),
                createdAt: protocolToSend.createdAt || serverTimestamp()
            };

            // Add to sent collection
            await addDoc(collection(db, 'protocols', 'sent', 'items'), sentData);

            // If sending from draft, delete the draft
            if (protocol?.id) {
                await deleteDoc(doc(db, 'protocols', 'drafts', 'items', protocol.id));
                loadDrafts();
            } else {
                // Reset form if sending new protocol
                setNewProtocol({
                    number: newProtocol.number + 1,
                    date: new Date().toISOString().split('T')[0],
                    subject: '',
                    participants: '',
                    content: ''
                });
            }

            alert('✅ تم إرسال البروتوكول بنجاح');
            loadSentProtocols();

            // Switch to archive tab
            setActiveTab('archive');
        } catch (error) {
            console.error('Error sending protocol:', error);
            alert('❌ حدث خطأ أثناء الإرسال');
        }
    };

    // Delete Draft
    const deleteDraft = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه المسودة؟')) return;

        try {
            await deleteDoc(doc(db, 'protocols', 'drafts', 'items', id));
            loadDrafts();
            alert('✅ تم حذف المسودة');
        } catch (error) {
            console.error('Error deleting draft:', error);
            alert('❌ حدث خطأ أثناء الحذف');
        }
    };

    // Update Draft
    const updateDraft = async (id: string, updatedProtocol: Protocol) => {
        try {
            await updateDoc(doc(db, 'protocols', 'drafts', 'items', id), {
                ...updatedProtocol,
                updatedAt: serverTimestamp()
            });
            alert('✅ تم تحديث المسودة');
            loadDrafts();
        } catch (error) {
            console.error('Error updating draft:', error);
            alert('❌ حدث خطأ أثناء التحديث');
        }
    };

    // Load draft to editor
    const loadDraftToEditor = (draft: Protocol) => {
        setNewProtocol({
            number: draft.number,
            date: draft.date,
            subject: draft.subject,
            participants: draft.participants,
            content: draft.content
        });
        setActiveTab('new');
    };

    // Filtered sent protocols
    const filteredProtocols = sentProtocols.filter(p => {
        const matchesSearch = p.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.participants.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDate = !filterDate || p.date === filterDate;
        return matchesSearch && matchesDate;
    });

    return (
        <div className="animate-fade-in pb-20">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" x2="8" y1="13" y2="13" />
                            <line x1="16" x2="8" y1="17" y2="17" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="mb-1">بروتوكولات الجلسات</h1>
                        <p className="text-gray-500 text-lg">حفظ وأرشفة جميع البروتوكولات</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowAI(true)}
                    className="p-3 bg-purple-600 text-white rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 animate-pulse"
                >
                    <span>✨</span> المساعد الذكي
                </button>
            </div>

            {showAI && (
                <AIAssistant
                    onClose={() => setShowAI(false)}
                    context={{ activeTab, drafts, sentProtocols }}
                    pageTitle="مساعد البروتوكولات"
                    suggestions={[
                        { label: 'تحليل البروتوكول', prompt: 'راجع آخر بروتوكول واستخرج أهم القرارات', icon: '🔍' },
                        { label: 'صياغة توصيات', prompt: 'اقترح توصيات إضافية بناءً على المحتوى', icon: '💡' }
                    ]}
                />
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-white rounded-2xl p-2 shadow-lg">
                <button
                    onClick={() => setActiveTab('new')}
                    className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all ${activeTab === 'new'
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg scale-105'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    📝 بروتوكول جديد
                </button>
                <button
                    onClick={() => setActiveTab('drafts')}
                    className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all relative ${activeTab === 'drafts'
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg scale-105'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    💾 المسودات
                    {drafts.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {drafts.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('archive')}
                    className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all relative ${activeTab === 'archive'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-105'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    📚 الأرشيف
                    {sentProtocols.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {sentProtocols.length}
                        </span>
                    )}
                </button>
            </div>

            {/* New Protocol Tab */}
            {activeTab === 'new' && (
                <NewProtocolForm
                    protocol={newProtocol}
                    setProtocol={setNewProtocol}
                    onSaveDraft={saveDraft}
                    onSend={() => sendProtocol()}
                />
            )}

            {/* Drafts Tab */}
            {activeTab === 'drafts' && (
                <DraftsSection
                    drafts={drafts}
                    loading={loadingDrafts}
                    onDelete={deleteDraft}
                    onEdit={loadDraftToEditor}
                    onSend={sendProtocol}
                />
            )}

            {/* Archive Tab */}
            {activeTab === 'archive' && (
                <ArchiveSection
                    protocols={filteredProtocols}
                    loading={loadingArchive}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filterDate={filterDate}
                    setFilterDate={setFilterDate}
                />
            )}
        </div>
    );
}

// New Protocol Form Component
function NewProtocolForm({ protocol, setProtocol, onSaveDraft, onSend }: any) {
    return (
        <div className="glass-panel p-8">
            <h2 className="text-2xl font-bold text-purple-700 mb-6">بروتوكول جديد</h2>

            <div className="grid grid-cols-3 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">رقم البروتوكول</label>
                    <input
                        type="number"
                        value={protocol.number}
                        onChange={e => setProtocol({ ...protocol, number: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-200 font-bold text-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">التاريخ</label>
                    <input
                        type="date"
                        value={protocol.date}
                        onChange={e => setProtocol({ ...protocol, date: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-200 font-medium text-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">المشاركون</label>
                    <input
                        type="text"
                        value={protocol.participants}
                        onChange={e => setProtocol({ ...protocol, participants: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-200 font-medium text-lg"
                        placeholder="أسماء المشاركين..."
                    />
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-bold mb-2 text-gray-700">موضوع الجلسة</label>
                <input
                    type="text"
                    value={protocol.subject}
                    onChange={e => setProtocol({ ...protocol, subject: e.target.value })}
                    className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-200 font-bold text-xl"
                    placeholder="الموضوع الرئيسي للجلسة..."
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm font-bold mb-2 text-gray-700">محتوى البروتوكول</label>
                <textarea
                    value={protocol.content}
                    onChange={e => setProtocol({ ...protocol, content: e.target.value })}
                    className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl h-64 resize-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 font-medium text-lg"
                    placeholder="ملخص الجلسة، القرارات، التوصيات، الخطوات التالية..."
                />
            </div>

            <div className="flex gap-4">
                <button
                    onClick={onSaveDraft}
                    className="flex-1 btn bg-blue-500 hover:bg-blue-600 text-white py-4 flex items-center justify-center gap-2"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                    </svg>
                    حفظ كمسودة
                </button>
                <button
                    onClick={onSend}
                    className="flex-1 btn bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white py-4 flex items-center justify-center gap-2"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    إرسال للمدير
                </button>
            </div>
        </div>
    );
}

// Drafts Section Component
function DraftsSection({ drafts, loading, onDelete, onEdit, onSend }: any) {
    if (loading) {
        return <div className="glass-panel p-20 text-center"><div className="text-2xl">⏳ جاري التحميل...</div></div>;
    }

    if (drafts.length === 0) {
        return (
            <div className="glass-panel p-20 text-center">
                <div className="text-6xl mb-4">💾</div>
                <h3 className="text-2xl font-bold text-gray-400 mb-2">لا توجد مسودات محفوظة</h3>
                <p className="text-gray-500">ابدأ بإنشاء بروتوكول جديد واحفظه كمسودة</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">المسودات المحفوظة ({drafts.length})</h2>
            </div>

            {drafts.map((draft: Protocol) => (
                <div key={draft.id} className="glass-panel p-6 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold text-sm">
                                    #{draft.number}
                                </span>
                                <span className="text-gray-500 text-sm">{draft.date}</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{draft.subject || 'بدون عنوان'}</h3>
                            <p className="text-gray-600 mb-2">المشاركون: {draft.participants || '-'}</p>
                            <p className="text-gray-500 text-sm line-clamp-2">{draft.content}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onEdit(draft)}
                                className="btn btn-sm bg-purple-100 text-purple-700 hover:bg-purple-200"
                            >
                                ✏️ تعديل
                            </button>
                            <button
                                onClick={() => onSend(draft)}
                                className="btn btn-sm bg-green-100 text-green-700 hover:bg-green-200"
                            >
                                ✉️ إرسال
                            </button>
                            <button
                                onClick={() => onDelete(draft.id)}
                                className="btn btn-sm bg-red-100 text-red-700 hover:bg-red-200"
                            >
                                🗑️ حذف
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Archive Section Component
function ArchiveSection({ protocols, loading, searchQuery, setSearchQuery, filterDate, setFilterDate }: any) {
    if (loading) {
        return <div className="glass-panel p-20 text-center"><div className="text-2xl">⏳ جاري التحميل...</div></div>;
    }

    return (
        <div>
            {/* Search & Filter */}
            <div className="glass-panel p-6 mb-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">البحث</label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500"
                            placeholder="ابحث في الموضوع أو المشاركين..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">فلترة حسب التاريخ</label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500"
                        />
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="glass-panel p-6 mb-6 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-4">
                    <div className="text-5xl">📊</div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">إجمالي البروتوكولات المرسلة</h3>
                        <p className="text-4xl font-black text-green-600">{protocols.length}</p>
                    </div>
                </div>
            </div>

            {/* Protocols List */}
            {protocols.length === 0 ? (
                <div className="glass-panel p-20 text-center">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-2xl font-bold text-gray-400 mb-2">لا توجد بروتوكولات مرسلة</h3>
                    <p className="text-gray-500">ستظهر هنا جميع البروتوكولات المرسلة للمدير</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {protocols.map((protocol: SentProtocol) => (
                        <div key={protocol.id} className="glass-panel p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-sm">
                                            #{protocol.number}
                                        </span>
                                        <span className="text-gray-500 text-sm">{protocol.date}</span>
                                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">
                                            ✉️ مرسل
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">{protocol.subject}</h3>
                                    <p className="text-gray-600 mb-2">المشاركون: {protocol.participants}</p>
                                    <p className="text-gray-500 text-sm line-clamp-3">{protocol.content}</p>
                                    <div className="mt-3 text-xs text-gray-400">
                                        أرسل بواسطة: {protocol.sentBy} • {protocol.sentAt ? new Date(protocol.sentAt.toDate()).toLocaleString('ar-EG') : '-'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.print()}
                                    className="btn btn-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                                >
                                    🖨️ طباعة
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
