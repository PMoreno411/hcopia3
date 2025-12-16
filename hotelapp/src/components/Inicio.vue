<script setup>
import { ref, onMounted, computed } from "vue";
import { useFirestore } from "../composables/useFirestore";
import Spinner from "./common/Spinner.vue";
import BadgeDestacado from "./common/BadgeDestacado.vue";
import RatingStars from "./common/RatingStars.vue";
import { useModal } from "../composables/useModal";
import ModalMapa from "./modals/ModalMapa.vue";

const { getDocuments } = useFirestore("hotels");
const { queryDocuments: getAds, updateDocument: updateAd } =
  useFirestore("ads");

const hoteles = ref([]);
const busqueda = ref("");
const cargando = ref(true);
const hotelesFiltrados = ref([]);

const imagenes = ref([
  "https://placehold.co/800x553/667eea/ffffff?text=TU+MARCA+AQUI&font=roboto",
  "https://placehold.co/800x553/667eea/ffffff?text=TU+MARCA+AQUI&font=roboto",
  "https://placehold.co/800x553/667eea/ffffff?text=TU+MARCA+AQUI&font=roboto",
  "https://placehold.co/800x553/667eea/ffffff?text=TU+MARCA+AQUI&font=roboto",
  "https://placehold.co/800x553/667eea/ffffff?text=TU+MARCA+AQUI&font=roboto",
  "https://placehold.co/800x553/667eea/ffffff?text=TU+MARCA+AQUI&font=roboto",
]);

// Items combinados (anuncios activos + imágenes placeholder)
const sliderItems = computed(() => [
  ...anunciosActivos.value.map((ad, idx) => ({
    id: `ad-${idx}`,
    url: ad.url,
    link: ad.link,
    titulo: ad.titulo,
    esAnuncio: true,
  })),
  ...imagenes.value.map((img, idx) => ({
    id: `img-${idx}`,
    url: img,
    link: null,
    titulo: `Imagen ${idx + 1}`,
    esAnuncio: false,
  })),
]);

const anunciosActivos = ref([]);

const registrarImpresion = async (anuncioId) => {
  try {
    const anuncio = anunciosActivos.value.find((a) => a.id === anuncioId);
    if (!anuncio) return;

    const nuevasImpresiones = (anuncio.impresiones || 0) + 1;
    await updateAd(anuncioId, { impresiones: nuevasImpresiones });
  } catch (err) {
    console.error("Error al registrar impresión:", err);
  }
};

const registrarClick = async (anuncioId) => {
  try {
    const anuncio = anunciosActivos.value.find((a) => a.id === anuncioId);
    if (!anuncio) return;
    const nuevosClicks = (anuncio.clicks || 0) + 1;
    await updateAd(anuncioId, { clicks: nuevosClicks });
  } catch (err) {
    console.error("Error al registrar click:", err);
  }
};

const cargarAnuncios = async () => {
  try {
    const filters = [
      { type: "where", field: "activo", operator: "==", value: true },
      { type: "where", field: "estadoPago", operator: "==", value: "aprobado" },
    ];
    const anuncios = await getAds(filters);

    const ahora = new Date();
    anunciosActivos.value = anuncios
      .filter((ad) => {
        if (!ad.fechaFin) return false;

        // Manejar tanto timestamps de Firestore como strings ISO
        const fin =
          typeof ad.fechaFin === "string"
            ? new Date(ad.fechaFin)
            : new Date(
                ad.fechaFin.seconds ? ad.fechaFin.seconds * 1000 : ad.fechaFin
              );

        return fin > ahora;
      })
      .map((ad) => ({
        id: ad.id,
        url: ad.imagen,
        link: ad.url,
        titulo: ad.titulo,
        impresiones: ad.impresiones || 0,
      }));

    // Registrar impresiones solo una vez por sesión
    if (
      anunciosActivos.value.length > 0 &&
      !sessionStorage.getItem("impressionsRegistered")
    ) {
      anunciosActivos.value.forEach((ad) => {
        registrarImpresion(ad.id);
      });
      sessionStorage.setItem("impressionsRegistered", "true");
    }
  } catch (err) {
    console.error("Error al cargar anuncios:", err);
  }
};

const cargarHoteles = async () => {
  try {
    cargando.value = true;
    const docs = await getDocuments();
    // Filtrar hoteles no ocultos y ordenar
    hoteles.value = docs
      .filter((h) => !h.oculto)
      .sort((a, b) => {
        const scoreA = (a.calificacion || 0) * (a.resenas || 0);
        const scoreB = (b.calificacion || 0) * (b.resenas || 0);
        return scoreB - scoreA;
      });
  } catch (err) {
    console.error("Error al cargar hoteles:", err);
  } finally {
    cargando.value = false;
  }
};

