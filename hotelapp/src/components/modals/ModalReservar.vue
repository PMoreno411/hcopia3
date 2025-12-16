<script setup>
import { ref, computed } from "vue";
import { useAuth } from "../../composables/useAuth";
import { useReservas } from "../../composables/useReservas";
import { useToast } from "../../composables/useToast";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  habitacion: { type: Object, default: null },
  hotel: { type: Object, default: null },
});

const emit = defineEmits(["close", "reserva-creada"]);

const { user } = useAuth();
const { addReserva, getReservasByHabitacionYFechas, isPending } = useReservas();
const { success, error, warning } = useToast();

const formulario = ref({
  checkIn: "",
  checkOut: "",
  nombreHuesped: "",
  email: "",
  telefono: "",
  numeroAdultos: 2,
  numeroNinos: 0,
  horaLlegada: "14:00",
  solicitudesEspeciales: "",
});

const noches = computed(() => {
  if (!formulario.value.checkIn || !formulario.value.checkOut) return 0;
  const inicio = new Date(formulario.value.checkIn);
  const fin = new Date(formulario.value.checkOut);
  const diferencia = fin - inicio;
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
});

const precioTotal = computed(() => {
  if (!props.habitacion || noches.value <= 0) return 0;
  return props.habitacion.precioCop * noches.value;
});

const precioTotalUSD = computed(() => {
  if (!props.habitacion || noches.value <= 0) return 0;
  return props.habitacion.precio * noches.value;
});

const fechaMinima = computed(() => {
  const hoy = new Date();
  return hoy.toISOString().split("T")[0];
});

const fechaMinimaCheckout = computed(() => {
  if (!formulario.value.checkIn) return fechaMinima.value;
  const checkIn = new Date(formulario.value.checkIn);
  checkIn.setDate(checkIn.getDate() + 1);
  return checkIn.toISOString().split("T")[0];
});

const enviarReserva = async () => {
  if (!user.value) {
    warning("Debes iniciar sesión para reservar");
    return;
  }

  // Validar que no sea el dueño del hotel
  if (user.value && props.hotel?.userId === user.value.uid) {
    warning("No puedes reservar en tu propio hotel");
    return;
  }

  // Validaciones básicas
  if (!formulario.value.checkIn || !formulario.value.checkOut) {
    warning("Selecciona las fechas de check-in y check-out");
    return;
  }

  if (
    !formulario.value.nombreHuesped ||
    !formulario.value.email ||
    !formulario.value.telefono
  ) {
    warning("Completa todos los campos obligatorios");
    return;
  }

  // Validar que checkout sea después de checkin
  const checkIn = new Date(formulario.value.checkIn);
  const checkOut = new Date(formulario.value.checkOut);

  if (checkOut <= checkIn) {
    warning("La fecha de check-out debe ser posterior al check-in");
    return;
  }

  // Validar capacidad
  const totalHuespedes =
    formulario.value.numeroAdultos + formulario.value.numeroNinos;
  if (totalHuespedes > props.habitacion?.capacidad) {
    warning(
      `Esta habitación tiene capacidad máxima de ${props.habitacion.capacidad} personas`
    );
    return;
  }

  try {
    // Verificar disponibilidad en las fechas seleccionadas
    const reservasExistentes = await getReservasByHabitacionYFechas(
      props.habitacion.id,
      formulario.value.checkIn,
      formulario.value.checkOut
    );

    // Contar cuántas habitaciones de este tipo están ocupadas en esas fechas
    const habitacionesOcupadas = reservasExistentes.length;
    const habitacionesDisponibles =
      props.habitacion.disponibles - habitacionesOcupadas;

    if (habitacionesDisponibles <= 0) {
      warning(
        "No hay habitaciones disponibles en las fechas seleccionadas. Por favor elige otras fechas."
      );
      return;
    }

    // Crear la reserva
    const reservaData = {
      hotelId: props.hotel.id,
      hotelNombre: props.hotel.nombre,
      habitacionId: props.habitacion.id,
      habitacionNombre: props.habitacion.nombre,
      habitacionCamas: props.habitacion.camas,
      userId: user.value?.uid || null,
      nombreHuesped: formulario.value.nombreHuesped,
      email: formulario.value.email,
      telefono: formulario.value.telefono,
      numeroAdultos: formulario.value.numeroAdultos,
      numeroNinos: formulario.value.numeroNinos,
      checkIn: formulario.value.checkIn,
      checkOut: formulario.value.checkOut,
      noches: noches.value,
      precioPorNoche: props.habitacion.precioCop,
      precioTotal: precioTotal.value,
      precioTotalUSD: precioTotalUSD.value,
      horaLlegada: formulario.value.horaLlegada,
      solicitudesEspeciales: formulario.value.solicitudesEspeciales,
    };

    await addReserva(reservaData);
    emit("reserva-creada");
    limpiarFormulario();
  } catch (err) {
    console.error("Error al crear reserva:", err);
    error("Error al crear la reserva. Intenta nuevamente.");
  }
};

