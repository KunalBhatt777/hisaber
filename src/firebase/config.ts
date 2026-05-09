import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// @ts-ignore — firebase/auth RN build exports these at runtime via Metro resolver
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBzu7NGzvn3RY4gqqhtjM2Y7mA2ZYFDqy8",
  authDomain: "centsible-e1115.firebaseapp.com",
  projectId: "centsible-e1115",
  storageBucket: "centsible-e1115.firebasestorage.app",
  messagingSenderId: "68897381471",
  appId: "1:68897381471:web:6cc020274d0be86897cfea"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
