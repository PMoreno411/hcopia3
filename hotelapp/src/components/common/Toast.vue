<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "info", // success, error, warning, info
    validator: (value) =>
      ["success", "error", "warning", "info"].includes(value),
  },
  duration: {
    type: Number,
    default: 3000,
  },
});

const emit = defineEmits(["close"]);

const visible = ref(false);

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      visible.value = true;
      if (props.duration > 0) {
        setTimeout(() => {
          close();
        }, props.duration);
      }
    }
  }
);

const close = () => {
  visible.value = false;
  setTimeout(() => {
    emit("close");
  }, 300);
};

const getIcon = () => {
  switch (props.type) {
    case "success":
      return "bi-check-circle-fill";
    case "error":
      return "bi-x-circle-fill";
    case "warning":
      return "bi-exclamation-triangle-fill";
    default:
      return "bi-info-circle-fill";
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="visible"
        class="toast-container"
        :class="`toast-${type}`"
        @click.stop="close"
      >
        <div class="toast-content">
          <div class="toast-icon">
            <i class="bi" :class="getIcon()"></i>
          </div>
          <p class="toast-message">{{ message }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 100px;
  right: 2rem;
  z-index: 99999;
  min-width: 320px;
  max-width: 500px;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  cursor: pointer;
  pointer-events: auto;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #fff;
  pointer-events: auto;
}

.toast-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  margin: 0;
  color: #2d3561;
  font-weight: 500;
  font-size: 0.95rem;
  line-height: 1.4;
}

/* Types */
.toast-success {
  border-left: 4px solid #4caf50;
}

.toast-success .toast-icon {
  color: #4caf50;
}

.toast-error {
  border-left: 4px solid #f44336;
}

.toast-error .toast-icon {
  color: #f44336;
}

.toast-warning {
  border-left: 4px solid #ff9800;
}

.toast-warning .toast-icon {
  color: #ff9800;
}

.toast-info {
  border-left: 4px solid #2196f3;
}

.toast-info .toast-icon {
  color: #2196f3;
}

/* Animations */
.toast-enter-active {
  animation: slideInRight 0.3s ease;
}

.toast-leave-active {
  animation: slideOutRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(400px);
    opacity: 0;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .toast-container {
    top: 80px;
    right: 1rem;
    left: 1rem;
    min-width: auto;
    max-width: none;
    width: calc(100% - 2rem);
  }

  .toast-content {
    padding: 1rem;
  }

  .toast-icon {
    font-size: 1.25rem;
  }

  .toast-message {
    font-size: 0.9rem;
  }

  /* Animaciones en móviles - desde arriba */
  .toast-enter-active {
    animation: slideInDown 0.3s ease;
  }

  .toast-leave-active {
    animation: slideOutUp 0.3s ease;
  }

  @keyframes slideInDown {
    from {
      transform: translateY(-100px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideOutUp {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(-100px);
      opacity: 0;
    }
  }
}

/* Pantallas muy pequeñas */
@media (max-width: 480px) {
  .toast-container {
    top: 70px;
    right: 0.75rem;
    left: 0.75rem;
    width: calc(100% - 1.5rem);
  }

  .toast-content {
    padding: 0.875rem;
  }

  .toast-message {
    font-size: 0.85rem;
  }
}
</style>
