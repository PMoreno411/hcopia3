<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import { useFirestore } from "../composables/useFirestore";
import { useStorage } from "../composables/useStorage";
import { useModal } from "../composables/useModal";
import { useToast } from "../composables/useToast";
import { useConfirm } from "../composables/useConfirm";
import ModalLogin from "./modals/ModalLogin.vue";
import ModalRegistrarHotel from "./modals/ModalRegistrarHotel.vue";
import ModalEditarHotel from "./modals/ModalEditarHotel.vue";
import ModalGestionarAnuncios from "./modals/ModalGestionarAnuncios.vue";
import ModalGestionarHabitaciones from "./modals/ModalGestionarHabitaciones.vue";
import Spinner from "./common/Spinner.vue";
import RatingStars from "./common/RatingStars.vue";
import BadgeDestacado from "./common/BadgeDestacado.vue";
import { useReservas } from "../composables/useReservas";

const router = useRouter();
const { user, logout } = useAuth();
const { deleteDocument, queryDocuments } = useFirestore("hotels");
const { queryDocuments: getReviews } = useFirestore("reviews");
const { queryDocuments: getAds } = useFirestore("ads");
const { deleteMultipleFiles, extractPathFromUrl } = useStorage();
const { success, error, info, warning } = useToast();
const { confirmDelete, confirm } = useConfirm();
const {
  getReservasByUser,
  getReservasByHotel,
  cancelarReserva,
  confirmarReserva,
  rechazarReserva,
  checkInReserva,
  checkOutReserva,
  eliminarReserva, // <--- añadir
} = useReservas();

const {
  isOpen: modalRegistrarOpen,
  openModal: openRegistrar,
  closeModal: closeRegistrar,
} = useModal();

const {
  isOpen: modalEditarOpen,
  openModal: openEditar,
  closeModal: closeEditar,
} = useModal();

const {
  isOpen: modalLoginOpen,
  openModal: openLoginModal,
  closeModal: closeLoginModal,
} = useModal();

const {
  isOpen: modalAnunciosOpen,
  openModal: openAnuncios,
  closeModal: closeAnuncios,
} = useModal();

const {
  isOpen: modalHabitacionesOpen,
  openModal: openHabitaciones,
  closeModal: closeHabitaciones,
} = useModal();

const misHoteles = ref([]);
const todasLasResenas = ref([]);
const cargando = ref(true);
const hotelSeleccionado = ref(null);
const hotelSeleccionadoHabitaciones = ref(null);
const authReady = ref(false);
const misAnuncios = ref([]);
const misReservas = ref([]);
const reservasDeHotel = ref([]);
const cargandoReservas = ref(false);
const seccionActual = ref("hoteles"); // hoteles, mis-reservas, reservas-hotel

// Cargar hoteles y reseñas del usuario
const cargarMisHoteles = async () => {
  if (!user.value) {
    cargando.value = false;
    misHoteles.value = [];
    todasLasResenas.value = [];
    misAnuncios.value = [];
    return;
  }

  try {
    cargando.value = true;

    // Cargar hoteles del usuario
    const filters = [
      { type: "where", field: "userId", operator: "==", value: user.value.uid },
      { type: "orderBy", field: "createdAt", direction: "desc" },
    ];
    misHoteles.value = await queryDocuments(filters);

    // Cargar todas las reseñas para los hoteles del usuario
    if (misHoteles.value.length > 0) {
      const hotelIds = misHoteles.value.map((h) => h.id);

      // Cargar reseñas de cada hotel
      const resenasPromises = hotelIds.map(async (hotelId) => {
        const reviewFilters = [
          { type: "where", field: "hotelId", operator: "==", value: hotelId },
        ];
        return await getReviews(reviewFilters);
      });

      const resenasArrays = await Promise.all(resenasPromises);
      todasLasResenas.value = resenasArrays.flat();
    }

    // Cargar anuncios del usuario
    const adsFilters = [
      { type: "where", field: "userId", operator: "==", value: user.value.uid },
    ];
    misAnuncios.value = await getAds(adsFilters);
  } catch (err) {
    console.error("Error al cargar hoteles:", err);
  } finally {
    cargando.value = false;
  }
};

// Cargar reservas del usuario
const cargarMisReservas = async () => {
  if (!user.value) return;
  try {
    cargandoReservas.value = true;

    misReservas.value = await getReservasByUser(user.value.uid);
  } catch (err) {
    console.error("Error al cargar mis reservas:", err);
  } finally {
    cargandoReservas.value = false;
  }
};

