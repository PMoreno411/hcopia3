<script setup>
import { ref, watch } from "vue";
import { useHabitaciones } from "../../composables/useHabitaciones";
import { useToast } from "../../composables/useToast";
import { useConfirm } from "../../composables/useConfirm";
import Spinner from "../common/Spinner.vue";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  hotelId: { type: String, required: true },
  hotelNombre: { type: String, default: "" },
});

const emit = defineEmits(["close"]);

const {
  addHabitacion,
  getHabitacionesByHotel,
  updateHabitacion,
  deleteHabitacion,
  isPending,
} = useHabitaciones();
const { success, error, warning } = useToast();
const { confirmDelete } = useConfirm();

const habitaciones = ref([]);
const cargando = ref(false);
const vistaActual = ref("lista"); // 'lista' o 'crear' o 'editar'
const habitacionSeleccionada = ref(null);

const tasaCambio = 4000;

const formulario = ref({
  nombre: "",
  descripcion: "",
  precioCop: "",
  precio: "",
  capacidad: 1,
  disponibles: 1,
  camas: "",
  banioPrivado: true,
  servicios: [],
});

const tiposHabitacion = [
  "Individual",
  "Doble",
  "Triple",
  "Suite",
  "Familiar",
  "Presidencial",
];

const tiposCama = [
  "1 Cama Individual",
  "1 Cama Doble",
  "2 Camas Individuales",
  "1 Cama King",
  "1 Cama Queen",
  "3 Camas Individuales",
  "1 Cama Doble + 1 Individual",
];

const serviciosHabitacion = [
  "WiFi",
  "TV",
  "Aire Acondicionado",
  "Minibar",
  "Escritorio",
  "Balcón",
  "Vista al Mar",
  "Caja Fuerte",
];

const toggleServicioHab = (servicio) => {
  const index = formulario.value.servicios.indexOf(servicio);
  if (index > -1) {
    formulario.value.servicios.splice(index, 1);
  } else {
    formulario.value.servicios.push(servicio);
  }
};

const formatoCop = (valor) => {
  const limpio = (valor || "").toString().replace(/\D/g, "");
  if (!limpio) return "";
  return parseInt(limpio, 10).toLocaleString("es-CO");
};

const handlePrecioCopChange = () => {
  const limpio = (formulario.value.precioCop || "")
    .toString()
    .replace(/\D/g, "");
  const cop = parseInt(limpio, 10) || 0;
  formulario.value.precioCop = cop ? formatoCop(cop) : "";
  formulario.value.precio = cop ? +(cop / tasaCambio).toFixed(2) : "";
};

const handlePrecioUsdChange = () => {
  const usd = parseFloat(formulario.value.precio) || 0;
  const cop = usd > 0 ? Math.round(usd * tasaCambio) : 0;
  formulario.value.precioCop = cop ? formatoCop(cop) : "";
};

const cargarHabitaciones = async () => {
  try {
    cargando.value = true;
    habitaciones.value = await getHabitacionesByHotel(props.hotelId);
  } catch (err) {
    console.error("Error al cargar habitaciones:", err);
  } finally {
    cargando.value = false;
  }
};

const limpiarFormulario = () => {
  formulario.value = {
    nombre: "",
    descripcion: "",
    precioCop: "",
    precio: "",
    capacidad: 1,
    disponibles: 1,
    camas: "",
    banioPrivado: true,
    servicios: [],
  };
  habitacionSeleccionada.value = null;
};

const crearHabitacion = async () => {
  if (
    !formulario.value.nombre ||
    !formulario.value.precioCop ||
    !formulario.value.camas
  ) {
    warning("Completa nombre, precio y tipo de camas");
    return;
  }

  handlePrecioCopChange();

  try {
    const habitacionData = {
      nombre: formulario.value.nombre,
      descripcion: formulario.value.descripcion,
      precioCop:
        parseInt((formulario.value.precioCop || "").replace(/\D/g, ""), 10) ||
        0,
      precio: parseFloat(formulario.value.precio) || 0,
      capacidad: formulario.value.capacidad,
      disponibles: formulario.value.disponibles,
      camas: formulario.value.camas,
      banioPrivado: formulario.value.banioPrivado,
      servicios: formulario.value.servicios,
    };

    await addHabitacion(props.hotelId, habitacionData);
    success("Habitación agregada exitosamente");
    limpiarFormulario();
    vistaActual.value = "lista";
    await cargarHabitaciones();
  } catch (err) {
    console.error("Error:", err);
    error("Error al crear habitación");
  }
};

const editarHabitacion = (habitacion) => {
  habitacionSeleccionada.value = habitacion;
  formulario.value = {
    nombre: habitacion.nombre,
    descripcion: habitacion.descripcion || "",
    precioCop: formatoCop(habitacion.precioCop),
    precio: habitacion.precio,
    capacidad: habitacion.capacidad,
    disponibles: habitacion.disponibles,
    camas: habitacion.camas || "",
    banioPrivado: habitacion.banioPrivado ?? true,
    servicios: habitacion.servicios || [],
  };
  vistaActual.value = "editar";
};

