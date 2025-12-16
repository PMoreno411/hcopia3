<script setup>
import { ref } from "vue";
import { useAuth } from "../../composables/useAuth";
import { useFirestore } from "../../composables/useFirestore";
import { useStorage } from "../../composables/useStorage";
import { useToast } from "../../composables/useToast";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "hotel-registrado"]);

const { user } = useAuth();
const { addDocument, isPending } = useFirestore("hotels");
const { uploadMultipleFiles, isPending: uploadingImages } = useStorage();
const { success, error, warning } = useToast();

const formulario = ref({
  nombre: "",
  descripcion: "",
  telefono: "",
  email: "",
  direccion: "",
  whatsapp: "",
  servicios: [],
  lat: "",
  lng: "",
});

const archivosSeleccionados = ref([]);
const previsualizaciones = ref([]);

const serviciosDisponibles = [
  "WiFi",
  "Estacionamiento",
  "Desayuno incluido",
  "Piscina",
  "Gimnasio",
  "Aire acondicionado",
  "TV por cable",
  "Servicio a la habitación",
  "Bar/Restaurante",
  "Lavandería",
];

const toggleServicio = (servicio) => {
  const index = formulario.value.servicios.indexOf(servicio);
  if (index > -1) {
    formulario.value.servicios.splice(index, 1);
  } else {
    formulario.value.servicios.push(servicio);
  }
};

const handleImagenes = (event) => {
  const incoming = Array.from(event.target.files).filter((f) =>
    f.type.startsWith("image/")
  );
  if (incoming.length === 0) return;

  let combined = [...archivosSeleccionados.value, ...incoming];
  if (combined.length > 2) {
    warning("Máximo 2 imágenes por hotel");
    combined = combined.slice(0, 2);
  }

  archivosSeleccionados.value = combined;

  previsualizaciones.value = [];
  archivosSeleccionados.value.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => previsualizaciones.value.push(e.target.result);
    reader.readAsDataURL(file);
  });
};

const registrarHotel = async () => {
  if (!formulario.value.nombre || !formulario.value.descripcion) {
    warning("Por favor completa los campos obligatorios");
    return;
  }

  try {
    let imagenesUrls = [];

    if (archivosSeleccionados.value.length > 0) {
      const resultados = await uploadMultipleFiles(
        archivosSeleccionados.value,
        `hotels/${user.value.uid}`
      );
      imagenesUrls = resultados.map((r) => r.url);
    }

    const latNum = parseFloat(formulario.value.lat);
    const lngNum = parseFloat(formulario.value.lng);

    const hotelData = {
      nombre: formulario.value.nombre,
      descripcion: formulario.value.descripcion,
      telefono: formulario.value.telefono,
      email: formulario.value.email,
      direccion: formulario.value.direccion,
      whatsapp: formulario.value.whatsapp,
      servicios: formulario.value.servicios,
      imagenes: imagenesUrls,
      userId: user.value.uid,
      userName: user.value.displayName || user.value.email,
      visitas: 0,
      resenas: 0,
      calificacion: 0,
      lat: Number.isFinite(latNum) ? latNum : null,
      lng: Number.isFinite(lngNum) ? lngNum : null,
    };

    await addDocument(hotelData);
    limpiarFormulario();
    emit("hotel-registrado");
  } catch (err) {
    console.error("❌ Error al registrar hotel:", err);
    error("Error al registrar el hotel. Intenta nuevamente.");
  }
};

const limpiarFormulario = () => {
  formulario.value = {
    nombre: "",
    descripcion: "",
    telefono: "",
    email: "",
    direccion: "",
    whatsapp: "",
    servicios: [],
    lat: "",
    lng: "",
  };
  archivosSeleccionados.value = [];
  previsualizaciones.value = [];
};

