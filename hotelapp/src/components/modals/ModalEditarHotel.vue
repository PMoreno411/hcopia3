<script setup>
import { ref, watch } from "vue";
import { useAuth } from "../../composables/useAuth";
import { useFirestore } from "../../composables/useFirestore";
import { useStorage } from "../../composables/useStorage";
import { useToast } from "../../composables/useToast";
import { useConfirm } from "../../composables/useConfirm";
import Spinner from "../common/Spinner.vue";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  hotelId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["close", "hotel-actualizado"]);

const { user } = useAuth();
const { getDocument, updateDocument, isPending } = useFirestore("hotels");
const {
  uploadMultipleFiles,
  deleteMultipleFiles,
  extractPathFromUrl,
  isPending: uploadingImages,
} = useStorage();

const { success, error, warning } = useToast();

const resetForm = () => ({
  nombre: "",
  descripcion: "",
  telefono: "",
  email: "",
  direccion: "",
  whatsapp: "",
  servicios: [],
  imagenes: [],
  lat: "",
  lng: "",
});

const formulario = ref(resetForm());
const archivosNuevos = ref([]);
const previsualizaciones = ref([]);
const imagenesAEliminar = ref([]);
const cargando = ref(false);

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

const handleImagenesNuevas = (event) => {
  const incoming = Array.from(event.target.files).filter((f) =>
    f.type.startsWith("image/")
  );
  const espacioDisponible = Math.max(
    0,
    2 - (formulario.value.imagenes || []).length
  );
  if (espacioDisponible === 0) {
    warning("Ya tienes el máximo de 2 imágenes");
    archivosNuevos.value = [];
    previsualizaciones.value = [];
    return;
  }

  let combined = [...archivosNuevos.value, ...incoming];
  if (combined.length > espacioDisponible) {
    warning(`Solo puedes agregar ${espacioDisponible} imagen(es) más (máx. 2)`);
    combined = combined.slice(0, espacioDisponible);
  }

  archivosNuevos.value = combined;
  previsualizaciones.value = [];
  archivosNuevos.value.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => previsualizaciones.value.push(e.target.result);
    reader.readAsDataURL(file);
  });
};

const eliminarImagenExistente = async (index, url) => {
  const confirmed = await confirm(
    "¿Eliminar esta imagen?",
    "Confirmar eliminación"
  );

  if (confirmed) {
    formulario.value.imagenes.splice(index, 1);
    imagenesAEliminar.value.push(url);
  }
};

const cargarHotel = async () => {
  if (!props.hotelId) return;
  try {
    cargando.value = true;
    const hotel = await getDocument(props.hotelId);
    if (!hotel) {
      warning("Hotel no encontrado");
      cerrarModal();
      return;
    }
    if (hotel.userId !== user.value?.uid) {
      warning("No tienes permiso para editar este hotel");
      cerrarModal();
      return;
    }
    formulario.value = {
      nombre: hotel.nombre || "",
      descripcion: hotel.descripcion || "",
      telefono: hotel.telefono || "",
      email: hotel.email || "",
      direccion: hotel.direccion || "",
      whatsapp: hotel.whatsapp || "",
      servicios: hotel.servicios || [],
      imagenes: hotel.imagenes || [],
      lat: hotel.lat ?? hotel.latitude ?? "",
      lng: hotel.lng ?? hotel.longitude ?? "",
    };
    archivosNuevos.value = [];
    previsualizaciones.value = [];
    imagenesAEliminar.value = [];
  } catch (err) {
    console.error("Error al cargar hotel:", err);
    error("Error al cargar el hotel");
    cerrarModal();
  } finally {
    cargando.value = false;
  }
};

const actualizarHotel = async () => {
  if (!formulario.value.nombre || !formulario.value.descripcion) {
    warning("Por favor completa los campos obligatorios");
    return;
  }
  try {
    let imagenesUrls = [...(formulario.value.imagenes || [])];

    // eliminar marcadas
    if (imagenesAEliminar.value.length > 0) {
      const rutas = imagenesAEliminar.value
        .map((url) => extractPathFromUrl(url))
        .filter(Boolean);
      if (rutas.length > 0) {
        try {
          await deleteMultipleFiles(rutas);
        } catch (err) {
          console.warn("⚠️ Error al eliminar imágenes:", err);
        }
      }
      imagenesUrls = imagenesUrls.filter(
        (url) => !imagenesAEliminar.value.includes(url)
      );
    }

    // subir nuevas
    if (archivosNuevos.value.length > 0) {
      const resultados = await uploadMultipleFiles(
        archivosNuevos.value,
        `hotels/${user.value.uid}`
      );
      imagenesUrls = [...imagenesUrls, ...resultados.map((r) => r.url)];
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
      imagenes: imagenesUrls.slice(0, 2),
      lat: Number.isFinite(latNum) ? latNum : null,
      lng: Number.isFinite(lngNum) ? lngNum : null,
    };

    await updateDocument(props.hotelId, hotelData);
    emit("hotel-actualizado");
    success("Hotel actualizado exitosamente");
  } catch (err) {
    console.error("Error al actualizar hotel:", err);
    error("Error al actualizar el hotel. Intenta nuevamente.");
  }
};

const cerrarModal = () => {
  imagenesAEliminar.value = [];
  archivosNuevos.value = [];
  previsualizaciones.value = [];
  formulario.value = resetForm();
  emit("close");
};

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.hotelId) cargarHotel();
    if (!open) cerrarModal();
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
              <i class="bi bi-pencil-square me-2"></i>
              Editar Hotel
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="cerrarModal"
            ></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="actualizarHotel">
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

                <div class="mb-3">
                  <label class="form-label">Dirección</label>
                  <input
                    v-model="formulario.direccion"
                    type="text"
                    class="form-control"
                    placeholder="Calle Principal 123"
                    :disabled="isPending || uploadingImages"
                  />
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
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
                  <div class="col-md-6 mb-3">
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
                        :id="'edit-' + servicio"
                        :checked="formulario.servicios.includes(servicio)"
                        @change="toggleServicio(servicio)"
                        :disabled="isPending || uploadingImages"
                      />
                      <label class="form-check-label" :for="'edit-' + servicio">
                        {{ servicio }}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Imágenes -->
              <div class="mb-4">
                <h5 class="text-primary">Imágenes Actuales</h5>
                <hr />

                <div v-if="formulario.imagenes.length > 0" class="row g-2 mb-3">
                  <div
                    v-for="(img, idx) in formulario.imagenes"
                    :key="idx"
                    class="col-md-3"
                  >
                    <div class="position-relative">
                      <img
                        :src="img"
                        class="img-thumbnail"
                        style="width: 100%; height: 150px; object-fit: cover"
                      />
                      <button
                        type="button"
                        class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1"
                        @click="eliminarImagenExistente(idx, img)"
                        :disabled="isPending || uploadingImages"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Agregar más fotos</label>
                  <input
                    type="file"
                    class="form-control"
                    accept="image/*"
                    multiple
                    @change="handleImagenesNuevas"
                    :disabled="isPending || uploadingImages"
                  />
                </div>

                <!-- Previsualizaciones nuevas -->
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
                  ></span>
                  <i v-else class="bi bi-check-circle me-2"></i>
                  {{
                    uploadingImages
                      ? "Subiendo imágenes..."
                      : isPending
                      ? "Actualizando..."
                      : "Aceptar"
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
@import "../styles/ModalEditarHotel.css";
</style>