const actualizarHabitacion = async () => {
  if (
    !formulario.value.nombre ||
    !formulario.value.precioCop ||
    !formulario.value.camas
  ) {
    warning("Completa nombre, precio y tipo de camas");
    return;
  }

  handlePrecioCopChange();

  try {
    const habitacionData = {
      nombre: formulario.value.nombre,
      descripcion: formulario.value.descripcion,
      precioCop:
        parseInt((formulario.value.precioCop || "").replace(/\D/g, ""), 10) ||
        0,
      precio: parseFloat(formulario.value.precio) || 0,
      capacidad: formulario.value.capacidad,
      disponibles: formulario.value.disponibles,
      camas: formulario.value.camas,
      banioPrivado: formulario.value.banioPrivado,
      servicios: formulario.value.servicios,
    };

    await updateHabitacion(habitacionSeleccionada.value.id, habitacionData);
    success("Habitación actualizada exitosamente");
    limpiarFormulario();
    vistaActual.value = "lista";
    await cargarHabitaciones();
  } catch (err) {
    console.error("Error:", err);
    error("Error al actualizar habitación");
  }
};

const eliminar = async (id) => {
  const confirmed = await confirmDelete("¿Eliminar esta habitación?");
  if (!confirmed) return;

  try {
    await deleteHabitacion(id);
    success("Habitación eliminada");
    await cargarHabitaciones();
  } catch (err) {
    console.error("Error:", err);
    error("Error al eliminar");
  }
};

