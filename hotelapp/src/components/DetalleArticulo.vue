<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import { useFirestore } from "../composables/useFirestore";
import { useModal } from "../composables/useModal";
import { useToast } from "../composables/useToast";
import { useConfirm } from "../composables/useConfirm";
import ModalArticulo from "./modals/ModalArticulo.vue";
import Spinner from "./common/Spinner.vue";
import { useStorage } from "../composables/useStorage";

const route = useRoute();
const router = useRouter();
const { user } = useAuth();
const { getDocument, updateDocument, deleteDocument } =
  useFirestore("articles");
const {
  isOpen: modalEditarOpen,
  openModal: openEditar,
  closeModal: closeEditar,
} = useModal();
const { success, error } = useToast();
const { confirmDelete } = useConfirm();
const { deleteFile, extractPathFromUrl } = useStorage();

const articulo = ref(null);
const cargando = ref(true);
const likes = ref([]);

const esAutor = computed(
  () =>
    user.value && articulo.value && articulo.value.autorId === user.value.uid
);

const categorias = {
  turismo: { label: "Turismo", class: "turismo" },
  gastronomia: { label: "Gastronomía", class: "gastronomia" },
  consejos: { label: "Consejos", class: "consejos" },
  eventos: { label: "Eventos", class: "eventos" },
  cultura: { label: "Cultura", class: "cultura" },
};

const likesCount = computed(
  () => likes.value.length || articulo.value?.likesCount || 0
);
const yaDioLike = computed(
  () => !!(user.value && likes.value.includes(user.value.uid))
);

const toggleLike = async () => {
  // No permitir likes en borradores
  if (!articulo.value.publicado) {
    warning("No puedes dar like a un borrador");
    return;
  }

  if (!user.value) {
    error("Inicia sesión para dar like");
    return;
  }
  const articuloId = route.params.id;
  const currentLikes = new Set(likes.value);
  const yaEstaba = currentLikes.has(user.value.uid);

  yaEstaba
    ? currentLikes.delete(user.value.uid)
    : currentLikes.add(user.value.uid);

  const newLikesArr = Array.from(currentLikes);
  try {
    await updateDocument(articuloId, {
      likes: newLikesArr,
      likesCount: newLikesArr.length,
    });
    likes.value = newLikesArr;
    if (!yaEstaba) success("¡Te gustó este artículo!");
  } catch (err) {
    console.error("Error al dar like:", err);
    error("No se pudo registrar tu like");
  }
};

const cargarArticulo = async () => {
  try {
    cargando.value = true;
    const articuloId = route.params.id;
    articulo.value = await getDocument(articuloId);

    // Verificar si está oculto y el usuario no es el autor
    if (articulo.value.oculto && articulo.value.userId !== user.value?.uid) {
      warning("Este artículo no está disponible");
      router.push("/magazine");
      return;
    }

    likes.value = articulo.value.likes || [];

    // Solo incrementar vistas si está publicado
    if (articulo.value.publicado) {
      const nuevasVistas = (articulo.value.vistas || 0) + 1;
      await updateDocument(articuloId, { vistas: nuevasVistas });
      articulo.value.vistas = nuevasVistas;
    }
  } catch (err) {
    console.error("Error al cargar artículo:", err);
    error("Artículo no encontrado");
    router.push("/magazine");
  } finally {
    cargando.value = false;
  }
};

const eliminarArticulo = async () => {
  const confirmed = await confirmDelete(
    `¿Eliminar "${articulo.value.titulo}"?`
  );
  if (!confirmed) return;

  try {
    // Eliminar imagen destacada de Supabase si existe
    if (articulo.value?.imagenDestacada) {
      const rutaImagen = extractPathFromUrl(articulo.value.imagenDestacada);
      if (rutaImagen) {
        try {
          await deleteFile(rutaImagen);
          console.log("✅ Imagen del artículo eliminada de Supabase");
        } catch (err) {
          console.warn("⚠️ Error al eliminar imagen:", err);
        }
      }
    }

    await deleteDocument(route.params.id);
    success("Artículo eliminado");
    router.push("/magazine");
  } catch (err) {
    console.error("Error:", err);
    error("Error al eliminar");
  }
};

const handleArticuloActualizado = async () => {
  closeEditar();
  await cargarArticulo();
  success("¡Artículo actualizado!");
};