// Filtrar hoteles por búsqueda
const filtrarHoteles = () => {
  if (!busqueda.value.trim()) {
    hotelesFiltrados.value = hoteles.value;
    return;
  }

  const termino = busqueda.value.toLowerCase();
  hotelesFiltrados.value = hoteles.value.filter(
    (hotel) =>
      hotel.nombre.toLowerCase().includes(termino) ||
      hotel.descripcion.toLowerCase().includes(termino) ||
      hotel.direccion?.toLowerCase().includes(termino)
  );
};

const handleAnuncioClick = (anuncio) => {
  if (anuncio.link) {
    registrarClick(anuncio.id);
    window.open(anuncio.link, "_blank");
  }
};

const {
  isOpen: modalMapaOpen,
  openModal: openMapa,
  closeModal: closeMapa,
} = useModal();

onMounted(async () => {
  await cargarAnuncios();
  await cargarHoteles();
  hotelesFiltrados.value = hoteles.value;
});
</script>

<template>
  <div>
    <!-- Hero Section -->
    <!-- <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          <i class="bi bi-building-fill me-3"></i>
          Descubre los Mejores Hoteles
        </h1>
        <p class="hero-subtitle">
          Encuentra el lugar perfecto para tu estadía en nuestro hermoso pueblo
        </p>
      </div>
    </div> -->

    <!-- Buscador -->
    <div class="search-section">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="search-container">
            <div class="search-icon">
              <i class="bi bi-search"></i>
            </div>
            <input
              v-model="busqueda"
              @input="filtrarHoteles"
              type="text"
              class="search-input"
              placeholder="Buscar por nombre, ubicación o servicios..."
            />
            <button class="search-btn" @click="filtrarHoteles">Buscar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Slider Infinito de Imágenes + Anuncios -->
    <div class="slider-section">
      <div class="slider-container">
        <div class="slider-track">
          <template v-for="loop in 2" :key="`loop-${loop}`">
            <div
              v-for="item in sliderItems"
              :key="`${loop}-${item.id}`"
              class="slider-item"
              @click="item.link && window.open(item.link, '_blank')"
              :style="{ cursor: item.link ? 'pointer' : 'default' }"
            >
              <img :src="item.url" :alt="item.titulo" />
              <div v-if="item.esAnuncio && item.link" class="ad-badge">
                <i class="bi bi-megaphone-fill"></i>
                Anuncio
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <Spinner
      v-if="cargando"
      size="lg"
      message="Cargando hoteles disponibles..."
    />

    <!-- Sin resultados -->
    <div v-else-if="hotelesFiltrados.length === 0" class="empty-state">
      <i class="bi bi-search display-1"></i>
      <h3 class="mt-3">
        {{
          busqueda
            ? "No se encontraron hoteles"
            : "No hay hoteles registrados aún"
        }}
      </h3>
      <p class="text-muted">
        {{
          busqueda
            ? "Intenta con otros términos de búsqueda"
            : "Sé el primero en registrar tu hotel"
        }}
      </p>
    </div>

    <!-- Lista de Hoteles -->
    <div v-else class="hotels-grid">
      <div v-for="hotel in hotelesFiltrados" :key="hotel.id" class="hotel-card">
        <!-- Imagen -->
        <div class="hotel-image-container">
          <div
            v-if="hotel.imagenes && hotel.imagenes[0]"
            class="hotel-image"
            :style="{ backgroundImage: `url(${hotel.imagenes[0]})` }"
          ></div>
          <div v-else class="hotel-image-placeholder">
            <i class="bi bi-image"></i>
          </div>

          <!-- Badge Destacado -->
          <BadgeDestacado
            :calificacion="hotel.calificacion || 0"
            :totalResenas="hotel.resenas || 0"
          />
        </div>

        <!-- Contenido -->
        <div class="hotel-content">
          <h5 class="hotel-title">{{ hotel.nombre }}</h5>

          <!-- Rating -->
          <RatingStars
            :rating="hotel.calificacion || 0"
            :totalResenas="hotel.resenas || 0"
            size="sm"
          />

          <p class="hotel-description">
            {{ hotel.descripcion?.substring(0, 80) }}
            {{ hotel.descripcion?.length > 80 ? "..." : "" }}
          </p>

          <!-- Ubicación -->
          <div v-if="hotel.direccion" class="hotel-location">
            <i class="bi bi-geo-alt-fill"></i>
            <span>{{ hotel.direccion }}</span>
          </div>

          <!-- Servicios -->
          <div
            v-if="hotel.servicios && hotel.servicios.length > 0"
            class="hotel-services"
          >
            <span
              v-for="(servicio, idx) in hotel.servicios.slice(0, 3)"
              :key="idx"
              class="service-tag"
            >
              <i class="bi bi-check-circle-fill"></i>
              {{ servicio }}
            </span>
            <span v-if="hotel.servicios.length > 3" class="service-more">
              +{{ hotel.servicios.length - 3 }}
            </span>
          </div>

          <!-- Botón ver detalles -->
          <router-link :to="`/hotel/${hotel.id}`" class="btn-ver-detalles">
            Ver Habitaciones
            <i class="bi bi-arrow-right ms-2"></i>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Botón flotante para abrir mapa -->
    <button
      v-if="hotelesFiltrados.length > 0"
      @click="openMapa"
      class="floating-map-btn"
      title="Ver mapa de hoteles"
    >
      <i class="bi bi-map-fill"></i>
    </button>

    <!-- Modal Mapa -->
    <ModalMapa
      :is-open="modalMapaOpen"
      :hoteles="hotelesFiltrados"
      @close="closeMapa"
    />
  </div>