// Cargar reservas de los hoteles del usuario
const cargarReservasDeHotel = async () => {
  if (!user.value || misHoteles.value.length === 0) return;
  try {
    cargandoReservas.value = true;

    const hotelIds = misHoteles.value.map((h) => h.id);

    const reservasPromises = hotelIds.map(async (hotelId) => {
      return await getReservasByHotel(hotelId);
    });

    const reservasArrays = await Promise.all(reservasPromises);
    reservasDeHotel.value = reservasArrays.flat();
  } catch (err) {
    console.error("Error al cargar reservas del hotel:", err);
  } finally {
    cargandoReservas.value = false;
  }
};

const editarHotel = (hotel) => {
  hotelSeleccionado.value = hotel;
  openEditar();
};

const { confirmDelete: confirmEliminar } = useConfirm();

const eliminarHotel = async (hotel) => {
  const confirmed = await confirmEliminar(
    `¿Estás seguro de eliminar "${hotel.nombre}"?`
  );

  if (!confirmed) return;

  try {
    // Eliminar imágenes de Supabase si existen
    if (hotel.imagenes && hotel.imagenes.length > 0) {
      const rutasImagenes = hotel.imagenes
        .map((url) => extractPathFromUrl(url))
        .filter((ruta) => ruta !== null);

      if (rutasImagenes.length > 0) {
        try {
          await deleteMultipleFiles(rutasImagenes);
          console.log("✅ Imágenes del hotel eliminadas de Supabase");
        } catch (imgError) {
          console.warn("⚠️ Error al eliminar imágenes:", imgError);
        }
      }
    }

    await deleteDocument(hotel.id);
    await cargarMisHoteles();
    success("Hotel eliminado exitosamente");
  } catch (err) {
    console.error("Error al eliminar:", err);
    error("Error al eliminar el hotel");
  }
};

const verEstadisticas = (hotel) => {
  console.log("Ver estadísticas de:", hotel.nombre);
  // Aquí se mostraría un modal con estadísticas detalladas
};

const cerrarSesion = async () => {
  const confirmed = await confirm(
    "¿Estás seguro de cerrar sesión?",
    "Confirmar cierre de sesión"
  );

  if (!confirmed) return;

  try {
    await logout();
    router.push("/"); // Redirigir al inicio en lugar de /login
  } catch (err) {
    console.error("Error al cerrar sesión:", err);
    error("Error al cerrar sesión");
  }
};

const handleHotelRegistrado = () => {
  closeRegistrar();
  cargarMisHoteles();
  success("¡Hotel registrado exitosamente!");
};

const handleHotelActualizado = () => {
  closeEditar();
  cargarMisHoteles();
  success("¡Hotel actualizado exitosamente!");
};

const handleLoginExitoso = () => {
  closeLoginModal();
  cargarMisHoteles();
};

const handleAnuncioGestionado = () => {
  closeAnuncios();
  cargarMisHoteles();
};

const abrirGestionHabitaciones = (hotel) => {
  hotelSeleccionadoHabitaciones.value = hotel;
  openHabitaciones();
};

const cancelarMiReserva = async (reservaId, habitacionId, estado) => {
  const confirmed = await confirm(
    "¿Cancelar esta reserva?",
    "Confirmar cancelación"
  );
  if (!confirmed) return;

  try {
    await cancelarReserva(reservaId, habitacionId, estado);
    success("Reserva cancelada exitosamente");
    await cargarMisReservas();
  } catch (err) {
    console.error("Error:", err);
    error("Error al cancelar reserva");
  }
};

const confirmarReservaHotel = async (reservaId, habitacionId) => {
  const confirmed = await confirm(
    "¿Confirmar esta reserva?",
    "Esto restará una habitación disponible"
  );
  if (!confirmed) return;

  try {
    await confirmarReserva(reservaId, habitacionId);
    success("Reserva confirmada exitosamente");
    await cargarReservasDeHotel();
  } catch (err) {
    console.error("Error:", err);
    error("Error al confirmar reserva");
  }
};

const modalRechazarReservaOpen = ref(false);
const reservaARechazar = ref(null);
const motivoRechazoReserva = ref("");

const abrirRechazarReserva = (reserva) => {
  reservaARechazar.value = reserva;
  motivoRechazoReserva.value = "";
  modalRechazarReservaOpen.value = true;
};

