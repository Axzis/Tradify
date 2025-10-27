import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBpjPjQ2QP_LwAPEyReXoI1rAqk92pDyXA',
  authDomain: 'tradify-159c7.firebaseapp.com',
  projectId: 'tradify-159c7',
  storageBucket: 'tradify-159c7.appspot.com',
  messagingSenderId: '967477586569',
  appId: '1:967477586569:web:616b658002db9edea1f458',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);

export { app, auth, firestore };
