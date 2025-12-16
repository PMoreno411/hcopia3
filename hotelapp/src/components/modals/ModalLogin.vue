<script setup>
import { ref } from "vue";
import { useAuth } from "../../composables/useAuth";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "login-exitoso"]);

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
  if (!formulario.value.email || !formulario.value.password) {
    mensajeError.value = "Por favor completa todos los campos";
    return;
  }

  try {
    mensajeError.value = "";
    await login(formulario.value.email, formulario.value.password);
    emit("login-exitoso");
  } catch (err) {
    mensajeError.value = error.value || "Error al iniciar sesión";
  }
};

const registrarUsuario = async () => {
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
    emit("login-exitoso");
  } catch (err) {
    mensajeError.value = error.value || "Error al registrar usuario";
  }
};

const loginGoogle = async () => {
  try {
    mensajeError.value = "";
    await loginWithGoogle();
    emit("login-exitoso");
  } catch (err) {
    mensajeError.value = error.value || "Error al iniciar sesión con Google";
  }
};

const cerrarModal = () => {
  formulario.value = { email: "", password: "" };
  formularioRegistro.value = {
    nombre: "",
    email: "",
    password: "",
    confirmarPassword: "",
  };
  mensajeError.value = "";
  esRegistro.value = false;
  emit("close");
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="modal fade show d-block"
      tabindex="-1"
      style="background-color: rgba(0, 0, 0, 0.5)"
      @click.self="cerrarModal"
    >
      <div class="modal-dialog modal-dialog-centered custom-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-box-arrow-in-right me-2"></i>
              {{ esRegistro ? "Crear Cuenta" : "Iniciar Sesión" }}
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="cerrarModal"
            ></button>
          </div>
          <div class="modal-body">
            <!-- Mensaje de error -->
            <div v-if="mensajeError" class="alert alert-danger" role="alert">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {{ mensajeError }}
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

              <button
                type="submit"
                class="btn-modal-primary w-100 mb-3"
                :disabled="isPending"
              >
                <span
                  v-if="isPending"
                  class="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                <i v-else class="bi bi-box-arrow-in-right me-2"></i>
                {{ isPending ? "Iniciando..." : "Iniciar Sesión" }}
              </button>

              <div class="text-center mb-3">
                <span class="divider-text">o</span>
              </div>

              <button
                type="button"
                class="btn-modal-google w-100 mb-3"
                @click="loginGoogle"
                :disabled="isPending"
              >
                <i class="bi bi-google me-2"></i>
                Continuar con Google
              </button>
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
                class="btn-modal-primary w-100 mb-3"
                :disabled="isPending"
              >
                <span
                  v-if="isPending"
                  class="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                <i v-else class="bi bi-person-plus me-2"></i>
                {{ isPending ? "Registrando..." : "Crear Cuenta" }}
              </button>

              <div class="text-center mb-3">
                <span class="divider-text">o</span>
              </div>

              <button
                type="button"
                class="btn-modal-google w-100"
                @click="loginGoogle"
                :disabled="isPending"
              >
                <i class="bi bi-google me-2"></i>
                Registrarse con Google
              </button>
            </form>

            <!-- Toggle entre Login y Registro -->
            <hr class="my-4" />
            <div class="text-center">
              <p class="mb-0 toggle-text">
                {{ esRegistro ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?" }}
                <a
                  href="#"
                  class="toggle-link"
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
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal.show {
  display: block;
}

.custom-modal {
  max-width: 480px;
}

.modal-content {
  border: none;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  border-bottom: 1px solid #f0f0f0;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  border-radius: 20px 20px 0 0;
}

.modal-title {
  color: #2d3561;
  font-weight: 700;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
}

.modal-title i {
  color: #667eea;
}

.modal-body {
  padding: 2rem;
}

.modal-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.modal-icon i {
  font-size: 2.5rem;
  color: #fff;
}

.modal-subtitle {
  color: #999;
  margin: 0;
  font-size: 0.95rem;
}

.btn-modal-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 0.875rem;
  border-radius: 50px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-modal-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-modal-google {
  background: #fff;
  color: #666;
  border: 2px solid #e0e0e0;
  padding: 0.875rem;
  border-radius: 50px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-modal-google:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #667eea;
  color: #667eea;
  transform: translateY(-2px);
}

.divider-text {
  color: #999;
  font-size: 0.9rem;
  font-weight: 500;
}

.toggle-text {
  color: #666;
  font-size: 0.95rem;
}

.toggle-link {
  color: #667eea;
  font-weight: 700;
  text-decoration: none;
  margin-left: 0.25rem;
}

.toggle-link:hover {
  color: #764ba2;
  text-decoration: underline;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
  border-width: 0.15em;
  border-color: currentColor;
  border-right-color: transparent;
  animation: spinner-border 0.75s linear infinite;
}

@keyframes spinner-border {
  to {
    transform: rotate(360deg);
  }
}
</style>
