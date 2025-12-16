<script setup>
import { ref, watch } from "vue";
import { useAuth } from "../../composables/useAuth";
import { useFirestore } from "../../composables/useFirestore";
import { useStorage } from "../../composables/useStorage";
import { useToast } from "../../composables/useToast";
import { useConfirm } from "../../composables/useConfirm";
import Spinner from "../common/Spinner.vue";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "anuncioGestionado"]);

const { user } = useAuth();
const { addDocument, queryDocuments, deleteDocument, isPending } =
  useFirestore("ads");
const {
  uploadFile,
  deleteFile,
  extractPathFromUrl,
  isPending: uploadingImage,
} = useStorage();
const { success, error, warning } = useToast();
const { confirm } = useConfirm();

const misAnuncios = ref([]);
const cargando = ref(false);
const vistaActual = ref("lista"); // 'lista' o 'crear'

const { getDocument: getConfig } = useFirestore("config");

const numeroNequi = ref("3001234567");
const planesPublicidad = ref({
  basico: {
    nombre: "Básico",
    precio: 50000,
    duracion: 7,
    descripcion: "1 semana",
  },
  premium: {
    nombre: "Premium",
    precio: 150000,
    duracion: 30,
    descripcion: "1 mes",
  },
  destacado: {
    nombre: "Destacado",
    precio: 400000,
    duracion: 90,
    descripcion: "3 meses",
  },
});

const nuevoAnuncio = ref({
  titulo: "",
  descripcion: "",
  url: "",
  plan: "basico",
  fechaInicio: "",
  fechaFin: "",
  activo: false, // Ahora inicia en false hasta que se apruebe el pago
  estadoPago: "pendiente", // pendiente, aprobado, rechazado
});

const imagenSeleccionada = ref(null);
const previsualizacion = ref("");

const comprobanteSeleccionado = ref(null);
const previsualizacionComprobante = ref("");

const cargarMisAnuncios = async () => {
  try {
    cargando.value = true;
    const filters = [
      { type: "where", field: "userId", operator: "==", value: user.value.uid },
      { type: "orderBy", field: "createdAt", direction: "desc" },
    ];
    misAnuncios.value = await queryDocuments(filters);
  } catch (err) {
    console.error("Error al cargar anuncios:", err);
  } finally {
    cargando.value = false;
  }
};

const handleImagenChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    imagenSeleccionada.value = file;
    const reader = new FileReader();
    reader.onload = (e) => (previsualizacion.value = e.target.result);
    reader.readAsDataURL(file);
  }
};

const handleComprobanteChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    comprobanteSeleccionado.value = file;
    const reader = new FileReader();
    reader.onload = (e) =>
      (previsualizacionComprobante.value = e.target.result);
    reader.readAsDataURL(file);
  }
};

const cargarConfiguracion = async () => {
  try {
    const config = await getConfig("sistema", { silentNotFound: true });
    if (config) {
      numeroNequi.value = config.numeroNequi || numeroNequi.value;
      if (config.planesPublicidad) {
        planesPublicidad.value = config.planesPublicidad;
      }
    }
  } catch (err) {
    console.log("Usando configuración por defecto");
  }
};

const calcularFechas = () => {
  const plan = planesPublicidad.value[nuevoAnuncio.value.plan];
  const inicio = new Date();
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + plan.duracion);

  nuevoAnuncio.value.fechaInicio = inicio.toISOString();
  nuevoAnuncio.value.fechaFin = fin.toISOString();
};

const calcularDiasRestantes = (fechaFin) => {
  const ahora = new Date();
  const fin = new Date(fechaFin);
  const diferencia = fin - ahora;
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  return dias > 0 ? dias : 0;
};

