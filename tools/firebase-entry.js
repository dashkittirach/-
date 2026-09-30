// Only the Firebase pieces Harvest Ledger uses: Google sign-in + Firestore Lite (no realtime listeners needed).
export { initializeApp } from 'firebase/app';
export { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential, onAuthStateChanged, signOut, connectAuthEmulator } from 'firebase/auth';
export { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, deleteDoc, collection, getDocs, addDoc, query, orderBy, limit, serverTimestamp, runTransaction, writeBatch } from 'firebase/firestore/lite';