const cerrarModal = () => {
  limpiarFormulario();
  emit("close");
};

const limpiarFormulario = () => {
  formulario.value = {
    checkIn: "",
    checkOut: "",
    nombreHuesped: "",
    email: "",
    telefono: "",
    numeroAdultos: 2,
    numeroNinos: 0,
    horaLlegada: "14:00",
    solicitudesEspeciales: "",
  };
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
      <div
        class="modal-dialog modal-dialog-centered modal-dialog-scrollable custom-modal-lg"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-calendar-check me-2"></i>
              Reservar Habitación
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="cerrarModal"
            ></button>
          </div>

          <div class="modal-body">
            <!-- Info de la habitación -->
            <div class="reserva-info-card mb-4">
              <div class="reserva-hotel-info">
                <h6 class="hotel-nombre">{{ hotel?.nombre }}</h6>
                <p class="habitacion-tipo">
                  {{ habitacion?.nombre }} - {{ habitacion?.camas }}
                </p>
              </div>
              <div class="reserva-precio-badge">
                ${{ habitacion?.precioCop?.toLocaleString("es-CO") }}
                <span>COP/noche</span>
              </div>
            </div>

            <form @submit.prevent="enviarReserva">
              <!-- Fechas -->
              <div class="seccion-form mb-4">
                <h6 class="seccion-titulo">
                  <i class="bi bi-calendar3 me-2"></i>
                  Fechas de Estadía
                </h6>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label"
                      >Check-in <span class="text-danger">*</span></label
                    >
                    <input
                      v-model="formulario.checkIn"
                      type="date"
                      class="form-control"
                      :min="fechaMinima"
                      required
                    />
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label"
                      >Check-out <span class="text-danger">*</span></label
                    >
                    <input
                      v-model="formulario.checkOut"
                      type="date"
                      class="form-control"
                      :min="fechaMinimaCheckout"
                      required
                    />
                  </div>
                </div>

                <div v-if="noches > 0" class="noches-info">
                  <i class="bi bi-moon-stars-fill me-2"></i>
                  <strong>{{ noches }}</strong
                  >&nbsp;noche{{ noches > 1 ? "s" : "" }}
                </div>
              </div>

              <!-- Huéspedes -->
              <div class="seccion-form mb-4">
                <h6 class="seccion-titulo">
                  <i class="bi bi-people-fill me-2"></i>
                  Información de Huéspedes
                </h6>
                <div class="mb-3">
                  <label class="form-label"
                    >Nombre completo <span class="text-danger">*</span></label
                  >
                  <input
                    v-model="formulario.nombreHuesped"
                    type="text"
                    class="form-control"
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label"
                      >Email <span class="text-danger">*</span></label
                    >
                    <input
                      v-model="formulario.email"
                      type="email"
                      class="form-control"
                      placeholder="juan@email.com"
                      required
                    />
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label"
                      >Teléfono <span class="text-danger">*</span></label
                    >
                    <input
                      v-model="formulario.telefono"
                      type="tel"
                      class="form-control"
                      placeholder="+57 300 123 4567"
                      required
                    />
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Adultos</label>
                    <select
                      v-model.number="formulario.numeroAdultos"
                      class="form-select"
                    >
                      <option :value="1">1 Adulto</option>
                      <option :value="2">2 Adultos</option>
                      <option :value="3">3 Adultos</option>
                      <option :value="4">4 Adultos</option>
                    </select>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Niños</label>
                    <select
                      v-model.number="formulario.numeroNinos"
                      class="form-select"
                    >
                      <option :value="0">Sin niños</option>
                      <option :value="1">1 Niño</option>
                      <option :value="2">2 Niños</option>
                      <option :value="3">3 Niños</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Detalles adicionales -->
              <div class="seccion-form mb-4">
                <h6 class="seccion-titulo">
                  <i class="bi bi-clock me-2"></i>
                  Detalles Adicionales
                </h6>
                <div class="mb-3">
                  <label class="form-label">Hora estimada de llegada</label>
                  <input
                    v-model="formulario.horaLlegada"
                    type="time"
                    class="form-control"
                  />
                </div>
                <div class="mb-3">
                  <label class="form-label"
                    >Solicitudes especiales (opcional)</label
                  >
                  <textarea
                    v-model="formulario.solicitudesEspeciales"
                    class="form-control"
                    rows="3"
                    placeholder="Ej: Cama extra, piso alto, vista al mar..."
                  ></textarea>
                </div>
              </div>

              <!-- Resumen -->
              <div class="resumen-reserva">
                <h6 class="resumen-titulo">
                  <i class="bi bi-receipt me-2"></i>
                  Resumen de Reserva
                </h6>
                <div class="resumen-detalle">
                  <div class="resumen-item">
                    <span>Habitación</span>
                    <strong>{{ habitacion?.nombre }}</strong>
                  </div>
                  <div class="resumen-item">
                    <span>Precio por noche</span>
                    <strong
                      >${{
                        habitacion?.precioCop?.toLocaleString("es-CO")
                      }}
                      COP</strong
                    >
                  </div>
                  <div class="resumen-item">
                    <span>Noches</span>
                    <strong>{{ noches || 0 }}</strong>
                  </div>
                  <div class="resumen-item">
                    <span>Huéspedes</span>
                    <strong
                      >{{ formulario.numeroAdultos }} adulto{{
                        formulario.numeroAdultos > 1 ? "s" : ""
                      }}{{
                        formulario.numeroNinos > 0
                          ? `, ${formulario.numeroNinos} niño${
                              formulario.numeroNinos > 1 ? "s" : ""
                            }`
                          : ""
                      }}</strong
                    >
                  </div>
                  <div class="resumen-divider"></div>
                  <div class="resumen-total">
                    <span>Total</span>
                    <div class="total-precio">
                      <strong
                        >${{ precioTotal.toLocaleString("es-CO") }} COP</strong
                      >
                      <small>≈ USD ${{ precioTotalUSD.toFixed(2) }}</small>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Botones -->
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn-modal-secondary"
                  @click="cerrarModal"
                >
                  <i class="bi bi-x-circle me-2"></i>
                  Cancelar
                </button>
                <button type="submit" class="btn-modal-primary" :disabled="isPending">
                  <i class="bi bi-check-circle me-2"></i>
                  Solicitar Reserva
                </button>
              </div>
            </form>
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
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  border-radius: 20px 20px 0 0;
}

