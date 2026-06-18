import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

const COLLECTION = 'products';

/**
 * Obtiene todos los productos de Firestore.
 * @returns {Promise<Array>} Lista de productos.
 */
export const getAllProducts = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Obtiene un producto por su ID.
 * @param {string} id - ID del documento en Firestore.
 * @returns {Promise<Object|null>} Producto encontrado o null.
 */
export const getProductById = async (id) => {
  const docRef  = doc(db, COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
};

/**
 * Busca un producto por su nombre en Firestore.
 * @param {string} name - Nombre exacto del producto.
 * @returns {Promise<Object|null>} Producto encontrado o null.
 */
export const getProductByName = async (name) => {
  const q = query(collection(db, COLLECTION), where('name', '==', name));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() };
};

/**
 * Crea un nuevo producto en Firestore.
 * @param {Object} data - Datos del producto.
 * @returns {Promise<Object>} Producto creado con su ID asignado.
 */
export const createProduct = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTION), data);
  return { id: docRef.id, ...data };
};

/**
 * Actualiza los campos de un producto en Firestore.
 * Solo actualiza los campos provistos (partial update).
 * @param {string} id - ID del documento a actualizar.
 * @param {Object} data - Campos a actualizar.
 * @returns {Promise<Object>} Producto actualizado.
 */
export const updateProduct = async (id, data) => {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, data);
  const snapshot = await getDoc(docRef);
  return { id: snapshot.id, ...snapshot.data() };
};

/**
 * Elimina un producto de Firestore por su ID.
 * @param {string} id - ID del documento a eliminar.
 * @returns {Promise<Object>} ID del producto eliminado.
 */
export const deleteProduct = async (id) => {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
  return { id };
};
