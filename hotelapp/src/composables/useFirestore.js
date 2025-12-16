import { ref } from "vue";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

export const useFirestore = (collectionName) => {
  const error = ref(null);
  const isPending = ref(false);

  // Agregar documento
  const addDocument = async (data) => {
    error.value = null;
    isPending.value = true;

    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return docRef;
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo agregar el documento";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Obtener todos los documentos
  const getDocuments = async () => {
    error.value = null;
    isPending.value = true;

    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const documents = [];
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      return documents;
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudieron obtener los documentos";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Obtener documento por ID
  const getDocument = async (id, options = {}) => {
    const { silentNotFound = false } = options;
    error.value = null;
    isPending.value = true;

    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        if (silentNotFound) return null;
        throw new Error("Documento no encontrado");
      }
    } catch (err) {
      if (silentNotFound && err.message === "Documento no encontrado") {
        return null;
      }
      console.error(err.message);
      error.value = "No se pudo obtener el documento";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Crear o actualizar documento con ID específico
  const setDocument = async (documentId, data) => {
    error.value = null;
    isPending.value = true;

    try {
      const docRef = doc(db, collectionName, documentId);
      const docData = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, docData, { merge: true });
      console.log(`✅ Documento ${documentId} guardado en ${collectionName}`);
      return { id: documentId };
    } catch (err) {
      console.error("Error al guardar documento:", err);
      error.value = err.message;
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Actualizar documento
  const updateDocument = async (id, data) => {
    error.value = null;
    isPending.value = true;

    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo actualizar el documento";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Eliminar documento
  const deleteDocument = async (id) => {
    error.value = null;
    isPending.value = true;

    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo eliminar el documento";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Consulta con filtros
  const queryDocuments = async (filters = []) => {
    error.value = null;
    isPending.value = true;

    try {
      let q = collection(db, collectionName);

      if (filters.length > 0) {
        const constraints = filters.map((filter) => {
          if (filter.type === "where") {
            return where(filter.field, filter.operator, filter.value);
          } else if (filter.type === "orderBy") {
            return orderBy(filter.field, filter.direction || "asc");
          }
        });
        q = query(q, ...constraints);
      }

      const querySnapshot = await getDocs(q);
      const documents = [];
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      return documents;
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo realizar la consulta";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  return {
    error,
    isPending,
    addDocument,
    getDocuments,
    getDocument,
    updateDocument,
    deleteDocument,
    setDocument,
    queryDocuments,
  };
};
