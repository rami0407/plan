'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function generateAIResponse(message: string, context: string) {
    if (!apiKey) {
        return {
            success: false,
            error: 'API key is missing. Please add NEXT_PUBLIC_GEMINI_API_KEY to your environment variables.'
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const prompt = `
        أنت مساعد تربوي ذكي وودود يعمل ضمن نظام إدارة المدارس.
        السياق الحالي للمستخدم هو: ${context}
        
        سؤال المستخدم: ${message}
        
        أجب باللغة العربية بأسلوب مهني ومشجع. كن مختصراً ومباشراً.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return { success: true, text };
    } catch (error) {
        console.error('Gemini API Error:', error);
        return { success: false, error: 'Failed to generate response.' };
    }
}
