import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC3kkbIxM87hKdOEM9Vst371udSi7IG17I",
  authDomain: "aigeo-fleet-chat.firebaseapp.com",
  projectId: "aigeo-fleet-chat",
  storageBucket: "aigeo-fleet-chat.firebasestorage.app",
  messagingSenderId: "666388121150",
  appId: "1:666388121150:web:5a146dffa7f687f013b36f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
