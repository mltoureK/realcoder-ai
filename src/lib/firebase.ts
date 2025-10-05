import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBl_h4ZqtE_gc9b1g6dA5lnSfWFn9O94c",
  authDomain: "realcoder-ai.firebaseapp.com",
  projectId: "realcoder-ai",
  storageBucket: "realcoder-ai.firebasestorage.app",
  messagingSenderId: "288006974673",
  appId: "1:288006974673:web:7e21aea71bb5cc29ece9f0",
  measurementId: "G-SDZL6DXXS7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (optional - only works in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;