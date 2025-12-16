<script setup>
import { ref, watch } from "vue";
import { useAuth } from "../../composables/useAuth";
import { useFirestore } from "../../composables/useFirestore";
import { useStorage } from "../../composables/useStorage";
import { useToast } from "../../composables/useToast";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  articuloId: { type: String, default: null },
});

const emit = defineEmits(["close", "articulo-guardado"]);

const { user } = useAuth();
const { addDocument, getDocument, updateDocument, isPending } =
  useFirestore("articles");
const { uploadFile, isPending: uploadingImage } = useStorage();
const { success, error, warning } = useToast();

const formulario = ref({
  titulo: "",
  resumen: "",
  contenido: "",
  categoria: "turismo",
  publicado: true,
  imagenDestacada: "",
});

const imagenSeleccionada = ref(null);
const previsualizacion = ref("");
const cargando = ref(false);

const categorias = [
  { value: "turismo", label: "Turismo" },
  { value: "gastronomia", label: "Gastronomía" },
  { value: "consejos", label: "Consejos" },
  { value: "eventos", label: "Eventos" },
  { value: "cultura", label: "Cultura" },
];

const handleImagenChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    imagenSeleccionada.value = file;
    const reader = new FileReader();
    reader.onload = (e) => (previsualizacion.value = e.target.result);
    reader.readAsDataURL(file);
  }
};

const cargarArticulo = async () => {
  if (!props.articuloId) return;
  try {
    cargando.value = true;
    const articulo = await getDocument(props.articuloId);
    formulario.value = {
      titulo: articulo.titulo,
      resumen: articulo.resumen,
      contenido: articulo.contenido,
      categoria: articulo.categoria,
      publicado: articulo.publicado,
      imagenDestacada: articulo.imagenDestacada,
    };
    previsualizacion.value = articulo.imagenDestacada || "";
  } catch (err) {
    console.error("Error al cargar artículo:", err);
    error("Error al cargar el artículo");
  } finally {
    cargando.value = false;
  }
};

const guardarArticulo = async () => {
  if (
    !formulario.value.titulo ||
    !formulario.value.resumen ||
    !formulario.value.contenido
  ) {
    warning("Completa todos los campos obligatorios");
    return;
  }

  try {
    let imagenUrl = formulario.value.imagenDestacada;

    if (imagenSeleccionada.value) {
      const resultado = await uploadFile(
        imagenSeleccionada.value,
        `articles/${user.value.uid}`
      );
      imagenUrl = resultado.url;
    }

    const articuloData = {
      titulo: formulario.value.titulo,
      resumen: formulario.value.resumen,
      contenido: formulario.value.contenido,
      categoria: formulario.value.categoria,
      publicado: formulario.value.publicado,
      imagenDestacada: imagenUrl,
      autorId: user.value.uid,
      autorNombre: user.value.displayName || user.value.email,
      vistas: 0,
    };

    if (props.articuloId) {
      await updateDocument(props.articuloId, articuloData);
      success("¡Artículo actualizado!");
    } else {
      await addDocument(articuloData);
      success("¡Artículo publicado!");
    }

    emit("articulo-guardado");
    limpiarFormulario();
  } catch (err) {
    console.error("Error:", err);
    error("Error al guardar artículo");
  }
};

const limpiarFormulario = () => {
  formulario.value = {
    titulo: "",
    resumen: "",
    contenido: "",
    categoria: "turismo",
    publicado: true,
    imagenDestacada: "",
  };
  imagenSeleccionada.value = null;
  previsualizacion.value = "";
};

const cerrarModal = () => {
  limpiarFormulario();
  emit("close");
};

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal && props.articuloId) {
      cargarArticulo();
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
        class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-pencil-square me-2"></i>
              {{ articuloId ? "Editar Artículo" : "Crear Artículo" }}
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="cerrarModal"
            ></button>
          </div>

          <div class="modal-body">
            <form @submit.prevent="guardarArticulo">
              <div class="row">
                <!-- Columna izquierda -->
                <div class="col-lg-8">
                  <div class="mb-3">
                    <label class="form-label">
                      Título <span class="text-danger">*</span>
                    </label>
                    <input
                      v-model="formulario.titulo"
                      type="text"
                      class="form-control"
                      placeholder="Título atractivo para tu artículo"
                      required
                      :disabled="isPending || uploadingImage"
                    />
                  </div>

                  <div class="mb-3">
                    <label class="form-label">
                      Resumen <span class="text-danger">*</span>
                    </label>
                    <textarea
                      v-model="formulario.resumen"
                      class="form-control"
                      rows="2"
                      placeholder="Breve descripción (máx. 200 caracteres)"
                      maxlength="200"
                      required
                      :disabled="isPending || uploadingImage"
                    ></textarea>
                    <small class="text-muted"
                      >{{ formulario.resumen.length }}/200</small
                    >
                  </div>

                  <div class="mb-3">
                    <label class="form-label">
                      Contenido <span class="text-danger">*</span>
                    </label>
                    <textarea
                      v-model="formulario.contenido"
                      class="form-control"
                      rows="12"
                      placeholder="Escribe tu artículo aquí... Puedes usar saltos de línea para párrafos."
                      required
                      :disabled="isPending || uploadingImage"
                    ></textarea>
                  </div>
                </div>

                <!-- Columna derecha -->
                <div class="col-lg-4">
                  <div class="mb-3">
                    <label class="form-label">Categoría</label>
                    <select
                      v-model="formulario.categoria"
                      class="form-select"
                      :disabled="isPending || uploadingImage"
                    >
                      <option
                        v-for="cat in categorias"
                        :key="cat.value"
                        :value="cat.value"
                      >
                        {{ cat.label }}
                      </option>
                    </select>
                  </div>

                  <div class="mb-3">
                    <label class="form-label">Imagen destacada</label>
                    <input
                      type="file"
                      accept="image/*"
                      @change="handleImagenChange"
                      class="form-control"
                      :disabled="isPending || uploadingImage"
                    />
                    <small class="text-muted"
                      >Imagen principal del artículo</small
                    >
                  </div>

                  <div v-if="previsualizacion" class="mb-3 preview-container">
                    <img
                      :src="previsualizacion"
                      alt="Preview"
                      class="preview-img"
                    />
                  </div>

                  <div class="mb-3">
                    <div class="form-check form-switch">
                      <input
                        v-model="formulario.publicado"
                        class="form-check-input"
                        type="checkbox"
                        id="publicadoSwitch"
                        :disabled="isPending || uploadingImage"
                      />
                      <label class="form-check-label" for="publicadoSwitch">
                        Publicar inmediatamente
                      </label>
                    </div>
                    <small class="text-muted"
                      >Si está desactivado, el artículo será un borrador</small
                    >
                  </div>
                </div>
              </div>

              <div class="modal-actions">
                <button
                  type="button"
                  class="btn-modal-secondary"
                  @click="cerrarModal"
                  :disabled="isPending || uploadingImage"
                >
                  <i class="bi bi-x-circle me-2"></i>
                  Cancelar
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
                      ? "Subiendo imagen..."
                      : isPending
                      ? "Guardando..."
                      : articuloId
                      ? "Actualizar"
                      : "Publicar"
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

.modal-xl {
  max-width: 1000px;
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

.preview-container {
  background: #f8f9ff;
  padding: 0.75rem;
  border-radius: 12px;
}

.preview-img {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

.form-check-input:checked {
  background-color: #667eea;
  border-color: #667eea;
}
</style>
