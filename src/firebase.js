// FILE: src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA2PwpvEvWIaOqc-QgPwCEQAJWIssLHEvY",
  authDomain: "jumpers-bea06.firebaseapp.com",
  projectId: "jumpers-bea06",
  storageBucket: "jumpers-bea06.firebasestorage.app",
  messagingSenderId: "874804375064",
  appId: "1:874804375064:web:ed1927c9ed89debdfd9d6d",
  measurementId: "G-B2R4P6T3YW",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
