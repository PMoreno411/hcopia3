<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";

const props = defineProps({
  isModal: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["login-exitoso", "cancelar"]);

const router = useRouter();
const { signup, login, loginWithGoogle, error, isPending } = useAuth();

const formulario = ref({
  email: "",
  password: "",
});

const esRegistro = ref(false);
const formularioRegistro = ref({
  nombre: "",
  email: "",
  password: "",
  confirmarPassword: "",
});

const mensajeError = ref("");

const iniciarSesion = async () => {
  // Validación básica
  if (!formulario.value.email || !formulario.value.password) {
    mensajeError.value = "Por favor completa todos los campos";
    return;
  }

  try {
    mensajeError.value = "";
    await login(formulario.value.email, formulario.value.password);

    if (props.isModal) {
      emit("login-exitoso");
    } else {
      router.push("/dashboard");
    }
  } catch (err) {
    mensajeError.value = error.value || "Error al iniciar sesión";
  }
};

const registrarUsuario = async () => {
  // Validaciones
  if (
    formularioRegistro.value.password !==
    formularioRegistro.value.confirmarPassword
  ) {
    mensajeError.value = "Las contraseñas no coinciden";
    return;
  }

  if (formularioRegistro.value.password.length < 6) {
    mensajeError.value = "La contraseña debe tener al menos 6 caracteres";
    return;
  }

  try {
    mensajeError.value = "";
    await signup(
      formularioRegistro.value.email,
      formularioRegistro.value.password,
      formularioRegistro.value.nombre
    );

    if (props.isModal) {
      emit("login-exitoso");
    } else {
      router.push("/dashboard");
    }
  } catch (err) {
    mensajeError.value = error.value || "Error al registrar usuario";
  }
};

const loginGoogle = async () => {
  try {
    mensajeError.value = "";
    await loginWithGoogle();

    if (props.isModal) {
      emit("login-exitoso");
    } else {
      router.push("/dashboard");
    }
  } catch (err) {
    mensajeError.value = error.value || "Error al iniciar sesión con Google";
  }
};
</script>

<template>
  <div :class="{ 'row justify-content-center': !isModal }">
    <div :class="isModal ? '' : 'col-md-5'">
      <div :class="isModal ? '' : 'card shadow-lg'">
        <div :class="isModal ? '' : 'card-body p-5'">
          <!-- Logo/Título -->
          <div class="text-center mb-4">
            <i class="bi bi-building display-1 text-primary"></i>
            <h3 class="mt-3">
              {{ esRegistro ? "Crear Cuenta" : "Iniciar Sesión" }}
            </h3>
            <p class="text-muted">
              {{
                esRegistro
                  ? "Registra tu hotel hoy"
                  : "Panel de dueños de hoteles"
              }}
            </p>
          </div>

          <!-- Mensaje de error -->
          <div v-if="mensajeError" class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle"></i> {{ mensajeError }}
          </div>

          <!-- Formulario de Login -->
          <form v-if="!esRegistro" @submit.prevent="iniciarSesion">
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input
                v-model="formulario.email"
                type="email"
                class="form-control"
                placeholder="tu@email.com"
                required
                :disabled="isPending"
              />
            </div>

            <div class="mb-3">
              <label class="form-label">Contraseña</label>
              <input
                v-model="formulario.password"
                type="password"
                class="form-control"
                placeholder="••••••••"
                required
                :disabled="isPending"
              />
            </div>

            <div class="mb-3 form-check">
              <input type="checkbox" class="form-check-input" id="recordar" />
              <label class="form-check-label" for="recordar">
                Recordarme
              </label>
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100 mb-3"
              :disabled="isPending"
            >
              <span
                v-if="isPending"
                class="spinner-border spinner-border-sm me-2"
              ></span>
              <i v-else class="bi bi-box-arrow-in-right"></i>
              {{ isPending ? "Iniciando..." : "Iniciar Sesión" }}
            </button>

            <div class="text-center mb-3">
              <span class="text-muted">o</span>
            </div>

            <button
              type="button"
              class="btn btn-outline-danger w-100 mb-3"
              @click="loginGoogle"
              :disabled="isPending"
            >
              <i class="bi bi-google"></i> Continuar con Google
            </button>

            <div class="text-center">
              <a href="#" class="text-muted small">¿Olvidaste tu contraseña?</a>
            </div>
          </form>

          <!-- Formulario de Registro -->
          <form v-else @submit.prevent="registrarUsuario">
            <div class="mb-3">
              <label class="form-label">Nombre completo</label>
              <input
                v-model="formularioRegistro.nombre"
                type="text"
                class="form-control"
                placeholder="Juan Pérez"
                required
                :disabled="isPending"
              />
            </div>

            <div class="mb-3">
              <label class="form-label">Email</label>
              <input
                v-model="formularioRegistro.email"
                type="email"
                class="form-control"
                placeholder="tu@email.com"
                required
                :disabled="isPending"
              />
            </div>

            <div class="mb-3">
              <label class="form-label">Contraseña</label>
              <input
                v-model="formularioRegistro.password"
                type="password"
                class="form-control"
                placeholder="Mínimo 6 caracteres"
                required
                :disabled="isPending"
              />
            </div>

            <div class="mb-3">
              <label class="form-label">Confirmar contraseña</label>
              <input
                v-model="formularioRegistro.confirmarPassword"
                type="password"
                class="form-control"
                placeholder="Repite tu contraseña"
                required
                :disabled="isPending"
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100 mb-3"
              :disabled="isPending"
            >
              <span
                v-if="isPending"
                class="spinner-border spinner-border-sm me-2"
              ></span>
              <i v-else class="bi bi-person-plus"></i>
              {{ isPending ? "Registrando..." : "Crear Cuenta" }}
            </button>

            <div class="text-center mb-3">
              <span class="text-muted">o</span>
            </div>

            <button
              type="button"
              class="btn btn-outline-danger w-100"
              @click="loginGoogle"
              :disabled="isPending"
            >
              <i class="bi bi-google"></i> Registrarse con Google
            </button>
          </form>

          <!-- Toggle entre Login y Registro -->
          <hr class="my-4" />
          <div class="text-center">
            <p class="mb-0">
              {{ esRegistro ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?" }}
              <a
                href="#"
                class="text-primary fw-bold"
                @click.prevent="
                  esRegistro = !esRegistro;
                  mensajeError = '';
                "
              >
                {{ esRegistro ? "Iniciar Sesión" : "Regístrate aquí" }}
              </a>
            </p>
          </div>
        </div>
      </div>

      <!-- Info adicional - Solo si NO es modal -->
      <div v-if="!isModal" class="text-center mt-4">
        <router-link to="/" class="text-muted">
          <i class="bi bi-arrow-left"></i> Volver al inicio
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  border: none;
  border-radius: 15px;
}

.display-1 {
  font-size: 4rem;
}
</style>
