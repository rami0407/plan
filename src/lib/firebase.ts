'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

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
let analytics;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}

export { app, db, auth, analytics };