const cerrarModal = () => {
  limpiarFormulario();
  vistaActual.value = "lista";
  emit("close");
};

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal && props.hotelId) {
      cargarHabitaciones();
      vistaActual.value = "lista";
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
              <i class="bi bi-door-open me-2"></i>
              {{
                vistaActual === "lista"
                  ? "Gestionar Habitaciones"
                  : vistaActual === "crear"
                  ? "Nueva Habitación"
                  : "Editar Habitación"
              }}
              <small v-if="hotelNombre" class="text-muted ms-2"
                >- {{ hotelNombre }}</small
              >
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="cerrarModal"
            ></button>
          </div>

          <div class="modal-body">
            <!-- Vista: Lista -->
            <div v-if="vistaActual === 'lista'">
              <div class="mb-4">
                <button @click="vistaActual = 'crear'" class="btn-crear-nuevo">
                  <i class="bi bi-plus-circle me-2"></i>
                  Agregar Nueva Habitación
                </button>
              </div>

              <Spinner
                v-if="cargando"
                size="md"
                message="Cargando habitaciones..."
              />

              <div v-else-if="habitaciones.length === 0" class="empty-state">
                <i class="bi bi-door-closed"></i>
                <h3>Sin Habitaciones</h3>
                <p>Agrega habitaciones a tu hotel</p>
              </div>

              <div v-else class="habitaciones-grid">
                <div
                  v-for="hab in habitaciones"
                  :key="hab.id"
                  class="habitacion-card"
                >
                  <div class="habitacion-header">
                    <h6 class="habitacion-nombre">{{ hab.nombre }}</h6>
                    <div class="habitacion-precio">
                      ${{ hab.precioCop?.toLocaleString("es-CO") }}
                      <small>COP/noche</small>
                    </div>
                  </div>
                  <p v-if="hab.descripcion" class="habitacion-descripcion">
                    {{ hab.descripcion }}
                  </p>
                  <div class="habitacion-detalles">
                    <span class="detalle-item">
                      <i class="bi bi-people-fill"></i>
                      {{ hab.capacidad }} persona{{
                        hab.capacidad > 1 ? "s" : ""
                      }}
                    </span>
                    <span class="detalle-item">
                      <i class="bi bi-door-open-fill"></i>
                      {{ hab.disponibles }} disponible{{
                        hab.disponibles > 1 ? "s" : ""
                      }}
                    </span>
                    <span class="detalle-item">
                      <i class="bi bi-moon-stars-fill"></i>
                      {{ hab.camas }}
                    </span>
                  </div>
                  <div class="habitacion-acciones">
                    <button
                      @click="editarHabitacion(hab)"
                      class="btn-accion btn-editar"
                    >
                      <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button
                      @click="eliminar(hab.id)"
                      class="btn-accion btn-eliminar"
                    >
                      <i class="bi bi-trash"></i> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Vista: Crear/Editar -->
            <form
              v-else
              @submit.prevent="
                vistaActual === 'crear'
                  ? crearHabitacion()
                  : actualizarHabitacion()
              "
            >
              <div class="mb-3">
                <label class="form-label"
                  >Nombre/Tipo <span class="text-danger">*</span></label
                >
                <select
                  v-model="formulario.nombre"
                  class="form-select"
                  required
                  :disabled="isPending"
                >
                  <option value="">Selecciona un tipo</option>
                  <option
                    v-for="tipo in tiposHabitacion"
                    :key="tipo"
                    :value="tipo"
                  >
                    {{ tipo }}
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label"
                  >Configuración de Camas
                  <span class="text-danger">*</span></label
                >
                <select
                  v-model="formulario.camas"
                  class="form-select"
                  required
                  :disabled="isPending"
                >
                  <option value="">Selecciona configuración</option>
                  <option v-for="cama in tiposCama" :key="cama" :value="cama">
                    {{ cama }}
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">Descripción adicional</label>
                <textarea
                  v-model="formulario.descripcion"
                  class="form-control"
                  rows="2"
                  placeholder="Detalles extras..."
                  :disabled="isPending"
                ></textarea>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label"
                    >Precio por noche (COP)
                    <span class="text-danger">*</span></label
                  >
                  <input
                    v-model="formulario.precioCop"
                    @input="handlePrecioCopChange"
                    type="text"
                    class="form-control"
                    placeholder="150.000"
                    inputmode="numeric"
                    required
                    :disabled="isPending"
                  />
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Precio USD (auto)</label>
                  <input
                    v-model="formulario.precio"
                    @input="handlePrecioUsdChange"
                    type="number"
                    class="form-control"
                    placeholder="37.5"
                    step="0.01"
                    :disabled="isPending"
                  />
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Capacidad (personas)</label>
                  <input
                    v-model.number="formulario.capacidad"
                    type="number"
                    class="form-control"
                    min="1"
                    max="10"
                    :disabled="isPending"
                  />
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label"
                    >Cantidad de habitaciones de este tipo</label
                  >
                  <input
                    v-model.number="formulario.disponibles"
                    type="number"
                    class="form-control"
                    min="1"
                    :disabled="isPending"
                  />
                  <small class="text-muted"
                    >Ej: 3 = tienes 3 habitaciones de este tipo</small
                  >
                </div>
              </div>

              <div class="mb-3">
                <div class="form-check form-switch">
                  <input
                    v-model="formulario.banioPrivado"
                    class="form-check-input"
                    type="checkbox"
                    id="banioPrivado"
                    :disabled="isPending"
                  />
                  <label class="form-check-label" for="banioPrivado"
                    >Baño Privado</label
                  >
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Servicios de la habitación</label>
                <div class="row g-2">
                  <div
                    v-for="servicio in serviciosHabitacion"
                    :key="servicio"
                    class="col-md-6"
                  >
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :id="`serv-${servicio}`"
                        :checked="formulario.servicios.includes(servicio)"
                        @change="toggleServicioHab(servicio)"
                        :disabled="isPending"
                      />
                      <label
                        class="form-check-label"
                        :for="`serv-${servicio}`"
                        >{{ servicio }}</label
                      >
                    </div>
                  </div>
                </div>
              </div>

              <div class="modal-actions">
                <button
                  type="button"
                  class="btn-modal-secondary"
                  @click="
                    vistaActual = 'lista';
                    limpiarFormulario();
                  "
                  :disabled="isPending"
                >
                  <i class="bi bi-arrow-left me-2"></i>
                  Volver
                </button>
                <button
                  type="submit"
                  class="btn-modal-primary"
                  :disabled="isPending"
                >
                  <span
                    v-if="isPending"
                    class="spinner-border spinner-border-sm me-2"
                  ></span>
                  <i v-else class="bi bi-check-circle me-2"></i>
                  {{
                    isPending
                      ? "Guardando..."
                      : vistaActual === "crear"
                      ? "Crear"
                      : "Actualizar"
                  }}
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
  max-width: 800px;
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

.btn-crear-nuevo {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: 50px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
  width: 100%;
}

.btn-crear-nuevo:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #999;
}

.empty-state i {
  font-size: 5rem;
  color: #ddd;
  margin-bottom: 1.5rem;
}

.habitaciones-grid {
  display: grid;
  gap: 1rem;
}

.habitacion-card {
  background: #fff;
  border: 1px solid #e0e7ff;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.habitacion-card:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.habitacion-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.habitacion-nombre {
  font-weight: 700;
  color: #2d3561;
  margin: 0;
}

.habitacion-precio {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-weight: 700;
  font-size: 1rem;
  white-space: nowrap;
}

.habitacion-precio small {
  font-size: 0.75rem;
  opacity: 0.9;
}

.habitacion-descripcion {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.habitacion-detalles {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.detalle-item {
  color: #667eea;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.habitacion-acciones {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.btn-accion {
  padding: 0.6rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.btn-editar {
  background: #fff3e0;
  color: #f57c00;
}

.btn-editar:hover {
  background: #f57c00;
  color: #fff;
}

.btn-eliminar {
  background: #ffebee;
  color: #d32f2f;
}

.btn-eliminar:hover {
  background: #d32f2f;
  color: #fff;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
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

.btn-modal-primary:hover:not(:disabled) {
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

.btn-modal-secondary:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #999;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .habitacion-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .habitacion-precio {
    align-self: flex-start;
  }

  .modal-actions {
    flex-direction: column;
  }
}
</style>
