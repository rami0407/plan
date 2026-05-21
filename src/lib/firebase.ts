'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: "AIzaSyCMCXiCaiwRrZ6ms_337MZAXstGeow-2hE",
    authDomain: "gen-lang-client-0576446793.firebaseapp.com",
    projectId: "gen-lang-client-0576446793",
    storageBucket: "gen-lang-client-0576446793.firebasestorage.app",
    messagingSenderId: "341882667122",
    appId: "1:341882667122:web:9558ee8db16e3d3b5c42eb",
    measurementId: "G-26FCGHGJ9B"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Analytics - only in browser
let analytics: any = null;
if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
        if (supported) {
            try {
                analytics = getAnalytics(app);
            } catch (err) {
                console.warn('Firebase Analytics initialization failed:', err);
            }
        }
    }).catch((err) => {
        console.warn('Firebase Analytics is not supported in this environment:', err);
    });
}

export { app, db, auth, analytics };