.modal-title {
  color: #2d3561;
  font-weight: 700;
  font-size: 1.25rem;
}

.modal-title i {
  color: #667eea;
}

.modal-body {
  padding: 2rem;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.reserva-info-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 1.5rem;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.hotel-nombre {
  font-weight: 700;
  margin-bottom: 0.25rem;
  font-size: 1.1rem;
}

.habitacion-tipo {
  margin: 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.reserva-precio-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.75rem 1.25rem;
  border-radius: 50px;
  font-weight: 700;
  font-size: 1.1rem;
  white-space: nowrap;
  text-align: center;
}

.reserva-precio-badge span {
  display: block;
  font-size: 0.75rem;
  opacity: 0.9;
}

.seccion-form {
  background: #f8f9ff;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e0e7ff;
}

.seccion-titulo {
  color: #2d3561;
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}

.seccion-titulo i {
  color: #667eea;
}

.noches-info {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
}

.resumen-reserva {
  background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
  border: 2px solid #ffcccc;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.resumen-titulo {
  color: #d32f2f;
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}

.resumen-detalle {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.resumen-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.resumen-item span {
  color: #666;
}

.resumen-item strong {
  color: #2d3561;
}

.resumen-divider {
  height: 1px;
  background: #ffcccc;
  margin: 0.5rem 0;
}

.resumen-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1rem;
}

.resumen-total span {
  color: #d32f2f;
  font-weight: 700;
}

.total-precio {
  text-align: right;
}

.total-precio strong {
  display: block;
  color: #d32f2f;
  font-size: 1.5rem;
}

.total-precio small {
  color: #999;
  font-size: 0.85rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.btn-modal-primary {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-modal-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
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

@media (max-width: 768px) {
  .reserva-info-card {
    flex-direction: column;
    text-align: center;
  }

  .modal-actions {
    flex-direction: column;
  }
}
</style>
