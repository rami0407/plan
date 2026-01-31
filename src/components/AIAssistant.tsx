'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Suggestion {
    label: string;
    prompt: string;
    icon: string;
}

interface AIAssistantProps {
    onClose: () => void;
    context: any;
    pageTitle: string;
    suggestions?: Suggestion[];
}

export default function AIAssistant({ onClose, context, pageTitle, suggestions = [] }: AIAssistantProps) {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant' | 'system'; content: string }[]>([
        { role: 'system', content: `أنت مساعد تربوي ذكي متخصص في دعم المعلمين والمدراء. أنت تعمل في سياق ${pageTitle}.` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (content: string = input) => {
        if (!content.trim() || isLoading) return;

        const userMessage = { role: 'user' as const, content };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Here you would normally call your AI service (Gemini/Groq)
            // For now, we simulate a response based on the context
            setTimeout(() => {
                const aiResponse = {
                    role: 'assistant' as const,
                    content: `بناءً على البيانات المتوفرة في ${pageTitle}، أرى أن هناك نقاطاً هامة يجب الانتباه إليها. كيف يمكنني مساعدتك أكثر في تحليل هذه المعلومات؟`
                };
                setMessages(prev => [...prev, aiResponse]);
                setIsLoading(false);
            }, 1000);
        } catch (error) {
            console.error('AI Error:', error);
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl z-[100] border-l border-gray-100 flex flex-col"
            dir="rtl"
        >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                        <span className="text-2xl">✨</span>
                    </div>
                    <div>
                        <h2 className="font-black text-lg leading-tight">{pageTitle}</h2>
                        <p className="text-xs text-white/70 font-medium">المساعد التربوي الذكي</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                <AnimatePresence>
                    {messages.filter(m => m.role !== 'system').map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                        >
                            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${m.role === 'assistant'
                                    ? 'bg-white border border-gray-100 text-gray-800'
                                    : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-100'
                                }`}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-100 p-4 rounded-2xl flex gap-1">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && messages.length < 3 && (
                <div className="px-6 py-4 bg-white border-t border-gray-50">
                    <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">اقتراحات سريعة</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(s.prompt)}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center gap-2 group shadow-sm"
                            >
                                <span>{s.icon}</span>
                                <span className="font-medium group-hover:text-indigo-600">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <div className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="اسأل المساعد الذكي..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm font-medium"
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={isLoading || !input.trim()}
                        className="absolute left-2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-lg active:scale-95"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13"></path><path d="M22 2L15 22L11 13L2 9L22 2Z"></path></svg>
                    </button>
                </div>
                <p className="text-[10px] text-center text-gray-400 mt-4 font-medium">مدعوم بتقنية الذكاء الاصطناعي لدعم العملية التربوية</p>
            </div>
        </motion.div>
    );
}
