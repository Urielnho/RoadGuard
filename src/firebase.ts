import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Expo replaces literal EXPO_PUBLIC_* references when bundling the app.
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured() {
  return Boolean(config.apiKey?.trim() && config.projectId?.trim() && config.appId?.trim());
}

// Lazy initialization lets the existing local app work before Firebase setup.
export function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    throw new Error('Falta configurar Firebase en .env: apiKey, projectId y appId son obligatorios.');
  }
  return getApps().some(app => app.name === '[DEFAULT]') ? getApp() : initializeApp(config);
}

export function getFirebaseDatabase() { return getFirestore(getFirebaseApp()); }
