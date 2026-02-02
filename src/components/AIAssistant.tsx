'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Groq from 'groq-sdk';

interface Suggestion {
    label: string;
    prompt: string;
    icon: string;
}

interface AIAssistantProps {
    onClose: () => void;
    context: any;
    pageTitle?: string;
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
            let responseText = '';

            const prompt = `
            أنت مساعد تربوي ذكي وودود يعمل ضمن نظام إدارة المدارس.
            السياق الحالي هو: صفحة ${pageTitle || 'عام'}
            
            سؤال المستخدم: ${content}
            
            أجب باللغة العربية بأسلوب مهني ومشجع. كن مختصراً ومباشراً.
            `;

            // Use Groq AI only
            const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
            if (!apiKey) throw new Error('مفتاح Groq API مفقود.');

            const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'أنت مساعد تربوي ذكي تتحدث العربية.' },
                    { role: 'user', content: prompt }
                ],
                model: 'llama-3.3-70b-versatile',
            });
            responseText = completion.choices[0]?.message?.content || '';

            const aiResponse = {
                role: 'assistant' as const,
                content: responseText
            };
            setMessages(prev => [...prev, aiResponse]);

        } catch (error: any) {
            console.error('AI Error:', error);
            const errorMessage = error.message || 'عذراً، حدث خطأ أثناء الاتصال بالمساعد الذكي.';
            const errorResponse = {
                role: 'assistant' as const,
                content: `خطأ: ${errorMessage}`
            };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
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
            <div className="p-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                            <span className="text-2xl">✨</span>
                        </div>
                        <div>
                            <h2 className="font-black text-lg leading-tight">{pageTitle || 'المساعد الذكي'}</h2>
                            <p className="text-xs text-white/70 font-medium">المساعد التربوي الذكي</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Model Info - Groq Only */}
                <div className="flex bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-lg items-center justify-center gap-2">
                    <span className="text-sm font-bold text-white">🚀 Powered by Groq AI</span>
                </div>
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
                        placeholder="اسأل المساعد (Groq AI)..."
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
                <p className="text-[10px] text-center text-gray-400 mt-4 font-medium">مدعوم بـ Groq AI ⚡</p>
            </div>
        </motion.div>
    );
}
