import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { database } from '../lib/firebase'

// =========================
// PRODUTOS
// =========================

export async function getProducts() {
  try {
    const querySnapshot = await getDocs(collection(database, 'products'))

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
    const docRef = await addDoc(collection(database, 'products'), product)

    return docRef.id
  } catch (error) {
    console.log(error)
    return null
  }
}

export async function deleteProduct(id) {
  try {
    await deleteDoc(doc(database, 'products', id))
  } catch (error) {
    console.log(error)
  }
}

export async function updateProduct(id, data) {
  try {
    await updateDoc(doc(database, 'products', id), data)
  } catch (error) {
    console.log(error)
  }
}

// =========================
// PEDIDOS
// =========================

export async function addOrder(order) {
  try {
    const docRef = await addDoc(collection(database, 'orders'), {
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
    const querySnapshot = await getDocs(collection(database, 'orders'))

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
    await updateDoc(doc(database, 'orders', id), {
      status,
    })
  } catch (error) {
    console.log(error)
  }
}