const crearAnuncio = async () => {
  if (!nuevoAnuncio.value.titulo || !imagenSeleccionada.value) {
    warning("Completa título e imagen del banner");
    return;
  }

  if (!comprobanteSeleccionado.value) {
    warning("Debes subir el comprobante de pago de Nequi");
    return;
  }

  try {
    // Subir imagen del anuncio
    const resultadoImagen = await uploadFile(
      imagenSeleccionada.value,
      `ads/${user.value.uid}/${Date.now()}_banner`
    );

    // Subir comprobante de pago
    const resultadoComprobante = await uploadFile(
      comprobanteSeleccionado.value,
      `ads/${user.value.uid}/${Date.now()}_comprobante`
    );

    calcularFechas();

    const anuncioData = {
      ...nuevoAnuncio.value,
      imagen: resultadoImagen.url,
      comprobantePago: resultadoComprobante.url,
      posicion: "header",
      userId: user.value.uid,
      userName: user.value.displayName || user.value.email,
      impresiones: 0,
      plan: planesPublicidad.value[nuevoAnuncio.value.plan],
      activo: false,
      estadoPago: "pendiente",
    };

    await addDocument(anuncioData);
    success("¡Solicitud enviada! Revisaremos tu pago pronto.");

    limpiarFormulario();
    vistaActual.value = "lista";
    await cargarMisAnuncios();
    emit("anuncioGestionado");
  } catch (err) {
    console.error("Error:", err);
    error("Error al crear anuncio");
  }
};

const eliminarAnuncio = async (id) => {
  const confirmed = await confirm(
    "¿Eliminar este anuncio? Se eliminará también su imagen del banner.",
    "Confirmar eliminación"
  );

  if (!confirmed) return;

  try {
    const anuncio = misAnuncios.value.find((a) => a.id === id);

    // Eliminar imagen de Supabase primero
    if (anuncio?.imagen) {
      const rutaImagen = extractPathFromUrl(anuncio.imagen);
      if (rutaImagen) {
        try {
          await deleteFile(rutaImagen);
          console.log("✅ Imagen del anuncio eliminada de Supabase");
        } catch (err) {
          console.warn("⚠️ Error al eliminar imagen del storage:", err);
        }
      }
    }

    // Eliminar documento de Firestore
    await deleteDocument(id);
    await cargarMisAnuncios();
    success("Anuncio eliminado");
    emit("anuncioGestionado");
  } catch (err) {
    console.error("Error al eliminar anuncio:", err);
    error("Error al eliminar");
  }
};

const limpiarFormulario = () => {
  nuevoAnuncio.value = {
    titulo: "",
    descripcion: "",
    url: "",
    plan: "basico",
    fechaInicio: "",
    fechaFin: "",
    activo: false,
    estadoPago: "pendiente",
  };
  imagenSeleccionada.value = null;
  previsualizacion.value = "";
  comprobanteSeleccionado.value = null;
  previsualizacionComprobante.value = "";
};

const cerrarModal = () => {
  limpiarFormulario();
  vistaActual.value = "lista";
  emit("close");
};

