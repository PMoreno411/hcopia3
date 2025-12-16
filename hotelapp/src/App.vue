<script setup>
import { useRouter } from "vue-router";
import { useAuth } from "./composables/useAuth";
import { useModal } from "./composables/useModal";
import Header from "./components/layout/Header.vue";
import Footer from "./components/layout/Footer.vue";
import ModalLogin from "./components/modals/ModalLogin.vue";
import Toast from "./components/common/Toast.vue";
import ConfirmDialog from "./components/common/ConfirmDialog.vue";
import { useToast } from "./composables/useToast";
import { useConfirm } from "./composables/useConfirm";

const router = useRouter();
const { logout } = useAuth();

const {
  isOpen: modalLoginOpen,
  openModal: openLogin,
  closeModal: closeLogin,
} = useModal();

const { toastState, closeToast } = useToast();
const { confirmState, handleConfirm, handleCancel, closeConfirm, confirm } =
  useConfirm();

const handleLoginExitoso = () => {
  closeLogin();
  router.push("/dashboard");
};

const handleLogout = async () => {
  const confirmed = await confirm(
    "¿Estás seguro de cerrar sesión?",
    "Confirmar cierre de sesión"
  );

  if (!confirmed) return;

  try {
    await logout();
    router.push("/");
  } catch (err) {
    console.error("Error al cerrar sesión:", err);
  }
};
</script>

<template>
  <div id="app">
    <!-- Header Component -->
    <Header :on-open-login="openLogin" @logout="handleLogout" />

    <!-- Contenido principal -->
    <main class="container py-4">
      <router-view></router-view>
    </main>

    <!-- Footer Component -->
    <Footer />

    <!-- Modal Login/Registro -->
    <ModalLogin
      :is-open="modalLoginOpen"
      @close="closeLogin"
      @login-exitoso="handleLoginExitoso"
    />

    <!-- Toast Global -->
    <Toast
      :show="toastState.show"
      :message="toastState.message"
      :type="toastState.type"
      :duration="toastState.duration"
      @close="closeToast"
    />

    <!-- Confirm Dialog Global -->
    <ConfirmDialog
      :show="confirmState.show"
      :title="confirmState.title"
      :message="confirmState.message"
      :confirmText="confirmState.confirmText"
      :cancelText="confirmState.cancelText"
      :type="confirmState.type"
      @confirm="handleConfirm"
      @cancel="handleCancel"
      @close="closeConfirm"
    />
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}

.modal.show {
  display: block;
}
</style>