const confirmarRechazoReserva = async () => {
  if (!motivoRechazoReserva.value.trim()) {
    warning("Por favor ingresa un motivo de rechazo");
    return;
  }

  try {
    await rechazarReserva(
      reservaARechazar.value.id,
      motivoRechazoReserva.value.trim()
    );
    warning("Reserva rechazada");
    modalRechazarReservaOpen.value = false;
    motivoRechazoReserva.value = "";
    reservaARechazar.value = null;
    await cargarReservasDeHotel();
  } catch (err) {
    console.error("Error:", err);
    error("Error al rechazar reserva");
  }
};

const cancelarRechazoReserva = () => {
  modalRechazarReservaOpen.value = false;
  motivoRechazoReserva.value = "";
  reservaARechazar.value = null;
};

const registrarCheckIn = async (reservaId) => {
  const confirmed = await confirm(
    "¿Marcar que el huésped llegó al hotel?",
    "Confirmar Check-In"
  );
  if (!confirmed) return;

  try {
    await checkInReserva(reservaId);
    success("Check-in registrado exitosamente");
    await cargarReservasDeHotel();
  } catch (err) {
    console.error("Error:", err);
    error("Error al registrar check-in");
  }
};

const registrarCheckOut = async (reservaId, habitacionId) => {
  const confirmed = await confirm(
    "¿Marcar que el huésped se fue del hotel? Esto liberará la habitación.",
    "Confirmar Check-Out"
  );
  if (!confirmed) return;

  try {
    await checkOutReserva(reservaId, habitacionId);
    success("Check-out registrado. Habitación liberada");
    await cargarReservasDeHotel();
  } catch (err) {
    console.error("Error:", err);
    error("Error al registrar check-out");
  }
};

const estadoBadgeClass = (estado) => {
  switch (estado) {
    case "pendiente":
      return "badge-warning";
    case "confirmada":
      return "badge-success";
    case "ocupada":
      return "badge-info";
    case "rechazada":
      return "badge-danger";
    case "cancelada":
      return "badge-secondary";
    case "completada":
      return "badge-primary";
    default:
      return "badge-secondary";
  }
};

const estadoTexto = (estado) => {
  switch (estado) {
    case "pendiente":
      return "Pendiente";
    case "confirmada":
      return "Confirmada";
    case "ocupada":
      return "En Estadía";
    case "rechazada":
      return "Rechazada";
    case "cancelada":
      return "Cancelada";
    case "completada":
      return "Completada";
    default:
      return estado;
  }
};

// Estadísticas calculadas
const estadisticas = computed(() => ({
  totalHoteles: misHoteles.value.length,
  totalVisitas: misHoteles.value.reduce((acc, h) => acc + (h.visitas || 0), 0),
  totalResenas: todasLasResenas.value.length,
  totalAnuncios: misAnuncios.value.length,
}));

watch(
  () => user.value,
  (val) => {
    if (!authReady.value) authReady.value = true;
    if (val) cargarMisHoteles();
  },
  { immediate: true }
);

watch(seccionActual, async (newVal) => {
  if (newVal === "mis-reservas") {
    await cargarMisReservas();
  } else if (newVal === "reservas-hotel") {
    await cargarReservasDeHotel();
  }
});

// Elimina onMounted que llamaba cargarMisHoteles directamente
onMounted(() => {
  // No cargar hasta que user esté listo por el watch
});

// NUEVOS handlers de eliminación manual
const eliminarReservaUsuario = async (reserva) => {
  const confirmed = await confirm(
    "¿Eliminar esta reserva del historial?",
    "Eliminar reserva"
  );
  if (!confirmed) return;
  try {
    await eliminarReserva(reserva.id, reserva.habitacionId, reserva.estado);
    success("Reserva eliminada");
    await cargarMisReservas();
  } catch (err) {
    console.error("Error:", err);
    error("No se pudo eliminar la reserva");
  }
};

const eliminarReservaHotel = async (reserva) => {
  const confirmed = await confirm(
    "¿Eliminar esta reserva del listado?",
    "Eliminar reserva"
  );
  if (!confirmed) return;
  try {
    await eliminarReserva(reserva.id, reserva.habitacionId, reserva.estado);
    success("Reserva eliminada");
    await cargarReservasDeHotel();
  } catch (err) {
    console.error("Error:", err);
    error("No se pudo eliminar la reserva");
  }
};
</script>

