<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "Confirmar acción",
  },
  message: {
    type: String,
    default: "¿Estás seguro de realizar esta acción?",
  },
  confirmText: {
    type: String,
    default: "Confirmar",
  },
  cancelText: {
    type: String,
    default: "Cancelar",
  },
  type: {
    type: String,
    default: "warning", // success, error, warning, info
    validator: (value) =>
      ["success", "error", "warning", "info"].includes(value),
  },
});

const emit = defineEmits(["confirm", "cancel", "close"]);

const visible = ref(false);

watch(
  () => props.show,
  (newVal) => {
    visible.value = newVal;
  }
);

const handleConfirm = () => {
  emit("confirm");
  close();
};

const handleCancel = () => {
  emit("cancel");
  close();
};

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

const getColor = () => {
  switch (props.type) {
    case "success":
      return "#4caf50";
    case "error":
      return "#f44336";
    case "warning":
      return "#ff9800";
    default:
      return "#2196f3";
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="confirm-overlay" @click.self="handleCancel">
        <div class="confirm-dialog">
          <div class="confirm-icon" :style="{ color: getColor() }">
            <i class="bi" :class="getIcon()"></i>
          </div>
          <h5 class="confirm-title">{{ title }}</h5>
          <p class="confirm-message">{{ message }}</p>
          <div class="confirm-actions">
            <button class="btn-confirm-cancel" @click="handleCancel">
              {{ cancelText }}
            </button>
            <button
              class="btn-confirm-action"
              :style="{ background: getColor() }"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.confirm-dialog {
  background: #fff;
  border-radius: 20px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.confirm-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.confirm-title {
  color: #2d3561;
  font-weight: 700;
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.confirm-message {
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 1rem;
}

.btn-confirm-cancel,
.btn-confirm-action {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-confirm-cancel {
  background: #f0f0f0;
  color: #666;
}

.btn-confirm-cancel:hover {
  background: #e0e0e0;
  transform: translateY(-2px);
}

.btn-confirm-action {
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-confirm-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

/* Animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .confirm-dialog,
.modal-leave-active .confirm-dialog {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .confirm-dialog,
.modal-leave-to .confirm-dialog {
  transform: scale(0.9);
}
</style>
