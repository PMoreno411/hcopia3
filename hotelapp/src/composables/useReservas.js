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

export const useReservas = () => {
  const error = ref(null);
  const isPending = ref(false);

  // Crear reserva
  const addReserva = async (reservaData) => {
    error.value = null;
    isPending.value = true;

    try {
      const docRef = await addDoc(collection(db, "reservas"), {
        ...reservaData,
        estado: "pendiente",
        createdAt: serverTimestamp(),
      });
      return docRef;
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo crear la reserva";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Obtener reservas de un usuario
  const getReservasByUser = async (userId) => {
    error.value = null;
    isPending.value = true;

    try {
      const q = query(
        collection(db, "reservas"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const reservas = [];
      querySnapshot.forEach((doc) => {
        reservas.push({ id: doc.id, ...doc.data() });
      });
      return reservas;
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudieron obtener las reservas";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Obtener reservas de un hotel
  const getReservasByHotel = async (hotelId) => {
    error.value = null;
    isPending.value = true;

    try {
      const q = query(
        collection(db, "reservas"),
        where("hotelId", "==", hotelId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const reservas = [];
      querySnapshot.forEach((doc) => {
        reservas.push({ id: doc.id, ...doc.data() });
      });
      return reservas;
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudieron obtener las reservas";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Obtener reservas de una habitación en rango de fechas
  const getReservasByHabitacionYFechas = async (
    habitacionId,
    checkIn,
    checkOut
  ) => {
    error.value = null;
    isPending.value = true;

    try {
      const q = query(
        collection(db, "reservas"),
        where("habitacionId", "==", habitacionId),
        where("estado", "in", ["pendiente", "confirmada"])
      );
      const querySnapshot = await getDocs(q);
      const reservas = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const reservaCheckIn = new Date(data.checkIn);
        const reservaCheckOut = new Date(data.checkOut);
        const nuevaCheckIn = new Date(checkIn);
        const nuevaCheckOut = new Date(checkOut);

        // Verificar si hay solapamiento de fechas
        const haySolapamiento =
          (nuevaCheckIn >= reservaCheckIn && nuevaCheckIn < reservaCheckOut) ||
          (nuevaCheckOut > reservaCheckIn &&
            nuevaCheckOut <= reservaCheckOut) ||
          (nuevaCheckIn <= reservaCheckIn && nuevaCheckOut >= reservaCheckOut);

        if (haySolapamiento) {
          reservas.push({ id: doc.id, ...data });
        }
      });

      return reservas;
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudieron verificar las fechas";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Confirmar reserva (admin/dueño)
  const confirmarReserva = async (reservaId, habitacionId) => {
    error.value = null;
    isPending.value = true;

    try {
      // Actualizar estado de la reserva
      await updateDoc(doc(db, "reservas", reservaId), {
        estado: "confirmada",
        confirmedAt: serverTimestamp(),
      });

      // Restar una habitación disponible
      const habitacionRef = doc(db, "habitaciones", habitacionId);
      const habitacionSnap = await getDoc(habitacionRef);

      if (habitacionSnap.exists()) {
        const disponiblesActuales = habitacionSnap.data().disponibles || 0;
        if (disponiblesActuales > 0) {
          await updateDoc(habitacionRef, {
            disponibles: disponiblesActuales - 1,
          });
        }
      }
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo confirmar la reserva";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Rechazar reserva
  const rechazarReserva = async (reservaId, motivo) => {
    error.value = null;
    isPending.value = true;

    try {
      await updateDoc(doc(db, "reservas", reservaId), {
        estado: "rechazada",
        motivoRechazo: motivo,
        rejectedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo rechazar la reserva";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Cancelar reserva (usuario)
  const cancelarReserva = async (reservaId, habitacionId, estado) => {
    error.value = null;
    isPending.value = true;

    try {
      // Si la reserva estaba confirmada, devolver la habitación disponible
      if (estado === "confirmada") {
        const habitacionRef = doc(db, "habitaciones", habitacionId);
        const habitacionSnap = await getDoc(habitacionRef);

        if (habitacionSnap.exists()) {
          const disponiblesActuales = habitacionSnap.data().disponibles || 0;
          await updateDoc(habitacionRef, {
            disponibles: disponiblesActuales + 1,
          });
        }
      }

      // Marcar como cancelada
      await updateDoc(doc(db, "reservas", reservaId), {
        estado: "cancelada",
        canceledAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo cancelar la reserva";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Marcar huésped como checked-in (llegó al hotel)
  const checkInReserva = async (reservaId) => {
    error.value = null;
    isPending.value = true;

    try {
      await updateDoc(doc(db, "reservas", reservaId), {
        estado: "ocupada",
        checkedInAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo registrar el check-in";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Marcar huésped como checked-out (se fue del hotel)
  const checkOutReserva = async (reservaId, habitacionId) => {
    error.value = null;
    isPending.value = true;

    try {
      // Devolver habitación disponible
      const habitacionRef = doc(db, "habitaciones", habitacionId);
      const habitacionSnap = await getDoc(habitacionRef);

      if (habitacionSnap.exists()) {
        const disponiblesActuales = habitacionSnap.data().disponibles || 0;
        await updateDoc(habitacionRef, {
          disponibles: disponiblesActuales + 1,
        });
      }

      // Marcar como completada
      await updateDoc(doc(db, "reservas", reservaId), {
        estado: "completada",
        checkedOutAt: serverTimestamp(),
        completedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo registrar el check-out";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Completar reserva (marcar como completada después del checkout)
  const completarReserva = async (reservaId) => {
    error.value = null;
    isPending.value = true;

    try {
      await updateDoc(doc(db, "reservas", reservaId), {
        estado: "completada",
        completedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo completar la reserva";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Eliminación manual de reservas
  const eliminarReserva = async (reservaId, habitacionId, estado) => {
    error.value = null;
    isPending.value = true;
    try {
      // Si sigue ocupando stock (confirmada u ocupada), devolver disponibilidad
      if (["confirmada", "ocupada"].includes(estado) && habitacionId) {
        const habitacionRef = doc(db, "habitaciones", habitacionId);
        const habitacionSnap = await getDoc(habitacionRef);
        if (habitacionSnap.exists()) {
          const disponiblesActuales = habitacionSnap.data().disponibles || 0;
          await updateDoc(habitacionRef, { disponibles: disponiblesActuales + 1 });
        }
      }
      await deleteDoc(doc(db, "reservas", reservaId));
    } catch (err) {
      console.error(err.message);
      error.value = "No se pudo eliminar la reserva";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  return {
    error,
    isPending,
    addReserva,
    getReservasByUser,
    getReservasByHotel,
    getReservasByHabitacionYFechas,
    confirmarReserva,
    rechazarReserva,
    cancelarReserva,
    checkInReserva,
    checkOutReserva,
    completarReserva,
    eliminarReserva,
  };
};