watch(
  () => props.isOpen,
  async (newVal) => {
    if (newVal) {
      await cargarConfiguracion();
      cargarMisAnuncios();
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
              <i class="bi bi-megaphone me-2"></i>
              {{
                vistaActual === "crear"
                  ? "Crear Anuncio"
                  : "Mis Anuncios Publicitarios"
              }}
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="cerrarModal"
            ></button>
          </div>

          <div class="modal-body">
            <!-- Vista: Crear Anuncio -->
            <form v-if="vistaActual === 'crear'" @submit.prevent="crearAnuncio">
              <div class="mb-4">
                <h6 class="text-primary">Información del Banner</h6>
                <hr />

                <div class="mb-3">
                  <label class="form-label">
                    Título del anuncio <span class="text-danger">*</span>
                  </label>
                  <input
                    v-model="nuevoAnuncio.titulo"
                    type="text"
                    class="form-control"
                    placeholder="Ej: Promoción Hotel Paradise"
                    required
                    :disabled="isPending || uploadingImage"
                  />
                </div>

                <div class="mb-3">
                  <label class="form-label">Descripción corta</label>
                  <textarea
                    v-model="nuevoAnuncio.descripcion"
                    class="form-control"
                    rows="2"
                    placeholder="Descripción interna (opcional)"
                    :disabled="isPending || uploadingImage"
                  ></textarea>
                </div>

                <div class="mb-3">
                  <label class="form-label">URL de destino</label>
                  <input
                    v-model="nuevoAnuncio.url"
                    type="url"
                    class="form-control"
                    placeholder="https://mihotel.com/promocion"
                    :disabled="isPending || uploadingImage"
                  />
                  <small class="text-muted"
                    >A dónde redirige al hacer click (opcional)</small
                  >
                </div>
              </div>

              <div class="mb-4">
                <h6 class="text-primary">Plan Publicitario</h6>
                <hr />

                <div class="mb-3">
                  <label class="form-label">Selecciona tu plan</label>
                  <select
                    v-model="nuevoAnuncio.plan"
                    class="form-select"
                    :disabled="isPending || uploadingImage"
                  >
                    <option
                      v-for="(plan, key) in planesPublicidad"
                      :key="key"
                      :value="key"
                    >
                      {{ plan.nombre }} - ${{
                        plan.precio.toLocaleString()
                      }}
                      COP ({{ plan.descripcion }})
                    </option>
                  </select>
                  <small class="text-muted d-block mt-2">
                    Tu banner aparecerá en el slider principal del inicio
                  </small>
                </div>
              </div>

              <div class="mb-4">
                <h6 class="text-primary">Imagen del Banner</h6>
                <hr />

                <div class="mb-3">
                  <label class="form-label">
                    Subir imagen <span class="text-danger">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    @change="handleImagenChange"
                    class="form-control"
                    required
                    :disabled="isPending || uploadingImage"
                  />
                  <small class="text-muted d-block mt-1">
                    Formato recomendado: 800x220px (horizontal)
                  </small>
                </div>

                <div v-if="previsualizacion" class="preview-container">
                  <img :src="previsualizacion" class="preview-banner" />
                </div>
              </div>

              <!-- NUEVA SECCIÓN: Pago con Nequi -->
              <div class="mb-4">
                <h6 class="text-primary">Pago - Nequi</h6>
                <hr />

                <div class="nequi-payment-info">
                  <div class="nequi-header">
                    <i class="bi bi-wallet2"></i>
                    <h5>Realiza tu pago por Nequi</h5>
                  </div>

                  <div class="nequi-steps">
                    <div class="nequi-step">
                      <div class="step-number">1</div>
                      <div class="step-content">
                        <strong>Envía el dinero a:</strong>
                        <div class="nequi-number">
                          <i class="bi bi-phone-fill"></i>
                          {{ numeroNequi }}
                        </div>
                        <div class="plan-price">
                          ${{
                            planesPublicidad[
                              nuevoAnuncio.plan
                            ].precio.toLocaleString()
                          }}
                          COP
                        </div>
                      </div>
                    </div>

                    <div class="nequi-step">
                      <div class="step-number">2</div>
                      <div class="step-content">
                        <strong>Sube el comprobante de pago:</strong>
                        <input
                          type="file"
                          accept="image/*"
                          @change="handleComprobanteChange"
                          class="form-control mt-2"
                          required
                          :disabled="isPending || uploadingImage"
                        />
                        <small class="text-muted"
                          >Captura de pantalla del pago exitoso</small
                        >
                      </div>
                    </div>

                    <div
                      v-if="previsualizacionComprobante"
                      class="comprobante-preview"
                    >
                      <img
                        :src="previsualizacionComprobante"
                        alt="Comprobante"
                      />
                    </div>
                  </div>

                  <div class="alert alert-info mt-3">
                    <i class="bi bi-info-circle-fill me-2"></i>
                    <strong>Importante:</strong> Tu anuncio será revisado y
                    activado en máximo 24 horas después de verificar el pago.
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
                  :disabled="isPending || uploadingImage"
                >
                  <i class="bi bi-arrow-left me-2"></i>
                  Volver
                </button>
                <button
                  type="submit"
                  class="btn-modal-primary"
                  :disabled="isPending || uploadingImage"
                >
                  <span
                    v-if="isPending || uploadingImage"
                    class="spinner-border spinner-border-sm me-2"
                  ></span>
                  <i v-else class="bi bi-check-circle me-2"></i>
                  {{
                    uploadingImage
                      ? "Subiendo..."
                      : isPending
                      ? "Creando..."
                      : "Crear"
                  }}
                </button>
              </div>
            </form>

            <!-- Vista: Lista de Anuncios -->
            <div v-else>
              <div class="mb-4">
                <button @click="vistaActual = 'crear'" class="btn-crear-nuevo">
                  <i class="bi bi-plus-circle me-2"></i>
                  Crear Nuevo Anuncio
                </button>
              </div>

              <!-- Sin anuncios -->
              <div
                v-if="!cargando && misAnuncios.length === 0"
                class="empty-state"
              >
                <i class="bi bi-megaphone"></i>
                <h3>Sin Anuncios</h3>
                <p>Crea tu primer banner publicitario</p>
              </div>

              <!-- Lista -->
              <div v-else-if="!cargando" class="anuncios-grid">
                <div
                  v-for="ad in misAnuncios"
                  :key="ad.id"
                  class="anuncio-card"
                >
                  <div class="anuncio-imagen">
                    <img :src="ad.imagen" :alt="ad.titulo" />
                  </div>
                  <div class="anuncio-info">
                    <h6 class="anuncio-titulo">{{ ad.titulo }}</h6>
                    <div class="anuncio-detalles">
                      <span class="badge-plan">{{ ad.plan.nombre }}</span>
                      <span class="badge-slider">Slider Principal</span>
                    </div>
                    <div class="anuncio-stats">
                      <span
                        ><i class="bi bi-eye me-1"></i>
                        {{ ad.impresiones || 0 }} vistas</span
                      >
                      <span class="ms-3"
                        ><i class="bi bi-calendar-check me-1"></i>
                        {{ calcularDiasRestantes(ad.fechaFin) }} días
                        restantes</span
                      >
                    </div>
                    <span
                      :class="[
                        'badge-estado',
                        ad.estadoPago === 'pendiente'
                          ? 'pendiente'
                          : ad.estadoPago === 'rechazado'
                          ? 'rechazado'
                          : ad.activo && calcularDiasRestantes(ad.fechaFin) > 0
                          ? 'activo'
                          : 'inactivo',
                      ]"
                    >
                      {{
                        ad.estadoPago === "pendiente"
                          ? "Pendiente de aprobación"
                          : ad.estadoPago === "rechazado"
                          ? "Pago rechazado"
                          : ad.activo && calcularDiasRestantes(ad.fechaFin) > 0
                          ? "Activo"
                          : "Expirado"
                      }}
                    </span>

                    <!-- Motivo de rechazo -->
                    <div
                      v-if="ad.estadoPago === 'rechazado' && ad.motivoRechazo"
                      class="motivo-rechazo"
                    >
                      <div class="motivo-rechazo-header">
                        <i class="bi bi-info-circle-fill"></i>
                        <strong>Motivo del rechazo:</strong>
                      </div>
                      <p class="motivo-rechazo-texto">{{ ad.motivoRechazo }}</p>
                    </div>
                  </div>
                  <button @click="eliminarAnuncio(ad.id)" class="btn-eliminar">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>

              <!-- Loading con Spinner -->
              <Spinner v-else size="md" message="Cargando anuncios..." />
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
  display: flex;
  align-items: center;
}

.modal-title i {
  color: #667eea;
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

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #764ba2;
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

.preview-container {
  background: #f8f9ff;
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
}

.preview-banner {
  max-width: 100%;
  max-height: 250px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

.empty-state h3 {
  color: #666;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #999;
}

.anuncios-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.anuncio-card {
  background: #fff;
  border: 1px solid #e0e7ff;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
}

.anuncio-card:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.anuncio-imagen {
  width: 120px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
}

.anuncio-imagen img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.anuncio-info {
  flex: 1;
  min-width: 0;
}

.anuncio-titulo {
  margin: 0 0 0.5rem;
  font-weight: 700;
  color: #2d3561;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.anuncio-detalles {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.badge-plan,
.badge-slider {
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-plan {
  background: #e3f2fd;
  color: #1976d2;
}

.badge-slider {
  background: #e8f5e9;
  color: #2e7d32;
}

.anuncio-stats {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.badge-estado {
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-estado.activo {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge-estado.inactivo {
  background: #e0e0e0;
  color: #666;
}

.badge-estado.pendiente {
  background: #fff3cd;
  color: #856404;
}

.badge-estado.rechazado {
  background: #f8d7da;
  color: #721c24;
}

.btn-eliminar {
  background: #ffebee;
  color: #d32f2f;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-eliminar:hover {
  background: #d32f2f;
  color: #fff;
}

/* Nequi Payment */
.nequi-payment-info {
  background: linear-gradient(135deg, #fff5f7 0%, #ffe8f0 100%);
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid #ffc0d9;
}

.nequi-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.nequi-header i {
  font-size: 3rem;
  color: #e91e63;
  margin-bottom: 0.5rem;
}

.nequi-header h5 {
  color: #2d3561;
  font-weight: 700;
  margin: 0;
}

.nequi-steps {
  margin-bottom: 1rem;
}

.nequi-step {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: flex-start;
}

.step-number {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%);
  color: #fff;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content strong {
  display: block;
  color: #2d3561;
  margin-bottom: 0.5rem;
}

.nequi-number {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #e91e63;
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.2);
  margin: 0.5rem 0;
}

.plan-price {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2d3561;
  margin-top: 0.5rem;
}

.comprobante-preview {
  margin-top: 1rem;
  text-align: center;
}

.comprobante-preview img {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Motivo de Rechazo */
.motivo-rechazo {
  background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.75rem;
}

.motivo-rechazo-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc2626;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.motivo-rechazo-header i {
  font-size: 1rem;
}

.motivo-rechazo-texto {
  color: #991b1b;
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0;
  word-wrap: break-word;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-body {
    padding: 1.5rem;
  }

  .nequi-payment-info {
    padding: 1.25rem;
  }

  .nequi-header i {
    font-size: 2.5rem;
  }

  .nequi-header h5 {
    font-size: 1.1rem;
  }

  .nequi-step {
    flex-direction: column;
    gap: 0.75rem;
  }

  .step-number {
    width: 35px;
    height: 35px;
    font-size: 1.1rem;
  }

  .nequi-number {
    font-size: 1.25rem;
    padding: 0.6rem 1.25rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .plan-price {
    font-size: 1.5rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-modal-primary,
  .btn-modal-secondary {
    width: 100%;
  }

  .anuncio-card {
    flex-direction: column;
    align-items: stretch;
  }

  .anuncio-imagen {
    width: 100%;
    height: 150px;
  }

  .anuncio-titulo {
    font-size: 1rem;
  }

  .btn-eliminar {
    width: 100%;
    margin-top: 0.5rem;
  }
}

@media (max-width: 480px) {
  .nequi-number {
    font-size: 1.1rem;
    padding: 0.5rem 1rem;
  }

  .plan-price {
    font-size: 1.35rem;
  }

  .comprobante-preview img {
    max-height: 200px;
  }
}
</style>
