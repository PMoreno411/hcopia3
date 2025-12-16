<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuth } from "../composables/useAuth";
import { useFirestore } from "../composables/useFirestore";
import { useStorage } from "../composables/useStorage";

const props = defineProps({
  hotelId: {
    type: String,
    default: "",
  },
  isModal: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["hotel-actualizado", "cancelar"]);

const router = useRouter();
const route = useRoute();
const { user } = useAuth();
const { getDocument, updateDocument, isPending } = useFirestore("hotels");
const {
  uploadMultipleFiles,
  deleteMultipleFiles,
  isPending: uploadingImages,
} = useStorage();

const hotelIdActual = ref(props.isModal ? props.hotelId : route.params.id);
const cargando = ref(true);
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
});

const archivosNuevos = ref([]);
const previsualizaciones = ref([]);
const imagenesAEliminar = ref([]);

const tasaCambio = 4000;

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
  const files = Array.from(event.target.files);
  archivosNuevos.value = files;

  previsualizaciones.value = [];
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      previsualizaciones.value.push(e.target.result);
    };
    reader.readAsDataURL(file);
  });
};

const eliminarImagenExistente = (index, url) => {
  if (confirm("¿Eliminar esta imagen?")) {
    formulario.value.imagenes.splice(index, 1);
    imagenesAEliminar.value.push(url);
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

const actualizarHotel = async () => {
  if (!formulario.value.precioCop && !formulario.value.precio) {
    alert("Ingresa el precio en COP");
    return;
  }
  handlePrecioCopChange();

  try {
    if (imagenesAEliminar.value.length > 0) {
      const rutasAEliminar = imagenesAEliminar.value.map((url) => {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split("/");
        const bucketIndex = pathParts.indexOf("public") + 1;
        return pathParts.slice(bucketIndex + 1).join("/");
      });

      try {
        await deleteMultipleFiles(rutasAEliminar);
      } catch (err) {
        console.warn("Error al eliminar imágenes:", err);
      }
    }

    let nuevasImagenesUrls = [];
    if (archivosNuevos.value.length > 0) {
      const resultados = await uploadMultipleFiles(
        archivosNuevos.value,
        `hotels/${user.value.uid}`
      );
      nuevasImagenesUrls = resultados.map((r) => r.url);
    }

    const hotelData = {
      nombre: formulario.value.nombre,
      descripcion: formulario.value.descripcion,
      precio: parseFloat(formulario.value.precio) || 0,
      precioCop: parseInt(formulario.value.precioCop) || 0,
      telefono: formulario.value.telefono,
      email: formulario.value.email,
      direccion: formulario.value.direccion,
      whatsapp: formulario.value.whatsapp,
      servicios: formulario.value.servicios,
      imagenes: [...formulario.value.imagenes, ...nuevasImagenesUrls],
    };

    await updateDocument(hotelIdActual.value, hotelData);
    alert("¡Hotel actualizado exitosamente!");

    if (props.isModal) {
      emit("hotel-actualizado");
    } else {
      router.push("/dashboard");
    }
  } catch (error) {
    console.error("Error al actualizar hotel:", error);
    alert("Error al actualizar el hotel: " + error.message);
  }
};

const cancelar = () => {
  if (props.isModal) {
    emit("cancelar");
  } else {
    router.push("/dashboard");
  }
};

const cargarHotel = async () => {
  try {
    cargando.value = true;
    const hotel = await getDocument(hotelIdActual.value);

    if (hotel.userId !== user.value?.uid) {
      alert("No tienes permiso para editar este hotel");
      if (props.isModal) {
        emit("cancelar");
      } else {
        router.push("/dashboard");
      }
      return;
    }

    formulario.value = {
      nombre: hotel.nombre,
      descripcion: hotel.descripcion,
      precio: hotel.precio || 0,
      precioCop:
        hotel.precioCop ??
        (hotel.precio ? Math.round(hotel.precio * tasaCambio) : ""),
      telefono: hotel.telefono || "",
      email: hotel.email || "",
      direccion: hotel.direccion || "",
      whatsapp: hotel.whatsapp || "",
      servicios: hotel.servicios || [],
      imagenes: hotel.imagenes || [],
    };
  } catch (err) {
    console.error("Error al cargar hotel:", err);
    alert("Error al cargar el hotel");
    if (props.isModal) {
      emit("cancelar");
    } else {
      router.push("/dashboard");
    }
  } finally {
    cargando.value = false;
  }
};

watch(
  () => props.hotelId,
  (newId) => {
    if (newId && props.isModal) {
      hotelIdActual.value = newId;
      imagenesAEliminar.value = [];
      archivosNuevos.value = [];
      previsualizaciones.value = [];
      cargarHotel();
    }
  }
);

onMounted(() => {
  if (!user.value) {
    if (props.isModal) {
      emit("cancelar");
    } else {
      router.push("/login");
    }
    return;
  }
  cargarHotel();
});
</script>

<template>
  <div :class="{ 'row justify-content-center': !isModal }">
    <div :class="isModal ? '' : 'col-lg-8'">
      <!-- Loading -->
      <div v-if="cargando" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="mt-3">Cargando datos del hotel...</p>
      </div>

      <div v-else :class="isModal ? '' : 'card shadow'">
        <div :class="isModal ? '' : 'card-body p-4'">
          <h2 v-if="!isModal" class="card-title mb-4">
            <i class="bi bi-pencil"></i> Editar Hotel
          </h2>

          <form @submit.prevent="actualizarHotel">
            <!-- Información básica -->
            <div class="mb-4">
              <h5 class="text-primary">Información Básica</h5>
              <hr />

              <div class="mb-3">
                <label class="form-label"
                  >Nombre del Hotel <span class="text-danger">*</span></label
                >
                <input
                  v-model="formulario.nombre"
                  type="text"
                  class="form-control"
                  required
                  :disabled="isPending || uploadingImages"
                />
              </div>

              <div class="mb-3">
                <label class="form-label"
                  >Descripción <span class="text-danger">*</span></label
                >
                <textarea
                  v-model="formulario.descripcion"
                  class="form-control"
                  rows="4"
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
                  <label class="form-label">Teléfono</label>
                  <input
                    v-model="formulario.telefono"
                    type="tel"
                    class="form-control"
                    :disabled="isPending || uploadingImages"
                  />
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Dirección</label>
                  <input
                    v-model="formulario.direccion"
                    type="text"
                    class="form-control"
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
                  <label class="form-label"
                    ><i class="bi bi-telephone"></i> Teléfono</label
                  >
                  <input
                    v-model="formulario.telefono"
                    type="tel"
                    class="form-control"
                    :disabled="isPending || uploadingImages"
                  />
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label"
                    ><i class="bi bi-whatsapp"></i> WhatsApp</label
                  >
                  <input
                    v-model="formulario.whatsapp"
                    type="tel"
                    class="form-control"
                    :disabled="isPending || uploadingImages"
                  />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label"
                  ><i class="bi bi-envelope"></i> Email</label
                >
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
                    <label class="form-check-label" :for="servicio">{{
                      servicio
                    }}</label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Imágenes existentes -->
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
                    ? "Actualizando..."
                    : "Actualizar Hotel"
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
