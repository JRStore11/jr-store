import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyA0JIcjka1zCRZfv3o4eoi2xXMtCEi6Vs",
  authDomain: "jr-store-1461b.firebaseapp.com",
  databaseURL: "https://jr-store-1461b-default-rtdb.firebaseio.com",
  projectId: "jr-store-1461b",
  storageBucket: "jr-store-1461b.firebasestorage.app",
  messagingSenderId: "16243031965",
  appId: "1:16243031965:web:29ac1d3629eef8ee21b974"
}

const app = initializeApp(firebaseConfig)

export const database = getDatabase(app)

export default app