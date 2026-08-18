import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "ceduleconteneur",
  appId: "1:994024802847:web:0c9570a639a4cc4200e32a",
  apiKey: "AIzaSyD3Qn6qkPKwivL2WGhii85_Bhyak5feCiE",
  authDomain: "ceduleconteneur.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-cduledeconteneur-0ee61537-d3f9-4a8c-be59-3016d518f9dd",
  storageBucket: "ceduleconteneur.firebasestorage.app",
  messagingSenderId: "994024802847",
  measurementId: ""
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
  } else if (err.code == 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});