<template>
  <div>
    <!-- Esperando auth -->
    <Spinner v-if="!authReady" size="lg" message="Validando sesión..." />

    <!-- Mostrar modal si no hay usuario -->
    <div v-else-if="!user" class="text-center py-5">
      <div class="empty-access">
        <i class="bi bi-lock-fill"></i>
        <h3>Acceso Restringido</h3>
        <p>Por favor inicia sesión para ver tu panel</p>
      </div>
    </div>

    <template v-else>
      <!-- Header del Dashboard -->
      <div class="dashboard-header">
        <div class="header-content">
          <div>
            <h1 class="dashboard-title">
              <i class="bi bi-speedometer2 me-3"></i>
              Panel de Control
            </h1>
            <p class="dashboard-subtitle">
              Bienvenido, <strong>{{ user.displayName || user.email }}</strong>
            </p>
          </div>
          <button class="btn-logout" @click="cerrarSesion">
            <i class="bi bi-box-arrow-right me-2"></i>
            Cerrar Sesión
          </button>
        </div>
      </div>

      <!-- Loading -->
      <Spinner v-if="cargando" size="lg" message="Cargando tus hoteles..." />

      <template v-else>
        <!-- Tarjetas de estadísticas -->
        <div class="stats-grid">
          <div class="stat-card stat-primary">
            <div class="stat-icon">
              <i class="bi bi-building-fill"></i>
            </div>
            <div class="stat-content">
              <h3 class="stat-number">{{ estadisticas.totalHoteles }}</h3>
              <p class="stat-label">Hoteles Registrados</p>
            </div>
          </div>

          <div class="stat-card stat-success">
            <div class="stat-icon">
              <i class="bi bi-eye-fill"></i>
            </div>
            <div class="stat-content">
              <h3 class="stat-number">{{ estadisticas.totalVisitas }}</h3>
              <p class="stat-label">Visitas Totales</p>
            </div>
          </div>

          <div class="stat-card stat-warning">
            <div class="stat-icon">
              <i class="bi bi-chat-dots-fill"></i>
            </div>
            <div class="stat-content">
              <h3 class="stat-number">{{ estadisticas.totalResenas }}</h3>
              <p class="stat-label">Reseñas Totales</p>
            </div>
          </div>

          <div class="stat-card stat-info">
            <div class="stat-icon">
              <i class="bi bi-megaphone-fill"></i>
            </div>
            <div class="stat-content">
              <h3 class="stat-number">{{ estadisticas.totalAnuncios }}</h3>
              <p class="stat-label">Anuncios Activos</p>
            </div>
          </div>
        </div>

        <!-- Botón de Gestionar Anuncios -->
        <div class="ad-banner-section mb-4">
          <div class="ad-banner-card">
            <div class="ad-banner-content">
              <div class="ad-banner-icon">
                <i class="bi bi-megaphone-fill"></i>
              </div>
              <div class="ad-banner-text">
                <h4>¿Quieres promocionar tu negocio?</h4>
                <p>
                  Crea anuncios publicitarios y aparece en el slider principal
                  de la página de inicio
                </p>
              </div>
            </div>
            <button @click="openAnuncios" class="btn-gestionar-anuncios">
              <i class="bi bi-plus-circle me-2"></i>
              Gestionar Anuncios
            </button>
          </div>
        </div>

        <!-- Navegación de Secciones -->
        <div class="dashboard-sections mb-4">
          <button
            :class="['section-btn', { active: seccionActual === 'hoteles' }]"
            @click="seccionActual = 'hoteles'"
          >
            <i class="bi bi-building-fill me-2"></i>
            Mis Hoteles
          </button>
          <button
            :class="[
              'section-btn',
              { active: seccionActual === 'mis-reservas' },
            ]"
            @click="seccionActual = 'mis-reservas'"
          >
            <i class="bi bi-calendar-check-fill me-2"></i>
            Mis Reservas
          </button>
          <button
            v-if="misHoteles.length > 0"
            :class="[
              'section-btn',
              { active: seccionActual === 'reservas-hotel' },
            ]"
            @click="seccionActual = 'reservas-hotel'"
          >
            <i class="bi bi-inbox-fill me-2"></i>
            Reservas de mi Hotel
          </button>
        </div>

        <!-- Sección: Mis Hoteles -->
        <div v-if="seccionActual === 'hoteles'" class="hotels-section">
          <div class="section-header">
            <h2 class="section-title">
              <i class="bi bi-list-ul me-2"></i>
              Mis Hoteles
            </h2>
            <button @click="openRegistrar" class="btn-add-hotel">
              <i class="bi bi-plus-circle me-2"></i>
              Registrar Nuevo Hotel
            </button>
          </div>

          <!-- Sin hoteles -->
          <div v-if="misHoteles.length === 0" class="empty-state">
            <i class="bi bi-inbox"></i>
            <h3>No tienes hoteles registrados</h3>
            <p>Comienza registrando tu primer hotel</p>
            <!-- <button @click="openRegistrar" class="btn-empty-action">
              <i class="bi bi-plus-circle me-2"></i>
              Registrar tu primer hotel
            </button> -->
          </div>

          <!-- Lista de hoteles -->
          <div v-else class="hotels-grid">
            <div v-for="hotel in misHoteles" :key="hotel.id" class="hotel-item">
              <!-- Imagen -->
              <div class="hotel-item-image">
                <div
                  v-if="hotel.imagenes && hotel.imagenes[0]"
                  class="image"
                  :style="{ backgroundImage: `url(${hotel.imagenes[0]})` }"
                ></div>
                <div v-else class="image-placeholder">
                  <i class="bi bi-image"></i>
                </div>

                <!-- Badge Destacado -->
                <BadgeDestacado
                  :calificacion="hotel.calificacion || 0"
                  :totalResenas="hotel.resenas || 0"
                />
              </div>

              <!-- Contenido -->
              <div class="hotel-item-content">
                <h3 class="hotel-item-name">{{ hotel.nombre }}</h3>

                <!-- Rating -->
                <div class="mb-2">
                  <RatingStars
                    :rating="hotel.calificacion || 0"
                    :totalResenas="hotel.resenas || 0"
                    size="sm"
                  />
                </div>

                <p class="hotel-item-description">
                  {{ hotel.descripcion?.substring(0, 80) }}...
                </p>

                <!-- Stats -->
                <div class="hotel-item-stats">
                  <span class="stat-badge">
                    <i class="bi bi-eye-fill"></i>
                    {{ hotel.visitas || 0 }}
                  </span>
                  <span class="stat-badge">
                    <i class="bi bi-star-fill"></i>
                    {{ hotel.servicios?.length || 0 }} servicios
                  </span>
                </div>

                <!-- Servicios -->
                <div class="hotel-item-services">
                  <span
                    v-for="(servicio, idx) in hotel.servicios?.slice(0, 2)"
                    :key="idx"
                    class="service-badge"
                  >
                    {{ servicio }}
                  </span>
                  <span v-if="hotel.servicios?.length > 2" class="service-more">
                    +{{ hotel.servicios.length - 2 }}
                  </span>
                </div>

                <!-- Acciones -->
                <div class="hotel-item-actions">
                  <router-link
                    :to="`/hotel/${hotel.id}`"
                    class="btn-action btn-view"
                    target="_blank"
                  >
                    <i class="bi bi-eye"></i>
                    <span class="d-none d-lg-inline">Ver</span>
                  </router-link>
                  <button
                    @click="editarHotel(hotel)"
                    class="btn-action btn-edit"
                  >
                    <i class="bi bi-pencil"></i>
                    <span class="d-none d-lg-inline">Editar</span>
                  </button>
                  <button
                    @click="abrirGestionHabitaciones(hotel)"
                    class="btn-action btn-rooms"
                  >
                    <i class="bi bi-door-open"></i>
                    <span class="d-none d-lg-inline">Rooms</span>
                  </button>
                  <button
                    @click="eliminarHotel(hotel)"
                    class="btn-action btn-delete"
                  >
                    <i class="bi bi-trash"></i>
                    <span class="d-none d-lg-inline">Eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sección: Mis Reservas (reservas que hice) -->
        <div
          v-else-if="seccionActual === 'mis-reservas'"
          class="reservas-section"
        >
          <div class="section-header">
            <h2 class="section-title">
              <i class="bi bi-calendar-check me-2"></i>
              Mis Reservas
            </h2>
          </div>

          <Spinner
            v-if="cargandoReservas"
            size="md"
            message="Cargando reservas..."
          />

          <div v-else-if="misReservas.length === 0" class="empty-state">
            <i class="bi bi-calendar-x"></i>
            <h3>Sin reservas</h3>
            <p>Aún no has realizado ninguna reserva</p>
          </div>

          <div v-else class="reservas-grid">
            <div
              v-for="reserva in misReservas"
              :key="reserva.id"
              class="reserva-card"
            >
              <div class="reserva-header">
                <h4 class="reserva-hotel">{{ reserva.hotelNombre }}</h4>
                <span
                  :class="[
                    'badge-estado-reserva',
                    estadoBadgeClass(reserva.estado),
                  ]"
                >
                  {{ estadoTexto(reserva.estado) }}
                </span>
              </div>

              <div class="reserva-info">
                <div class="info-item">
                  <i class="bi bi-door-open-fill"></i>
                  <span>{{ reserva.habitacionNombre }}</span>
                </div>
                <div class="info-item">
                  <i class="bi bi-moon-stars-fill"></i>
                  <span>{{ reserva.habitacionCamas }}</span>
                </div>
              </div>

              <div class="reserva-fechas">
                <div class="fecha-item">
                  <span class="fecha-label">Check-in</span>
                  <strong>{{
                    new Date(reserva.checkIn).toLocaleDateString("es-CO")
                  }}</strong>
                </div>
                <div class="fecha-divider">
                  <i class="bi bi-arrow-right"></i>
                </div>
                <div class="fecha-item">
                  <span class="fecha-label">Check-out</span>
                  <strong>{{
                    new Date(reserva.checkOut).toLocaleDateString("es-CO")
                  }}</strong>
                </div>
              </div>

              <div class="reserva-detalles">
                <div class="detalle-row">
                  <span>Noches:</span>
                  <strong>{{ reserva.noches }}</strong>
                </div>
                <div class="detalle-row">
                  <span>Huéspedes:</span>
                  <strong
                    >{{ reserva.numeroAdultos }} adulto{{
                      reserva.numeroAdultos > 1 ? "s" : ""
                    }}{{
                      reserva.numeroNinos > 0
                        ? `, ${reserva.numeroNinos} niño${
                            reserva.numeroNinos > 1 ? "s" : ""
                          }`
                        : ""
                    }}</strong
                  >
                </div>
                <div class="detalle-row total">
                  <span>Total:</span>
                  <strong
                    >${{
                      (reserva.precioTotal || 0).toLocaleString("es-CO")
                    }}
                    COP</strong
                  >
                </div>
              </div>

              <div
                v-if="reserva.estado === 'rechazada' && reserva.motivoRechazo"
                class="motivo-rechazo-box"
              >
                <strong>Motivo del rechazo:</strong>
                <p>{{ reserva.motivoRechazo }}</p>
              </div>

              <div class="reserva-actions">
                <button
                  v-if="
                    reserva.estado === 'pendiente' ||
                    reserva.estado === 'confirmada'
                  "
                  @click="
                    cancelarMiReserva(
                      reserva.id,
                      reserva.habitacionId,
                      reserva.estado
                    )
                  "
                  class="btn-cancelar-reserva"
                >
                  <i class="bi bi-x-circle me-2"></i>
                  Cancelar Reserva
                </button>
                <button
                  v-else-if="
                    ['cancelada', 'rechazada', 'completada'].includes(
                      reserva.estado
                    )
                  "
                  @click="eliminarReservaUsuario(reserva)"
                  class="btn btn-outline-danger btn-sm ms-auto"
                  title="Eliminar"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sección: Reservas de mi Hotel -->
        <div
          v-else-if="seccionActual === 'reservas-hotel'"
          class="reservas-section"
        >
          <div class="section-header">
            <h2 class="section-title">
              <i class="bi bi-inbox me-2"></i>
              Reservas de mi Hotel
            </h2>
          </div>

          <Spinner
            v-if="cargandoReservas"
            size="md"
            message="Cargando reservas..."
          />

          <div v-else-if="reservasDeHotel.length === 0" class="empty-state">
            <i class="bi bi-inbox"></i>
            <h3>Sin reservas</h3>
            <p>Aún no has recibido solicitudes de reserva</p>
          </div>

          <div v-else class="reservas-grid">
            <div
              v-for="reserva in reservasDeHotel"
              :key="reserva.id"
              class="reserva-card reserva-hotel-card"
            >
              <div class="reserva-header">
                <div>
                  <h4 class="reserva-hotel">{{ reserva.hotelNombre }}</h4>
                  <p class="reserva-huesped">
                    <i class="bi bi-person-fill me-1"></i>
                    {{ reserva.nombreHuesped }}
                  </p>
                </div>
                <span
                  :class="[
                    'badge-estado-reserva',
                    estadoBadgeClass(reserva.estado),
                  ]"
                >
                  {{ estadoTexto(reserva.estado) }}
                </span>
              </div>

              <div class="reserva-info">
                <div class="info-item">
                  <i class="bi bi-door-open-fill"></i>
                  <span>{{ reserva.habitacionNombre }}</span>
                </div>
                <div class="info-item">
                  <i class="bi bi-envelope-fill"></i>
                  <span>{{ reserva.email }}</span>
                </div>
                <div class="info-item">
                  <i class="bi bi-telephone-fill"></i>
                  <span>{{ reserva.telefono }}</span>
                </div>
              </div>

              <div class="reserva-fechas">
                <div class="fecha-item">
                  <span class="fecha-label">Check-in</span>
                  <strong>{{
                    new Date(reserva.checkIn).toLocaleDateString("es-CO")
                  }}</strong>
                  <small v-if="reserva.horaLlegada">{{
                    reserva.horaLlegada
                  }}</small>
                </div>
                <div class="fecha-divider">
                  <i class="bi bi-arrow-right"></i>
                </div>
                <div class="fecha-item">
                  <span class="fecha-label">Check-out</span>
                  <strong>{{
                    new Date(reserva.checkOut).toLocaleDateString("es-CO")
                  }}</strong>
                </div>
              </div>

              <div class="reserva-detalles">
                <div class="detalle-row">
                  <span>Noches:</span>
                  <strong>{{ reserva.noches }}</strong>
                </div>
                <div class="detalle-row">
                  <span>Huéspedes:</span>
                  <strong
                    >{{ reserva.numeroAdultos }} adulto{{
                      reserva.numeroAdultos > 1 ? "s" : ""
                    }}{{
                      reserva.numeroNinos > 0
                        ? `, ${reserva.numeroNinos} niño${
                            reserva.numeroNinos > 1 ? "s" : ""
                          }`
                        : ""
                    }}</strong
                  >
                </div>
                <div class="detalle-row total">
                  <span>Total:</span>
                  <strong
                    >${{
                      reserva.precioTotal.toLocaleString("es-CO")
                    }}
                    COP</strong
                  >
                </div>
              </div>

              <div
                v-if="reserva.solicitudesEspeciales"
                class="solicitudes-especiales"
              >
                <strong>Solicitudes especiales:</strong>
                <p>{{ reserva.solicitudesEspeciales }}</p>
              </div>

              <!-- Acciones para dueño de hotel -->
              <div
                v-if="reserva.estado === 'pendiente'"
                class="reserva-actions-hotel"
              >
                <button
                  @click="
                    confirmarReservaHotel(reserva.id, reserva.habitacionId)
                  "
                  class="btn-confirmar-reserva"
                >
                  <i class="bi bi-check-circle me-2"></i>
                  Confirmar
                </button>
                <button
                  @click="abrirRechazarReserva(reserva)"
                  class="btn-rechazar-reserva"
                >
                  <i class="bi bi-x-circle me-2"></i>
                  Rechazar
                </button>
              </div>

              <div
                v-else-if="reserva.estado === 'confirmada'"
                class="reserva-actions-hotel-single"
              >
                <div class="reserva-status-inline">
                  <i class="bi bi-check-circle-fill me-2"></i>
                  Confirmada
                </div>
                <button
                  @click="registrarCheckIn(reserva.id)"
                  class="btn-checkin-reserva"
                >
                  <i class="bi bi-door-open me-2"></i>
                  Check-In
                </button>
              </div>

              <div
                v-else-if="reserva.estado === 'ocupada'"
                class="reserva-actions-hotel-single"
              >
                <div class="reserva-status-inline reserva-status-ocupada">
                  <i class="bi bi-person-check-fill me-2"></i>
                  Estadía
                </div>
                <button
                  @click="registrarCheckOut(reserva.id, reserva.habitacionId)"
                  class="btn-checkout-reserva"
                >
                  <i class="bi bi-box-arrow-right me-2"></i>
                  Check-Out
                </button>
              </div>

              <div
                v-else-if="reserva.estado === 'completada'"
                class="reserva-status-completada"
              >
                <i class="bi bi-check-all me-2"></i>
                Reserva completada - Huésped se fue
              </div>

              <div
                v-else-if="
                  reserva.estado === 'rechazada' && reserva.motivoRechazo
                "
                class="motivo-rechazo-box"
              >
                <strong>Motivo del rechazo:</strong>
                <p>{{ reserva.motivoRechazo }}</p>
              </div>

              <div
                v-else-if="reserva.estado === 'cancelada'"
                class="motivo-rechazo-box"
              >
                <strong>Reserva cancelada por el huésped</strong>
              </div>

              <div class="reserva-actions mt-2">
                <button
                  v-if="
                    ['cancelada', 'rechazada', 'completada'].includes(
                      reserva.estado
                    )
                  "
                  @click="eliminarReservaHotel(reserva)"
                  class="btn btn-outline-danger btn-sm"
                  title="Eliminar"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Modales -->
    <ModalLogin
      :is-open="modalLoginOpen"
      @close="closeLoginModal"
      @login-exitoso="handleLoginExitoso"
    />

    <ModalRegistrarHotel
      :is-open="modalRegistrarOpen"
      @close="closeRegistrar"
      @hotel-registrado="handleHotelRegistrado"
    />

    <ModalEditarHotel
      :is-open="modalEditarOpen"
      :hotel-id="hotelSeleccionado?.id"
      @close="closeEditar"
      @hotel-actualizado="handleHotelActualizado"
    />

    <ModalGestionarAnuncios
      :is-open="modalAnunciosOpen"
      @close="closeAnuncios"
      @anuncio-gestionado="handleAnuncioGestionado"
    />

    <ModalGestionarHabitaciones
      :is-open="modalHabitacionesOpen"
      :hotel-id="hotelSeleccionadoHabitaciones?.id || ''"
      :hotel-nombre="hotelSeleccionadoHabitaciones?.nombre || ''"
      @close="closeHabitaciones"
    />

    <!-- Modal Rechazar Reserva -->
    <Teleport to="body">
      <div
        v-if="modalRechazarReservaOpen"
        class="modal fade show d-block"
        tabindex="-1"
        style="background-color: rgba(0, 0, 0, 0.5)"
        @click.self="cancelarRechazoReserva"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-x-circle-fill me-2 text-danger"></i>
                Rechazar Reserva
              </h5>
              <button
                type="button"
                class="btn-close"
                @click="cancelarRechazoReserva"
              ></button>
            </div>
            <div class="modal-body">
              <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Importante:</strong> El motivo será enviado al huésped.
              </div>

              <div class="reserva-info-rechazo mb-3">
                <p>
                  <strong>Huésped:</strong>
                  {{ reservaARechazar?.nombreHuesped }}
                </p>
                <p>
                  <strong>Habitación:</strong>
                  {{ reservaARechazar?.habitacionNombre }}
                </p>
                <p>
                  <strong>Fechas:</strong> {{ reservaARechazar?.checkIn }} →
                  {{ reservaARechazar?.checkOut }}
                </p>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Motivo del rechazo <span class="text-danger">*</span>
                </label>
                <textarea
                  v-model="motivoRechazoReserva"
                  class="form-control"
                  rows="4"
                  placeholder="Ej: Lo sentimos, esas fechas ya no están disponibles. Por favor elige otras fechas..."
                  required
                ></textarea>
                <small class="text-muted">
                  Sé claro y cortés. El huésped recibirá este mensaje.
                </small>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                @click="cancelarRechazoReserva"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="btn btn-danger"
                @click="confirmarRechazoReserva"
              >
                <i class="bi bi-x-lg me-2"></i>
                Rechazar Reserva
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@import "../components/styles/Dashboard.css";

