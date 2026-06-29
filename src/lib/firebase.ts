import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuration from our provisioned firebase-applet-config.json
const firebaseConfig = {
  projectId: "gen-lang-client-0457020333",
  appId: "1:102976689665:web:050ecf0fca17d9f15ad200",
  apiKey: "AIzaSyDIVWJE4gueYiyqTv95xBjXGTBVYz6jHRc",
  authDomain: "gen-lang-client-0457020333.firebaseapp.com",
  storageBucket: "gen-lang-client-0457020333.firebasestorage.app",
  messagingSenderId: "102976689665"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID from our config
export const db = getFirestore(app, "ai-studio-forgelink-2c9362fa-827c-4025-943a-b504e2255c00");

// Initialize Auth
export const auth = getAuth(app);

export default app;
