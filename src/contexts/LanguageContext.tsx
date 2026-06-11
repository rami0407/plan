'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '@/lib/translations';

export type Language = 'ar' | 'he';

interface LanguageContextType {
    language: Language;
    toggleLanguage: () => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('ar');
    const [mounted, setMounted] = useState(false);

    // Load language from localStorage if available (client-side only)
    useEffect(() => {
        const savedLanguage = localStorage.getItem('language') as Language;
        if (savedLanguage === 'ar' || savedLanguage === 'he') {
            setLanguage(savedLanguage);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            document.documentElement.setAttribute('lang', language);
        }
    }, [language, mounted]);

    const toggleLanguage = () => {
        const nextLang = language === 'ar' ? 'he' : 'ar';
        setLanguage(nextLang);
        localStorage.setItem('language', nextLang);
    };

    const t = (key: string): string => {
        if (!key) return '';
        const trimmedKey = key.trim();
        const translation = translations[trimmedKey];
        if (translation) {
            return translation[language] || key;
        }
        return key;
    };

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
};
