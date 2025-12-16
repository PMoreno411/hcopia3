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
} from "firebase/firestore";
import { db } from "../firebase/config";

export const useHabitaciones = () => {
  const error = ref(null);
  const isPending = ref(false);

  // Agregar habitación
  const addHabitacion = async (hotelId, habitacionData) => {
    error.value = null;
    isPending.value = true;

    try {
      const docRef = await addDoc(collection(db, "habitaciones"), {
        ...habitacionData,
        hotelId,
        createdAt: serverTimestamp(),
      });
      return docRef;
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo agregar la habitación";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Obtener habitaciones de un hotel
  const getHabitacionesByHotel = async (hotelId) => {
    error.value = null;
    isPending.value = true;

    try {
      const q = query(
        collection(db, "habitaciones"),
        where("hotelId", "==", hotelId),
        orderBy("precioCop", "asc")
      );
      const querySnapshot = await getDocs(q);
      const habitaciones = [];
      querySnapshot.forEach((doc) => {
        habitaciones.push({ id: doc.id, ...doc.data() });
      });
      return habitaciones;
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudieron obtener las habitaciones";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Obtener habitación por ID
  const getHabitacion = async (id) => {
    error.value = null;
    isPending.value = true;

    try {
      const docRef = doc(db, "habitaciones", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error("Habitación no encontrada");
      }
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo obtener la habitación";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Actualizar habitación
  const updateHabitacion = async (id, data) => {
    error.value = null;
    isPending.value = true;

    try {
      const docRef = doc(db, "habitaciones", id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo actualizar la habitación";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Eliminar habitación
  const deleteHabitacion = async (id) => {
    error.value = null;
    isPending.value = true;

    try {
      const docRef = doc(db, "habitaciones", id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo eliminar la habitación";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  return {
    error,
    isPending,
    addHabitacion,
    getHabitacionesByHotel,
    getHabitacion,
    updateHabitacion,
    deleteHabitacion,
  };
};
