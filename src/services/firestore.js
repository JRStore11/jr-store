import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import app from '../lib/firebase'

const db = getFirestore(app)

export async function getProducts() {
  const snapshot = await getDocs(collection(db, 'products'))
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }))
}

export async function addProduct(product) {
  return await addDoc(collection(db, 'products'), product)
}

export async function updateProduct(id, data) {
  return await updateDoc(doc(db, 'products', id), data)
}

export async function deleteProduct(id) {
  return await deleteDoc(doc(db, 'products', id))
}

export async function getOrders() {
  const snapshot = await getDocs(collection(db, 'orders'))
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }))
}

export async function addOrder(order) {
  return await addDoc(collection(db, 'orders'), order)
}