</template>

<style scoped>
/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 3rem 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.25),
    0 5px 15px rgba(0, 0, 0, 0.1);
}

.hero-content {
  text-align: center;
  color: #fff;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 0;
}

/* Search Section */
.search-section {
  margin-bottom: 3rem;
}

.search-container {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 50px;
  padding: 0.5rem;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.search-container:focus-within {
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.search-icon {
  padding: 0 1rem;
  color: #667eea;
  font-size: 1.25rem;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  background: transparent;
}

.search-input::placeholder {
  color: #999;
}

.search-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 50px;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.search-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4), 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #999;
}

.empty-state i {
  color: #ddd;
}

.empty-state h3 {
  color: #666;
  margin-top: 1rem;
}

/* Hotels Grid */
.hotels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Hotel Card */
.hotel-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.hotel-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 35px rgba(102, 126, 234, 0.15),
    0 6px 15px rgba(0, 0, 0, 0.1);
  border-color: rgba(102, 126, 234, 0.1);
}

/* Hotel Image */
.hotel-image-container {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.hotel-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  transition: transform 0.3s ease;
}

.hotel-card:hover .hotel-image {
  transform: scale(1.1);
}

.hotel-image-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  font-size: 3rem;
}

/* Hotel Content */
.hotel-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.hotel-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #2d3561;
  margin-bottom: 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hotel-description {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hotel-location {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #999;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.hotel-location i {
  color: #667eea;
}

.hotel-location span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Services */
.hotel-services {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.service-tag {
  background: #f8f9ff;
  color: #667eea;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.1);
}

.service-tag i {
  font-size: 0.7rem;
}

.service-more {
  background: #e9ecef;
  color: #666;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* Button */
.btn-ver-detalles {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  margin-top: auto;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3), 0 2px 6px rgba(0, 0, 0, 0.1);
}

.btn-ver-detalles:hover {
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4),
    0 3px 10px rgba(0, 0, 0, 0.15);
}

/* Slider Section */
.slider-section {
  margin-bottom: 3rem;
  overflow: hidden;
  padding: 2rem 0;
}

.slider-container {
  width: 100%;
  overflow: hidden;
  position: relative;
  mask-image: linear-gradient(
    to right,
    transparent,
    black 10%,
    black 90%,
    transparent
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    black 10%,
    black 90%,
    transparent
  );
}

.slider-track {
  display: flex;
  gap: 1.5rem;
  width: max-content;
  animation: marquee 45s linear infinite;
}

.slider-track:hover {
  animation-play-state: paused;
}

.slider-item {
  flex-shrink: 0;
  width: 350px;
  height: 220px;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}

.slider-item:hover {
  transform: scale(0.95);
}

.slider-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ad-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  color: #fff;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.4);
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

/* Botón flotante mapa */
.floating-map-btn {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 1.5rem;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.floating-map-btn:hover {
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 12px 35px rgba(102, 126, 234, 0.5);
}

.floating-map-btn:active {
  transform: translateY(-2px) scale(1);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 1.75rem;
    flex-direction: column;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .search-container {
    flex-direction: column;
    border-radius: 20px;
    padding: 1rem;
  }

  .search-icon {
    display: none;
  }

  .search-input {
    width: 100%;
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    border: 1px solid #e9ecef;
    border-radius: 12px;
  }

  .search-btn {
    width: 100%;
  }

  .hotels-grid {
    grid-template-columns: 1fr;
  }

  .slider-item {
    width: 280px;
    height: 180px;
  }

  .slider-track {
    animation: scroll-mobile 60s linear infinite;
  }

  @keyframes scroll-mobile {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(calc(-280px * 6 - 1.5rem * 6));
    }
  }

  .floating-map-btn {
    bottom: 1.5rem;
    right: 1.5rem;
    width: 55px;
    height: 55px;
    font-size: 1.35rem;
  }
}

.price-usd {
  font-size: 0.85rem;
  opacity: 0.9;
}
</style>
