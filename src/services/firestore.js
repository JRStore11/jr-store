import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '../lib/firebase'

// =========================
// PRODUTOS
// =========================

export async function getProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'))

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.log(error)
    return []
  }
}

export async function addProduct(product) {
  try {
    await deleteDoc(doc(db, 'products', String(id)))

    return docRef.id
  } catch (error) {
    console.log(error)
    return null
  }
}

export async function deleteProduct(id) {
  try {
    const productId = String(id)

    await deleteDoc(doc(db, 'products', productId))

    return true
  } catch (error) {
    console.error('Erro ao excluir produto:', error)
    throw error
  }
}

export async function updateProduct(id, data) {
  try {
    await updateDoc(doc(db, 'products', id), data)
  } catch (error) {
    console.log(error)
  }
}

// =========================
// PEDIDOS
// =========================

export async function addOrder(order) {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      ...order,
      createdAt: serverTimestamp(),
    })

    return docRef.id
  } catch (error) {
    console.log(error)
    return null
  }
}

export async function getOrders() {
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'))

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.log(error)
    return []
  }
}

export async function updateOrderStatus(id, status) {
  try {
    await updateDoc(doc(db, 'orders', id), {
      status,
    })
  } catch (error) {
    console.log(error)
  }
}