const cerrarModal = () => {
  limpiarFormulario();
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
      <div
        class="modal-dialog modal-dialog-centered modal-dialog-scrollable custom-modal-lg"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-circle me-2"></i>
              Registrar Nuevo Hotel
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="cerrarModal"
            ></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="registrarHotel">
              <!-- Información básica -->
              <div class="mb-4">
                <h5 class="text-primary">Información Básica</h5>
                <hr />

                <div class="mb-3">
                  <label class="form-label">
                    Nombre del Hotel <span class="text-danger">*</span>
                  </label>
                  <input
                    v-model="formulario.nombre"
                    type="text"
                    class="form-control"
                    placeholder="Ej: Hotel Paradise"
                    required
                    :disabled="isPending || uploadingImages"
                  />
                </div>

                <div class="mb-3">
                  <label class="form-label">
                    Descripción <span class="text-danger">*</span>
                  </label>
                  <textarea
                    v-model="formulario.descripcion"
                    class="form-control"
                    rows="4"
                    placeholder="Describe tu hotel..."
                    required
                    :disabled="isPending || uploadingImages"
                  ></textarea>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Dirección</label>
                    <input
                      v-model="formulario.direccion"
                      type="text"
                      class="form-control"
                      placeholder="Calle Principal 123"
                      :disabled="isPending || uploadingImages"
                    />
                  </div>
                  <div class="col-md-3 mb-3">
                    <label class="form-label">Latitud</label>
                    <input
                      v-model="formulario.lat"
                      type="number"
                      step="0.000001"
                      class="form-control"
                      placeholder="4.65"
                      :disabled="isPending || uploadingImages"
                    />
                  </div>
                  <div class="col-md-3 mb-3">
                    <label class="form-label">Longitud</label>
                    <input
                      v-model="formulario.lng"
                      type="number"
                      step="0.000001"
                      class="form-control"
                      placeholder="-74.06"
                      :disabled="isPending || uploadingImages"
                    />
                  </div>
                </div>
              </div>

              <!-- Contacto -->
              <div class="mb-4">
                <h5 class="text-primary">Información de Contacto</h5>
                <hr />

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">
                      <i class="bi bi-telephone"></i> Teléfono
                    </label>
                    <input
                      v-model="formulario.telefono"
                      type="tel"
                      class="form-control"
                      :disabled="isPending || uploadingImages"
                    />
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">
                      <i class="bi bi-whatsapp"></i> WhatsApp
                    </label>
                    <input
                      v-model="formulario.whatsapp"
                      type="tel"
                      class="form-control"
                      :disabled="isPending || uploadingImages"
                    />
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">
                    <i class="bi bi-envelope"></i> Email
                  </label>
                  <input
                    v-model="formulario.email"
                    type="email"
                    class="form-control"
                    :disabled="isPending || uploadingImages"
                  />
                </div>
              </div>

              <!-- Servicios -->
              <div class="mb-4">
                <h5 class="text-primary">Servicios Disponibles</h5>
                <hr />

                <div class="row g-2">
                  <div
                    v-for="servicio in serviciosDisponibles"
                    :key="servicio"
                    class="col-md-6"
                  >
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :id="servicio"
                        :checked="formulario.servicios.includes(servicio)"
                        @change="toggleServicio(servicio)"
                        :disabled="isPending || uploadingImages"
                      />
                      <label class="form-check-label" :for="servicio">
                        {{ servicio }}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Imágenes -->
              <div class="mb-4">
                <h5 class="text-primary">Imágenes</h5>
                <hr />

                <div class="mb-3">
                  <label class="form-label">Subir fotos del hotel</label>
                  <input
                    type="file"
                    class="form-control"
                    accept="image/*"
                    multiple
                    @change="handleImagenes"
                    :disabled="isPending || uploadingImages"
                  />
                  <small class="text-muted">Máximo 2 imágenes</small>
                </div>

                <!-- Previsualizaciones -->
                <div v-if="previsualizaciones.length > 0" class="row g-2">
                  <div
                    v-for="(preview, idx) in previsualizaciones"
                    :key="idx"
                    class="col-md-3"
                  >
                    <img
                      :src="preview"
                      class="img-thumbnail"
                      style="width: 100%; height: 150px; object-fit: cover"
                    />
                  </div>
                </div>
              </div>

              <!-- Botones -->
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn-modal-secondary"
                  @click="cerrarModal"
                  :disabled="isPending || uploadingImages"
                >
                  <i class="bi bi-x-circle me-2"></i>
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="btn-modal-primary"
                  :disabled="isPending || uploadingImages"
                >
                  <span
                    v-if="isPending || uploadingImages"
                    class="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <i v-else class="bi bi-check-circle me-2"></i>
                  {{
                    uploadingImages
                      ? "Subiendo imágenes..."
                      : isPending
                      ? "Registrando..."
                      : "Registrar"
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
@import "../styles/ModalRegistrarHotel.css";
</style>
