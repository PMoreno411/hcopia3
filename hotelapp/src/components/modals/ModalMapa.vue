<script setup>
import { ref, watch, nextTick, computed } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  hoteles: { type: Array, default: () => [] },
});

const emit = defineEmits(["close"]);

const mapContainer = ref(null);
let mapInstance = null;
let markersLayer = null;
let userLocationMarker = null;

// Eliminamos filtros y precios

const hotelesConCoordenadas = () =>
  props.hoteles.filter(
    (h) =>
      (h.lat !== undefined && h.lng !== undefined) ||
      (h.latitude !== undefined && h.longitude !== undefined)
  );

const hotelesFiltrados = computed(() => hotelesConCoordenadas());

const obtenerLatLng = (h) => [
  h.lat ?? h.latitude ?? 0,
  h.lng ?? h.longitude ?? 0,
];

// Iconos personalizados por calificación
const crearIconoHotel = (calificacion, resenas) => {
  const esDestacado = calificacion >= 4.5 && resenas >= 3;
  const color = esDestacado
    ? "#ffd700"
    : calificacion >= 4
    ? "#667eea"
    : "#999";

  const html = `
    <div style="
      background: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid #fff;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <i class="bi bi-building-fill" style="color:#fff;font-size:14px;transform:rotate(45deg);"></i>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-hotel-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const initMap = () => {
  if (mapInstance || !mapContainer.value) return;

  mapInstance = L.map(mapContainer.value, {
    zoomControl: false, // Deshabilitamos el control de zoom por defecto
  }).setView([4.5709, -74.2973], 6);

  // Capa de mapa base
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(mapInstance);

  mapInstance.scrollWheelZoom.disable();

  // Control de zoom personalizado - IZQUIERDA ABAJO
  L.control
    .zoom({
      position: "bottomleft",
      zoomInTitle: "Acercar",
      zoomOutTitle: "Alejar",
    })
    .addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);
};

const actualizarMarcadores = () => {
  if (!mapInstance || !markersLayer) return;
  markersLayer.clearLayers();

  const conCoords = hotelesFiltrados.value;
  if (!conCoords.length) return;

  conCoords.forEach((hotel) => {
    const [lat, lng] = obtenerLatLng(hotel);
    const icono = crearIconoHotel(hotel.calificacion || 0, hotel.resenas || 0);

    const marker = L.marker([lat, lng], { icon: icono });

    // Popup sin sección de precio
    const imagenUrl =
      hotel.imagenes && hotel.imagenes[0]
        ? hotel.imagenes[0]
        : "https://via.placeholder.com/200x120?text=Sin+Imagen";

    const popupContent = `
      <div style="min-width: 200px;">
        <img src="${imagenUrl}" style="
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 8px;
        " alt="${hotel.nombre}" />
        <h6 style="margin: 0 0 4px; font-weight: 700; color: #2d3561;">
          ${hotel.nombre}
        </h6>
        <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
          ${generarEstrellas(hotel.calificacion || 0)}
          <small style="color: #999;">(${hotel.resenas || 0})</small>
        </div>
        <p style="margin: 0 0 4px; color: #666; font-size: 0.85rem;">
          <i class="bi bi-geo-alt-fill" style="color: #667eea;"></i>
          ${hotel.direccion || "Sin dirección"}
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <a href="/hotel/${hotel.id}" target="_blank" style="
            display: block;
            background: transparent;
            color: #667eea;
            border: 2px solid #667eea;
            padding: 6px 8px;
            border-radius: 20px;
            text-align: center;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.8rem;
            transition: all 0.3s ease;
          ">
            <i class="bi bi-door-open"></i> Ver
          </a>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" style="
            display: block;
            background: transparent;
            color: #25d366;
            border: 2px solid #25d366;
            padding: 6px 8px;
            border-radius: 20px;
            text-align: center;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.8rem;
            transition: all 0.3s ease;
          ">
            <i class="bi bi-map"></i> Ir
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, {
      maxWidth: 250,
      className: "custom-popup",
    });

    // Animación bounce al hacer hover
    marker.on("mouseover", function () {
      this.setIcon(
        crearIconoHotel(hotel.calificacion || 0, hotel.resenas || 0)
      );
      const element = this.getElement();
      if (element) {
        element.style.animation = "bounce 0.5s ease";
      }
    });

    marker.addTo(markersLayer);
  });

  if (conCoords.length > 0) {
    const bounds = L.latLngBounds(conCoords.map(obtenerLatLng));
    mapInstance.fitBounds(bounds, { padding: [50, 50] });
  }
};

