<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import { useFirestore } from "../composables/useFirestore";
import { useModal } from "../composables/useModal";
import { useStorage } from "../composables/useStorage";
import { useToast } from "../composables/useToast";
import { useConfirm } from "../composables/useConfirm";
import ModalArticulo from "./modals/ModalArticulo.vue";
import Spinner from "./common/Spinner.vue";

const router = useRouter();
const { user } = useAuth();
const { queryDocuments, deleteDocument } = useFirestore("articles");
const { deleteFile, extractPathFromUrl } = useStorage();
const {
  isOpen: modalArticuloOpen,
  openModal: openArticulo,
  closeModal: closeArticulo,
} = useModal();
const { success, error } = useToast();
const { confirmDelete } = useConfirm();

const articulos = ref([]);
const cargando = ref(true);
const busqueda = ref("");
const categoriaFiltro = ref("todas");

const categorias = [
  { value: "todas", label: "Todas", icon: "bi-grid-fill" },
  { value: "turismo", label: "Turismo", icon: "bi-airplane-fill" },
  { value: "gastronomia", label: "Gastronomía", icon: "bi-cup-hot-fill" },
  { value: "consejos", label: "Consejos", icon: "bi-lightbulb-fill" },
  { value: "eventos", label: "Eventos", icon: "bi-calendar-event-fill" },
  { value: "cultura", label: "Cultura", icon: "bi-palette-fill" },
];

const cargarArticulos = async () => {
  try {
    cargando.value = true;
    const filters = [
      { type: "orderBy", field: "createdAt", direction: "desc" },
    ];
    const docs = await queryDocuments(filters);
    // Filtrar artículos no ocultos
    articulos.value = docs.filter((a) => !a.oculto);
  } catch (err) {
    console.error("Error al cargar artículos:", err);
  } finally {
    cargando.value = false;
  }
};

const articulosFiltrados = computed(() => {
  let resultado = articulos.value;

  if (categoriaFiltro.value !== "todas") {
    resultado = resultado.filter((a) => a.categoria === categoriaFiltro.value);
  }

  if (busqueda.value.trim()) {
    const termino = busqueda.value.toLowerCase();
    resultado = resultado.filter(
      (a) =>
        a.titulo.toLowerCase().includes(termino) ||
        a.resumen.toLowerCase().includes(termino)
    );
  }

  return resultado;
});

const verArticulo = (id) => {
  router.push(`/magazine/${id}`);
};

const handleArticuloGuardado = async () => {
  closeArticulo();
  await cargarArticulos();
};

const eliminarArticulo = async (id) => {
  const articulo = articulos.value.find((a) => a.id === id);
  const confirmed = await confirmDelete(`¿Eliminar "${articulo?.titulo}"?`);
  if (!confirmed) return;

  try {
    // Eliminar imagen destacada de Supabase si existe
    if (articulo?.imagenDestacada) {
      const rutaImagen = extractPathFromUrl(articulo.imagenDestacada);
      if (rutaImagen) {
        try {
          await deleteFile(rutaImagen);
          console.log("✅ Imagen del artículo eliminada de Supabase");
        } catch (err) {
          console.warn("⚠️ Error al eliminar imagen:", err);
        }
      }
    }

    await deleteDocument(id);
    await cargarArticulos();
    success("Artículo eliminado");
  } catch (err) {
    console.error("Error:", err);
    error("Error al eliminar");
  }
};

onMounted(() => {
  cargarArticulos();
});
</script>

