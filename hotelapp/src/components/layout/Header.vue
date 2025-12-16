<script setup>
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuth } from "../../composables/useAuth";

const props = defineProps({
  onOpenLogin: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["logout"]);

const router = useRouter();
const route = useRoute();
const { user, logout, isAdmin } = useAuth();

const usuarioLogueado = computed(() => !!user.value);

const isActive = (path) => {
  if (path === "/") {
    return route.path === "/" || route.path.startsWith("/hotel/");
  }
  return route.path.startsWith(path);
};

const irADashboard = () => {
  router.push("/dashboard");
};

const irAInicio = () => {
  router.push("/");
};
</script>

<template>
  <header class="header-main">
    <nav class="navbar navbar-expand-lg navbar-dark">
      <div class="container">
        <!-- Logo/Brand -->
        <a @click="irAInicio" class="navbar-brand" role="button">
          <div class="brand-container">
            <i class="bi bi-building-fill brand-icon"></i>
            <div class="brand-text">
              <span class="brand-name">Mangelistt</span>
              <span class="brand-slogan">Tu destino perfecto</span>
            </div>
          </div>
        </a>

        <!-- Toggle button para mobile -->
        <button
          class="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarMain"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <!-- Navigation items -->
        <div class="collapse navbar-collapse" id="navbarMain">
          <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center gap-2">
            <!-- Hoteles -->
            <li class="nav-item">
              <router-link
                to="/"
                class="nav-link-custom"
                :class="{ active: isActive('/') || isActive('/hotel') }"
              >
                <i class="bi bi-house-door-fill"></i>
                <span>Hoteles</span>
              </router-link>
            </li>

            <!-- Magazine -->
            <li class="nav-item">
              <router-link
                to="/magazine"
                class="nav-link-custom"
                :class="{ active: isActive('/magazine') }"
              >
                <i class="bi bi-journal-text"></i>
                <span>Magazine</span>
              </router-link>
            </li>

            <!-- Si está logueado -->
            <template v-if="usuarioLogueado">
              <!-- Admin Panel (solo para admins) -->
              <li v-if="isAdmin" class="nav-item">
                <router-link
                  to="/admin"
                  class="nav-link-custom"
                  :class="{ active: isActive('/admin') }"
                >
                  <i class="bi bi-shield-lock-fill"></i>
                  <span>Admin</span>
                </router-link>
              </li>

              <!-- User info -->
              <li class="nav-item dropdown ms-lg-1">
                <a
                  class="nav-link dropdown-toggle user-dropdown"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                >
                  <div class="user-avatar">
                    <i class="bi bi-person-circle"></i>
                  </div>
                  <span class="user-name">
                    {{ user.displayName || user.email?.split("@")[0] }}
                  </span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li>
                    <router-link to="/dashboard" class="dropdown-item">
                      <i class="bi bi-speedometer2 me-2"></i>
                      Mi Panel
                    </router-link>
                  </li>
                  <li><hr class="dropdown-divider" /></li>
                  <li>
                    <a
                      class="dropdown-item text-danger"
                      @click="$emit('logout')"
                      role="button"
                    >
                      <i class="bi bi-box-arrow-right me-2"></i>
                      Cerrar Sesión
                    </a>
                  </li>
                </ul>
              </li>
            </template>

            <!-- Si NO está logueado -->
            <template v-else>
              <li class="nav-item ms-lg-1">
                <button
                  @click="onOpenLogin"
                  class="nav-link-custom btn-login-style"
                >
                  <i class="bi bi-box-arrow-in-right"></i>
                  <span>Iniciar Sesión</span>
                </button>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.header-main {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1), 0 2px 10px rgba(102, 126, 234, 0.2);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar {
  padding: 1rem 0;
}

/* Brand/Logo */
.navbar-brand {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.navbar-brand:hover {
  transform: translateY(-2px);
}

.brand-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  font-size: 2rem;
  color: #fff;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.5px;
}

.brand-slogan {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
}

/* Navigation Links - Estilos unificados */
.nav-link-custom {
  color: rgba(255, 255, 255, 0.9) !important;
  font-weight: 500;
  padding: 0.6rem 1.2rem !important;
  border-radius: 25px;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-link-custom i {
  font-size: 1rem;
}

.nav-link-custom span {
  font-size: 0.95rem;
}

.nav-link-custom:hover {
  color: #fff !important;
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.nav-link-custom.active {
  color: #667eea !important;
  background-color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Botón de login con mismo estilo */
.btn-login-style {
  background: #fff !important;
  color: #667eea !important;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(255, 255, 255, 0.3);
}

.btn-login-style:hover {
  background: #f8f9ff !important;
  color: #667eea !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2), 0 3px 10px rgba(102, 126, 234, 0.3);
}

/* User Dropdown */
.user-dropdown {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem !important;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 25px;
  transition: all 0.3s ease;
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-dropdown:hover {
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.user-avatar {
  width: 32px;
  height: 32px;
  display: grid; /* centrado perfecto */
  place-items: center; /* centra ícono */
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.user-avatar i {
  font-size: 1.1rem;
  line-height: 1; /* evita desplazamiento vertical */
  display: block;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Dropdown Menu */
.dropdown-menu {
  border: none;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 0.5rem;
  margin-top: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.dropdown-item {
  border-radius: 8px;
  padding: 0.6rem 1rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #f8f9fa;
  transform: translateX(5px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

/* Navbar Toggler */
.navbar-toggler {
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.navbar-toggler:focus {
  box-shadow: none;
  background-color: rgba(255, 255, 255, 0.2);
}

.navbar-toggler-icon {
  filter: brightness(0) invert(1);
}

/* Responsive */
@media (max-width: 991px) {
  .navbar-collapse {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    padding: 1rem;
    margin-top: 1rem;
  }

  .nav-item {
    margin: 0.25rem 0;
  }

  .navbar-nav {
    gap: 0.5rem;
  }

  .nav-link-custom {
    width: 100%;
  }

  .user-dropdown {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