const generarEstrellas = (rating) => {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<i class="bi bi-star${
      i <= rating ? "-fill" : ""
    }" style="color: #ffd700; font-size: 0.85rem;"></i>`;
  }
  return html;
};

// Geolocalización del usuario
const centrarEnMiUbicacion = () => {
  if (!mapInstance) return;

  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;

      if (userLocationMarker) {
        mapInstance.removeLayer(userLocationMarker);
      }

      userLocationMarker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          html: `<div style="
            background: #667eea;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid #fff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          "></div>`,
          className: "user-location-marker",
          iconSize: [20, 20],
        }),
      }).addTo(mapInstance);

      mapInstance.setView([latitude, longitude], 13);
    },
    (error) => {
      alert("No se pudo obtener tu ubicación: " + error.message);
    }
  );
};

const cerrarModal = () => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    markersLayer = null;
    userLocationMarker = null;
  }
  emit("close");
};

watch(
  () => props.isOpen,
  async (val) => {
    if (val) {
      await nextTick();
      initMap();
      actualizarMarcadores();
    } else {
      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
        markersLayer = null;
        userLocationMarker = null;
      }
    }
  }
);

watch(
  () => props.hoteles,
  () => {
    if (props.isOpen && mapInstance) {
      actualizarMarcadores();
    }
  },
  { deep: true }
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
        class="modal-dialog modal-dialog-centered modal-fullscreen-lg-down modal-xl"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-geo-alt-fill me-2"></i>
              Mapa de Hoteles
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="cerrarModal"
            ></button>
          </div>

          <div class="modal-body p-0">
            <div class="map-info">
              <i class="bi bi-info-circle-fill me-2"></i>
              {{ hotelesFiltrados.length }} hotel{{
                hotelesFiltrados.length !== 1 ? "es" : ""
              }}
            </div>

            <!-- Solo geolocalización -->
            <button
              class="btn-geolocate"
              @click="centrarEnMiUbicacion"
              title="Mi ubicación"
            >
              <i class="bi bi-geo-fill"></i>
            </button>

            <div ref="mapContainer" class="map-full"></div>
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
  max-width: 1200px;
}

.modal-content {
  border: none;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  border-bottom: 1px solid #f0f0f0;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
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
  position: relative;
}

.map-info {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  color: #2d3561;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.map-info i {
  color: #667eea;
}

.map-full {
  width: 100%;
  height: 70vh;
  min-height: 500px;
}

/* Geolocalización - ABAJO CENTRO */
.btn-geolocate {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 44px;
  height: 44px;
  background: #fff;
  border: 2px solid #667eea;
  border-radius: 8px;
  color: #667eea;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-geolocate:hover {
  background: #667eea;
  color: #fff;
  transform: translateX(-50%) scale(1.1);
}

@media (max-width: 768px) {
  .modal-header {
    padding: 1rem 1.5rem;
  }

  .modal-title {
    font-size: 1.1rem;
  }

  .map-full {
    height: 60vh;
    min-height: 400px;
  }

  .map-info {
    font-size: 0.85rem;
    padding: 0.6rem 1.25rem;
  }

  .btn-geolocate {
    bottom: 1rem;
    width: 40px;
    height: 40px;
    font-size: 1.1rem;
  }

  .btn-geolocate:hover {
    transform: translateX(-50%) scale(1.1);
  }
}
</style>