<template>
  <div>
    <!-- Hero Section -->
    <div class="magazine-hero">
      <div class="hero-content">
        <h1 class="hero-title">
          <i class="bi bi-journal-text me-3"></i>
          Magazine
        </h1>
        <p class="hero-subtitle">
          Descubre historias, consejos y tendencias del mundo del turismo
        </p>
        <button v-if="user" @click="openArticulo" class="btn-crear-articulo">
          <i class="bi bi-plus-circle me-2"></i>
          Escribe un Artículo
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="search-box">
        <i class="bi bi-search"></i>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar artículos..."
          class="search-input"
        />
      </div>

      <div class="categories-filter">
        <button
          v-for="cat in categorias"
          :key="cat.value"
          @click="categoriaFiltro = cat.value"
          :class="['category-btn', { active: categoriaFiltro === cat.value }]"
        >
          <i :class="cat.icon"></i>
          {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <Spinner v-if="cargando" size="lg" message="Cargando artículos..." />

    <!-- Sin artículos -->
    <div v-else-if="articulosFiltrados.length === 0" class="empty-state">
      <i class="bi bi-inbox"></i>
      <h3>No hay artículos</h3>
      <p v-if="busqueda || categoriaFiltro !== 'todas'">
        Intenta con otros filtros
      </p>
      <p v-else>Próximamente contenido nuevo</p>
    </div>

    <!-- Grid de Artículos -->
    <div v-else class="articles-grid">
      <article
        v-for="articulo in articulosFiltrados"
        :key="articulo.id"
        class="article-card"
        @click="verArticulo(articulo.id)"
      >
        <div class="article-image">
          <div
            v-if="articulo.imagenDestacada"
            class="image"
            :style="{ backgroundImage: `url(${articulo.imagenDestacada})` }"
          ></div>
          <div v-else class="image-placeholder">
            <i class="bi bi-image"></i>
          </div>
          <span :class="['category-badge', articulo.categoria]">
            {{ categorias.find((c) => c.value === articulo.categoria)?.label }}
          </span>
          <!-- Badge de borrador -->
          <span v-if="!articulo.publicado" class="draft-badge">
            <i class="bi bi-file-earmark-text me-1"></i>
            Borrador
          </span>
        </div>

        <div class="article-content">
          <h3 class="article-title">{{ articulo.titulo }}</h3>
          <p class="article-summary">{{ articulo.resumen }}</p>

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
          </div>

          <div class="article-stats">
            <span
              ><i class="bi bi-eye-fill"></i> {{ articulo.vistas || 0 }}</span
            >
            <span
              ><i class="bi bi-heart-fill"></i>
              {{ articulo.likes?.length || articulo.likesCount || 0 }}</span
            >
          </div>
        </div>
      </article>
    </div>

    <!-- Modal Crear Artículo -->
    <ModalArticulo
      :is-open="modalArticuloOpen"
      @close="closeArticulo"
      @articulo-guardado="handleArticuloGuardado"
    />
  </div>
</template>

<style scoped>
.magazine-hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 4rem 2rem;
  margin-bottom: 2rem;
  text-align: center;
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.25);
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  color: #fff;
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.25rem;
  margin: 0;
}

.filters-section {
  background: #fff;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.search-box {
  position: relative;
  max-width: 500px;
  margin: 0 auto 1.5rem;
}

.search-box i {
  position: absolute;
  left: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  font-size: 1.1rem;
}

.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid #e0e0e0;
  border-radius: 50px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.categories-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.category-btn {
  background: #f8f9ff;
  color: #667eea;
  border: 2px solid transparent;
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.category-btn:hover {
  background: #e0e7ff;
  transform: translateY(-2px);
}

.category-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.empty-state {
  text-align: center;
  padding: 5rem 2rem;
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

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}

.article-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
}

.article-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 30px rgba(102, 126, 234, 0.2);
}

.article-image {
  position: relative;
  height: 220px;
  overflow: hidden;
}

.article-image .image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  transition: transform 0.3s ease;
}

.article-card:hover .image {
  transform: scale(1.05);
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #ccc;
}

.category-badge {
  position: absolute;
  top: 1rem;
  left: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.category-badge.turismo {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.category-badge.gastronomia {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.category-badge.consejos {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.category-badge.eventos {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.category-badge.cultura {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.article-content {
  padding: 1.5rem;
}

.article-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3561;
  margin-bottom: 0.75rem;
  line-height: 1.3;
}

.article-summary {
  color: #666;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.article-meta {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.author-info,
.date-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #999;
}

.author-info i,
.date-info i {
  color: #667eea;
}

.article-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: #999;
}

.article-stats span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.article-stats i {
  color: #667eea;
}

.btn-crear-articulo {
  background: #fff;
  color: #667eea;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: 50px;
  font-weight: 600;
  margin-top: 1.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.btn-crear-articulo:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  color: #764ba2;
}

.article-card,
.article-title,
.article-summary,
.article-meta,
.article-meta span,
.article-stats,
.article-stats span {
  word-break: break-word;
  overflow-wrap: anywhere;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
    flex-direction: column;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .btn-crear-articulo {
    font-size: 0.9rem;
    padding: 0.75rem 1.5rem;
  }

  .search-input {
    font-size: 0.9rem;
    padding: 0.85rem 0.85rem 0.85rem 2.75rem;
  }

  .categories-filter {
    gap: 0.5rem;
  }

  .category-btn {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
    justify-content: center;
  }

  .articles-grid {
    grid-template-columns: 1fr;
  }

  .article-image {
    height: 180px;
  }

  .article-title {
    font-size: 1.25rem;
  }

  .article-summary {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 1.5rem;
  }

  .hero-subtitle {
    font-size: 0.9rem;
  }

  .category-btn {
    padding: 0.5rem 0.8rem;
    font-size: 0.8rem;
  }

  .article-title {
    font-size: 1.1rem;
  }

  .article-content {
    padding: 1rem;
  }
}
</style>
