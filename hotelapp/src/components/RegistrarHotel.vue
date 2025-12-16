<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import { useFirestore } from "../composables/useFirestore";
import { useStorage } from "../composables/useStorage";
import { useToast } from "../composables/useToast";

const props = defineProps({
  isModal: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["hotel-registrado", "cancelar"]);

const router = useRouter();
const { user } = useAuth();
const { addDocument, isPending } = useFirestore("hotels");
const { uploadMultipleFiles, isPending: uploadingImages } = useStorage();
const { success, error, warning } = useToast();

const tasaCambio = 4000;

const formulario = ref({
  nombre: "",
  descripcion: "",
  precioCop: "",
  precio: "",
  telefono: "",
  email: "",
  direccion: "",
  whatsapp: "",
  servicios: [],
  imagenes: [],
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

const handlePrecioCopChange = () => {
  const cop = parseFloat(formulario.value.precioCop) || 0;
  formulario.value.precio = cop > 0 ? +(cop / tasaCambio).toFixed(2) : "";
};

const handlePrecioUsdChange = () => {
  const usd = parseFloat(formulario.value.precio) || 0;
  formulario.value.precioCop = usd > 0 ? Math.round(usd * tasaCambio) : "";
};

const handleImagenes = (event) => {
  const files = Array.from(event.target.files);
  if (files.length > 2) {
    warning("Máximo 2 imágenes por hotel");
  }
  const validFiles = files
    .filter((f) => f.type.startsWith("image/"))
    .slice(0, 2);
  if (validFiles.length !== files.slice(0, 2).length) {
    warning("Solo se permiten archivos de imagen");
  }
  archivosSeleccionados.value = validFiles;

  // Crear previsualizaciones
  previsualizaciones.value = [];
  archivosSeleccionados.value.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => previsualizaciones.value.push(e.target.result);
    reader.readAsDataURL(file);
  });
};

const registrarHotel = async () => {
  if (!user.value) {
    warning("Debes iniciar sesión para registrar un hotel");
    if (!props.isModal) router.push("/login");
    return;
  }

  if (
    !formulario.value.nombre ||
    !formulario.value.descripcion ||
    !formulario.value.precioCop
  ) {
    warning("Por favor completa los campos obligatorios");
    return;
  }

  try {
    let imagenesUrls = [];

    if (archivosSeleccionados.value.length > 0) {
      console.log("📤 Subiendo imágenes a Supabase...");

      try {
        const resultados = await uploadMultipleFiles(
          archivosSeleccionados.value,
          `hotels/${user.value.uid}`
        );
        imagenesUrls = resultados.map((r) => r.url);
        console.log("✅ Imágenes subidas:", imagenesUrls);
      } catch (uploadError) {
        console.error("❌ Error subiendo imágenes:", uploadError);

        if (uploadError.message?.includes("bucket")) {
          warning(
            "El bucket 'hotel-images' no está configurado. Créalo y márcalo como público."
          );
        } else {
          error("Error al subir imágenes: " + uploadError.message);
        }
        return;
      }
    }

    const latNum = parseFloat(formulario.value.lat);
    const lngNum = parseFloat(formulario.value.lng);

    const hotelData = {
      nombre: formulario.value.nombre,
      descripcion: formulario.value.descripcion,
      precioCop: parseInt(formulario.value.precioCop) || 0,
      precio: parseFloat(formulario.value.precio) || 0,
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

    console.log("💾 Guardando hotel en Firestore...");

    await addDocument(hotelData);

    success("¡Hotel registrado exitosamente!");

    // Limpiar formulario
    formulario.value = {
      nombre: "",
      descripcion: "",
      precioCop: "",
      precio: "",
      telefono: "",
      email: "",
      direccion: "",
      whatsapp: "",
      servicios: [],
      imagenes: [],
      lat: "",
      lng: "",
    };
    archivosSeleccionados.value = [];
    previsualizaciones.value = [];

    if (props.isModal) {
      emit("hotel-registrado");
    } else {
      router.push("/dashboard");
    }
  } catch (err) {
    console.error("❌ Error al registrar hotel:", err);
    error("Error al registrar el hotel: " + err.message);
  }
};

const cancelar = () => {
  if (props.isModal) {
    emit("cancelar");
  } else {
    router.push("/dashboard");
  }
};

onMounted(() => {
  if (!user.value && !props.isModal) {
    router.push("/login");
  }
});
</script>

<template>
  <div :class="{ 'row justify-content-center': !isModal }">
    <div :class="isModal ? '' : 'col-lg-8'">
      <div :class="isModal ? '' : 'card shadow'">
        <div :class="isModal ? '' : 'card-body p-4'">
          <h2 v-if="!isModal" class="card-title mb-4">
            <i class="bi bi-building"></i> Registrar Nuevo Hotel
          </h2>

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
                  placeholder="Describe tu hotel, sus características principales..."
                  required
                  :disabled="isPending || uploadingImages"
                ></textarea>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">
                    Precio por noche (COP) <span class="text-danger">*</span>
                  </label>
                  <input
                    v-model="formulario.precioCop"
                    @input="handlePrecioCopChange"
                    type="number"
                    class="form-control"
                    placeholder="400000"
                    min="0"
                    required
                    :disabled="isPending || uploadingImages"
                  />
                  <small class="text-muted"
                    >Se convierte automáticamente a USD</small
                  >
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Precio en USD (auto)</label>
                  <input
                    v-model="formulario.precio"
                    @input="handlePrecioUsdChange"
                    type="number"
                    class="form-control"
                    placeholder="100"
                    min="0"
                    :disabled="isPending || uploadingImages"
                  />
                  <small class="text-muted"
                    >Tasa: 1 USD = {{ tasaCambio }} COP</small
                  >
                </div>
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
                    placeholder="+1 234 567 890"
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
                    placeholder="+1 234 567 890"
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
                  placeholder="contacto@hotel.com"
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
                <small class="text-muted"> Máximo 2 imágenes </small>
              </div>

              <!-- Previsualizaciones -->
              <div v-if="previsualizaciones.length > 0" class="row g-2 mt-2">
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
            <div class="d-flex gap-2">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="isPending || uploadingImages"
              >
                <span
                  v-if="isPending || uploadingImages"
                  class="spinner-border spinner-border-sm me-2"
                ></span>
                <i v-else class="bi bi-check-circle"></i>
                {{
                  uploadingImages
                    ? "Subiendo imágenes..."
                    : isPending
                    ? "Registrando..."
                    : "Registrar Hotel"
                }}
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="cancelar"
                :disabled="isPending || uploadingImages"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-check-input:checked {
  background-color: #0d6efd;
  border-color: #0d6efd;
}
</style>