const compartirEnFacebook = () => {
  const url = window.location.href;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url
  )}`;
  window.open(facebookUrl, "_blank", "width=600,height=400");
};

const compartirEnTwitter = () => {
  const url = window.location.href;
  const texto = `${articulo.value.titulo} - ${articulo.value.resumen}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
    url
  )}&text=${encodeURIComponent(texto)}`;
  window.open(twitterUrl, "_blank", "width=600,height=400");
};

const compartirEnWhatsApp = () => {
  const url = window.location.href;
  const texto = `${articulo.value.titulo}\n\n${articulo.value.resumen}\n\n${url}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(whatsappUrl, "_blank");
};

onMounted(() => {
  cargarArticulo();
});
</script>

<template>
  <div>
    <Spinner v-if="cargando" size="lg" message="Cargando artículo..." />

    <template v-else-if="articulo">
      <!-- Header del artículo -->
      <div class="article-header">
        <div class="breadcrumb-nav">
          <router-link to="/magazine" class="breadcrumb-link">
            <i class="bi bi-arrow-left me-2"></i>
            Volver al Magazine
          </router-link>
        </div>

        <span
          :class="[
            'category-badge-large',
            categorias[articulo.categoria].class,
          ]"
        >
          {{ categorias[articulo.categoria].label }}
        </span>

        <h1 class="article-title">
          {{ articulo.titulo }}
          <span v-if="!articulo.publicado" class="draft-badge-inline">
            (Borrador)
          </span>
        </h1>

        <div class="article-meta">
          <div class="author-info">
            <i class="bi bi-person-circle"></i>
            <span>{{ articulo.autorNombre }}</span>
          </div>
          <div class="date-info">
            <i class="bi bi-calendar3"></i>
            <span>{{
              articulo.createdAt
                ? new Date(
                    articulo.createdAt.seconds * 1000
                  ).toLocaleDateString()
                : "Reciente"
            }}</span>
          </div>
          <div class="views-info">
            <i class="bi bi-eye-fill"></i>
            <span>{{ articulo.vistas || 0 }} vistas</span>
          </div>
          <div class="likes-info" v-if="articulo.publicado">
            <button
              class="btn-like"
              :class="{ active: yaDioLike }"
              @click="toggleLike"
            >
              <i :class="yaDioLike ? 'bi bi-heart-fill' : 'bi bi-heart'"></i>
              <span>{{ likesCount }}</span>
            </button>
          </div>
        </div>

        <!-- Botones de acción si es autor -->
        <div v-if="esAutor" class="author-actions">
          <button @click="openEditar" class="btn-action-edit">
            <i class="bi bi-pencil me-2"></i>
            Editar
          </button>
          <button @click="eliminarArticulo" class="btn-action-delete">
            <i class="bi bi-trash me-2"></i>
            Eliminar
          </button>
        </div>
      </div>

      <!-- Imagen destacada -->
      <div v-if="articulo.imagenDestacada" class="featured-image">
        <img :src="articulo.imagenDestacada" :alt="articulo.titulo" />
      </div>

      <!-- Contenido -->
      <div class="article-content">
        <div class="article-body">
          <p class="article-summary">{{ articulo.resumen }}</p>
          <div class="article-text">
            <p
              v-for="(parrafo, idx) in articulo.contenido.split('\n\n')"
              :key="idx"
            >
              {{ parrafo }}
            </p>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="article-sidebar">
          <div class="sidebar-card">
            <h5 class="sidebar-title">Sobre el autor</h5>
            <div class="author-card">
              <div class="author-avatar">
                <i class="bi bi-person-circle"></i>
              </div>
              <div class="author-name">{{ articulo.autorNombre }}</div>
            </div>
          </div>

          <div class="sidebar-card">
            <h5 class="sidebar-title">Comparte</h5>
            <div class="share-buttons">
              <button
                class="share-btn facebook"
                title="Compartir en Facebook"
                @click="compartirEnFacebook"
              >
                <i class="bi bi-facebook"></i>
              </button>
              <button
                class="share-btn twitter"
                title="Compartir en Twitter"
                @click="compartirEnTwitter"
              >
                <i class="bi bi-twitter"></i>
              </button>
              <button
                class="share-btn whatsapp"
                title="Compartir en WhatsApp"
                @click="compartirEnWhatsApp"
              >
                <i class="bi bi-whatsapp"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal Editar -->
    <ModalArticulo
      :is-open="modalEditarOpen"
      :articulo-id="route.params.id"
      @close="closeEditar"
      @articulo-guardado="handleArticuloActualizado"
    />
  </div>
</template>

<style scoped>
@import "../components/styles/DetalleArticulo.css";
</style>
