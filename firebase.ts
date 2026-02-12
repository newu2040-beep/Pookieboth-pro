
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ------------------------------------------------------------------
// ⚠️ ACTION REQUIRED: 
// Replace the values below with your Firebase project configuration.
// Get this from: https://console.firebase.google.com/ > Project Settings
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Logic to prevent crash if keys aren't set yet
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

let app;
let auth;
let db;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn("Firebase not configured. Please edit firebase.ts with your credentials.");
}

export { auth, db, isConfigured };