.badge-primary {
  background: #cfe2ff;
  color: #084298;
}

.btn-checkin-reserva {
  width: 100%;
  background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
  color: #fff;
  border: none;
  padding: 0.875rem 1rem;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
  cursor: pointer;
}

.btn-checkin-reserva:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(23, 162, 184, 0.4);
}

.btn-checkout-reserva {
  width: 100%;
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: #fff;
  border: none;
  padding: 0.875rem 1rem;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
  cursor: pointer;
}

.btn-checkout-reserva:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4);
}

.reserva-status-ocupada {
  padding: 0.75rem;
  background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
  border-radius: 12px;
  color: #0c5460;
  font-weight: 600;
  text-align: center;
}

.reserva-status-completada {
  padding: 1rem;
  background: linear-gradient(135deg, #d1ecf1 0%, #cfe2ff 100%);
  border-radius: 12px;
  color: #084298;
  font-weight: 600;
  text-align: center;
  margin-top: 1rem;
}

.reserva-actions-hotel-single {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1rem;
}

.reserva-status-inline {
  padding: 0.875rem 1rem;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-radius: 12px;
  color: #2e7d32;
  font-weight: 600;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reserva-status-inline.reserva-status-ocupada {
  background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
  color: #0c5460;
}

@media (max-width: 768px) {
  .reserva-actions-hotel-single {
    grid-template-columns: 1fr;
  }
}
</style>
