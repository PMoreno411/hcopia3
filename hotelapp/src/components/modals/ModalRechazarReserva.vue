<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  reserva: { type: Object, default: null },
});

const emit = defineEmits(["close", "confirmar"]);

const motivoRechazo = ref("");

const confirmar = () => {
  if (!motivoRechazo.value.trim()) {
    return;
  }
  emit("confirmar", motivoRechazo.value.trim());
};

const cerrarModal = () => {
  motivoRechazo.value = "";
  emit("close");
};

// Prevenir scroll del body cuando el modal está abierto
watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      motivoRechazo.value = "";
    }
  }
);
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
      <div
        class="modal-dialog modal-dialog-centered modal-dialog-scrollable custom-modal-lg"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-x-circle-fill me-2"></i>
              Rechazar Reserva
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="cerrarModal"
            ></button>
          </div>

          <div class="modal-body">
            <div class="alert-box">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              <strong>Importante:</strong> El motivo será enviado al huésped.
            </div>

            <div class="reserva-info-card mb-4">
              <h6 class="info-title">Información de la Reserva</h6>
              <div class="info-row">
                <span class="info-label">Huésped:</span>
                <strong>{{ reserva?.nombreHuesped }}</strong>
              </div>
              <div class="info-row">
                <span class="info-label">Habitación:</span>
                <strong>{{ reserva?.habitacionNombre }}</strong>
              </div>
              <div class="info-row">
                <span class="info-label">Fechas:</span>
                <strong
                  >{{ reserva?.checkIn }} → {{ reserva?.checkOut }}</strong
                >
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">
                Motivo del rechazo <span class="text-danger">*</span>
              </label>
              <textarea
                v-model="motivoRechazo"
                class="form-control"
                rows="4"
                placeholder="Ej: Lo sentimos, esas fechas ya no están disponibles. Por favor elige otras fechas..."
                required
              ></textarea>
              <small class="form-hint">
                Sé claro y cortés. El huésped recibirá este mensaje.
              </small>
            </div>

            <div class="modal-actions">
              <button
                type="button"
                class="btn-modal-secondary"
                @click="cerrarModal"
              >
                <i class="bi bi-arrow-left me-2"></i>
                Cancelar
              </button>
              <button
                type="button"
                class="btn-modal-danger"
                @click="confirmar"
                :disabled="!motivoRechazo.trim()"
              >
                <i class="bi bi-x-lg me-2"></i>
                Rechazar Reserva
              </button>
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

.custom-modal-lg {
  max-width: 700px;
}

.modal-content {
  border: none;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  border-bottom: 1px solid #f0f0f0;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
  border-radius: 20px 20px 0 0;
}

.modal-title {
  color: #d32f2f;
  font-weight: 700;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
}

.modal-title i {
  color: #ef4444;
}

.modal-body {
  padding: 2rem;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #667eea;
  border-radius: 10px;
}

.alert-box {
  background: linear-gradient(135deg, #fff3cd 0%, #ffe8b3 100%);
  border-left: 4px solid #f59e0b;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  color: #856404;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.alert-box i {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.reserva-info-card {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border: 2px solid #e0e7ff;
  padding: 1.5rem;
  border-radius: 16px;
}

.info-title {
  color: #2d3561;
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e0e7ff;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #666;
  font-size: 0.9rem;
}

.info-row strong {
  color: #2d3561;
  font-size: 0.95rem;
}

.form-label {
  color: #2d3561;
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: block;
}

.form-control {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 0.875rem 1rem;
  font-size: 0.95rem;
  transition: all 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-hint {
  display: block;
  margin-top: 0.5rem;
  color: #999;
  font-size: 0.85rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.btn-modal-secondary {
  flex: 1;
  background: #fff;
  color: #666;
  border: 2px solid #e0e0e0;
  padding: 0.875rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-modal-secondary:hover {
  background: #f8f9fa;
  border-color: #999;
  transform: translateY(-2px);
}

.btn-modal-danger {
  flex: 1;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-modal-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
}

.btn-modal-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .modal-header {
    padding: 1rem 1.5rem;
  }

  .modal-title {
    font-size: 1.1rem;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-modal-secondary,
  .btn-modal-danger {
    width: 100%;
  }
}
</style>
