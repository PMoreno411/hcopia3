import { ref, computed } from "vue";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase/config";
import { ADMIN_EMAILS } from "../firebase/config";

const user = ref(null);
const error = ref(null);
const isPending = ref(false);

// Observador de estado de autenticación
onAuthStateChanged(auth, (currentUser) => {
  user.value = currentUser;
});

export const useAuth = () => {
  // Registro con email y password
  const signup = async (email, password, displayName) => {
    error.value = null;
    isPending.value = true;

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      if (!res) {
        throw new Error("No se pudo completar el registro");
      }

      // Actualizar nombre de usuario
      await updateProfile(res.user, { displayName });
      user.value = res.user;

      return res;
    } catch (err) {
      console.error(err.message);
      error.value = "Error al registrar usuario: " + err.message;
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Login con email y password
  const login = async (email, password) => {
    error.value = null;
    isPending.value = true;

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      user.value = res.user;
      return res;
    } catch (err) {
      console.error(err.message);
      error.value = "Error al iniciar sesión: " + err.message;
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Login con Google
  const loginWithGoogle = async () => {
    error.value = null;
    isPending.value = true;

    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      user.value = res.user;
      return res;
    } catch (err) {
      console.error(err.message);
      error.value = "Error al iniciar sesión con Google: " + err.message;
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Cerrar sesión
  const logout = async () => {
    error.value = null;
    isPending.value = true;

    try {
      await signOut(auth);
      user.value = null;
    } catch (err) {
      console.error(err.message);
      error.value = "Error al cerrar sesión: " + err.message;
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  const isAdmin = computed(() => {
    return user.value && ADMIN_EMAILS.includes(user.value.email);
  });

  return {
    user,
    error,
    isPending,
    isAdmin,
    signup,
    login,
    loginWithGoogle,
    logout,
  };
};
