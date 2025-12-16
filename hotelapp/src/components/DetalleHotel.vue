<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import { useFirestore } from "../composables/useFirestore";
import { useHabitaciones } from "../composables/useHabitaciones";
import { useModal } from "../composables/useModal";
import ModalLogin from "./modals/ModalLogin.vue";
import ModalReservar from "./modals/ModalReservar.vue";
import { useToast } from "../composables/useToast";
import Spinner from "./common/Spinner.vue";
import RatingStars from "./common/RatingStars.vue";

const route = useRoute();
const router = useRouter();
const { user } = useAuth();
const { getDocument, updateDocument } = useFirestore("hotels");
const {
  addDocument: addReview,
  queryDocuments,
  updateDocument: updateReview,
} = useFirestore("reviews");
const { getHabitacionesByHotel } = useHabitaciones();
const {
  isOpen: modalLoginOpen,
  openModal: openLoginModal,
  closeModal: closeLoginModal,
} = useModal();
const {
  isOpen: modalContactoOpen,
  openModal: openContacto,
  closeModal: closeContacto,
} = useModal();
const {
  isOpen: modalResenasOpen,
  openModal: openResenas,
  closeModal: closeResenas,
} = useModal();
const {
  isOpen: modalReservarOpen,
  openModal: openReservar,
  closeModal: closeReservar,
} = useModal();

const { success, error, warning } = useToast();

const hotel = ref(null);
const resenas = ref([]);
const cargando = ref(true);
const imagenActual = ref(0);

const nuevaResena = ref({ comentario: "", calificacion: 5 });
const resenasLimitadas = ref([]);
const usuarioYaReseno = ref(false);
const invitadoNombre = ref("");
const invitadoEmail = ref("");
const respuestas = ref({});
const habitaciones = ref([]);
const cargandoHabitaciones = ref(false);
const habitacionSeleccionada = ref(null);

// Cargar datos del hotel
const cargarHotel = async () => {
  try {
    cargando.value = true;
    const hotelId = route.params.id;
    hotel.value = await getDocument(hotelId);

    // Verificar si está oculto y el usuario no es el dueño
    if (hotel.value.oculto && hotel.value.userId !== user.value?.uid) {
      warning("Este hotel no está disponible");
      router.push("/");
      return;
    }

    // Incrementar contador de visitas
    const nuevasVisitas = (hotel.value.visitas || 0) + 1;
    await updateDocument(hotelId, { visitas: nuevasVisitas });
    hotel.value.visitas = nuevasVisitas;

    // Cargar reseñas del hotel
    const filters = [
      { type: "where", field: "hotelId", operator: "==", value: hotelId },
      { type: "orderBy", field: "createdAt", direction: "desc" },
    ];
    resenas.value = await queryDocuments(filters);

    // Limitar a 3 reseñas para mostrar
    resenasLimitadas.value = resenas.value.slice(0, 3);

    // Verificar si el usuario ya dejó una reseña
    if (user.value) {
      usuarioYaReseno.value = resenas.value.some(
        (r) => r.userId === user.value.uid
      );
    } else {
      usuarioYaReseno.value = false;
    }
  } catch (err) {
    console.error("Error al cargar hotel:", err);
    error("Hotel no encontrado");
    router.push("/");
  } finally {
    cargando.value = false;
  }
};

const cargarHabitaciones = async () => {
  if (!route.params.id) return;
  try {
    cargandoHabitaciones.value = true;
    habitaciones.value = await getHabitacionesByHotel(route.params.id);
  } catch (err) {
    console.error("Error al cargar habitaciones:", err);
  } finally {
    cargandoHabitaciones.value = false;
  }
};

const esPropietario = computed(
  () => user.value && hotel.value && hotel.value.userId === user.value.uid
);

const enviarResena = async () => {
  if (esPropietario.value) {
    warning("Los dueños no pueden calificar su propio hotel");
    return;
  }
  // Eliminar requerimiento de login
  if (!nuevaResena.value.comentario.trim()) {
    warning("Por favor escribe un comentario");
    return;
  }
  if (!user.value) {
    if (!invitadoNombre.value.trim() || !invitadoEmail.value.trim()) {
      warning("Ingresa tu nombre y correo para publicar la reseña");
      return;
    }
  }
  if (usuarioYaReseno.value) {
    warning("Ya has dejado una reseña para este hotel");
    return;
  }

  try {
    const reviewData = {
      hotelId: route.params.id,
      userId: user.value?.uid || null,
      userName:
        user.value?.displayName ||
        user.value?.email ||
        invitadoNombre.value.trim() ||
        "Invitado",
      invitadoEmail: user.value ? null : invitadoEmail.value.trim(),
      comentario: nuevaResena.value.comentario,
      calificacion: nuevaResena.value.calificacion,
    };

    await addReview(reviewData);

    // Actualizar estadísticas del hotel
    const todasLasResenas = [...resenas.value, reviewData];
    const totalCalificacion = todasLasResenas.reduce(
      (sum, r) => sum + r.calificacion,
      0
    );
    const promedioCalificacion = totalCalificacion / todasLasResenas.length;

    await updateDocument(route.params.id, {
      resenas: todasLasResenas.length,
      calificacion: parseFloat(promedioCalificacion.toFixed(1)),
    });

    nuevaResena.value = { comentario: "", calificacion: 5 };
    invitadoNombre.value = "";
    invitadoEmail.value = "";
    await cargarHotel();
    success("¡Reseña publicada exitosamente!");
  } catch (err) {
    console.error("Error al publicar reseña:", err);
    error("Error al publicar la reseña. Intenta nuevamente.");
  }
};

const responderResena = async (resenaId) => {
  if (!esPropietario.value) return;
  const texto = (respuestas.value[resenaId] || "").trim();
  if (!texto) {
    warning("Escribe una respuesta");
    return;
  }
  try {
    await updateReview(resenaId, {
      respuestaOwner: texto,
      respuestaOwnerAt: new Date().toISOString(),
    });
    const target = resenas.value.find((r) => r.id === resenaId);
    if (target) {
      target.respuestaOwner = texto;
      target.respuestaOwnerAt = new Date().toISOString();
    }
    success("Respuesta publicada");
    respuestas.value[resenaId] = "";
  } catch (err) {
    console.error("Error al responder reseña:", err);
    error("No se pudo publicar la respuesta");
  }
};

const contactarWhatsApp = () => {
  if (hotel.value.whatsapp) {
    const numero = hotel.value.whatsapp.replace(/\D/g, "");
    const mensaje = encodeURIComponent(
      `Hola, estoy interesado en ${hotel.value.nombre}`
    );
    window.open(`https://wa.me/${numero}?text=${mensaje}`, "_blank");
  }
};

const contactarEmail = () => {
  if (hotel.value.email) {
    window.location.href = `mailto:${hotel.value.email}?subject=Consulta sobre ${hotel.value.nombre}`;
  }
};

const cambiarImagen = (indice) => {
  imagenActual.value = indice;
};

const handleLoginExitoso = () => {
  closeLoginModal();
  // Recargar datos para reflejar el login
};

const contactarWhatsAppHabitacion = (habitacion) => {
  if (hotel.value.whatsapp) {
    const numero = hotel.value.whatsapp.replace(/\D/g, "");
    const mensaje = encodeURIComponent(
      `Hola, estoy interesado en reservar la habitación ${habitacion.nombre} (${habitacion.camas}) en ${hotel.value.nombre}`
    );
    window.open(`https://wa.me/${numero}?text=${mensaje}`, "_blank");
  }
};

const abrirReserva = (habitacion) => {
  if (!user.value) {
    warning("Debes iniciar sesión para reservar");
    openLoginModal();
    return;
  }
  if (esPropietario.value) {
    warning("No puedes reservar en tu propio hotel");
    return;
  }
  habitacionSeleccionada.value = habitacion;
  openReservar();
};

const handleReservaCreada = () => {
  closeReservar();
  success("¡Solicitud de reserva enviada exitosamente!");
};

onMounted(() => {
  cargarHotel();
  cargarHabitaciones();
});
</script>

<template>
  <div>
    <!-- Loading -->
    <Spinner
      v-if="cargando"
      size="lg"
      message="Cargando información del hotel..."
    />

    <template v-else-if="hotel">
      <!-- Galería de imágenes -->
      <div class="gallery-section mb-4">
        <!-- Imagen principal -->
        <div class="main-image-container">
          <div
            v-if="hotel.imagenes && hotel.imagenes[imagenActual]"
            class="main-image"
            :style="{ backgroundImage: `url(${hotel.imagenes[imagenActual]})` }"
          ></div>
          <div v-else class="main-image-placeholder">
            <i class="bi bi-camera"></i>
            <p class="mt-2">Sin imágenes disponibles</p>
          </div>
        </div>

        <!-- Miniaturas -->
        <div
          v-if="hotel.imagenes && hotel.imagenes.length > 1"
          class="thumbnails-container"
        >
          <div
            v-for="(img, idx) in hotel.imagenes"
            :key="idx"
            class="thumbnail"
            :class="{ active: idx === imagenActual }"
            @click="cambiarImagen(idx)"
          >
            <div
              class="thumbnail-image"
              :style="{ backgroundImage: `url(${img})` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Información del hotel -->
      <div class="row g-4">
        <!-- Columna principal -->
        <div class="col-lg-8">
          <!-- Header del hotel -->
          <div class="hotel-header mb-4">
            <h1 class="hotel-name">{{ hotel.nombre }}</h1>

            <!-- Rating destacado -->
            <RatingStars
              :rating="hotel.calificacion || 0"
              :totalResenas="hotel.resenas || 0"
              size="lg"
            />

            <div v-if="hotel.direccion" class="hotel-location-header mt-2">
              <i class="bi bi-geo-alt-fill"></i>
              {{ hotel.direccion }}
            </div>
          </div>

          <!-- Descripción -->
          <div class="info-card mb-4">
            <h4 class="info-title">
              <i class="bi bi-info-circle-fill me-2"></i>
              Descripción
            </h4>
            <p class="info-description">{{ hotel.descripcion }}</p>
          </div>

          <!-- Habitaciones Disponibles -->
          <div class="info-card mb-4">
            <h4 class="info-title">
              <i class="bi bi-door-open-fill me-2"></i>
              Habitaciones Disponibles
            </h4>

            <Spinner
              v-if="cargandoHabitaciones"
              size="md"
              message="Cargando habitaciones..."
            />

            <div v-else-if="habitaciones.length === 0" class="empty-rooms">
              <i class="bi bi-door-closed"></i>
              <p>No hay habitaciones disponibles en este momento</p>
            </div>

            <div v-else class="rooms-grid">
              <div
                v-for="habitacion in habitaciones"
                :key="habitacion.id"
                class="room-card"
              >
                <div class="room-header">
                  <h5 class="room-name">{{ habitacion.nombre }}</h5>
                  <div class="room-price">
                    ${{ habitacion.precioCop?.toLocaleString("es-CO") }}
                    <span class="room-price-period">COP/noche</span>
                  </div>
                </div>

                <div class="room-details-full">
                  <div class="room-detail-item">
                    <i class="bi bi-moon-stars-fill"></i>
                    <span>{{ habitacion.camas }}</span>
                  </div>
                  <div class="room-detail-item">
                    <i class="bi bi-people-fill"></i>
                    <span
                      >{{ habitacion.capacidad }} persona{{
                        habitacion.capacidad > 1 ? "s" : ""
                      }}</span
                    >
                  </div>
                  <div class="room-detail-item">
                    <i class="bi bi-door-open-fill"></i>
                    <span
                      >{{ habitacion.disponibles }} disponible{{
                        habitacion.disponibles > 1 ? "s" : ""
                      }}</span
                    >
                  </div>
                  <div class="room-detail-item">
                    <i
                      :class="
                        habitacion.banioPrivado
                          ? 'bi bi-check-circle-fill text-success'
                          : 'bi bi-x-circle-fill text-danger'
                      "
                    ></i>
                    <span>
                      {{
                        habitacion.banioPrivado
                          ? "Baño privado"
                          : "Baño compartido"
                      }}
                    </span>
                  </div>
                </div>

                <p v-if="habitacion.descripcion" class="room-description">
                  {{ habitacion.descripcion }}
                </p>

                <div
                  v-if="habitacion.servicios && habitacion.servicios.length > 0"
                  class="room-services"
                >
                  <span
                    v-for="(servicio, idx) in habitacion.servicios"
                    :key="idx"
                    class="room-service-tag"
                  >
                    <i class="bi bi-check2"></i>
                    {{ servicio }}
                  </span>
                </div>

                <div class="room-footer">
                  <div class="room-price-usd">
                    ≈ USD ${{ habitacion.precio?.toFixed(2) }}
                  </div>
                  <button
                    @click="abrirReserva(habitacion)"
                    class="btn-reservar"
                    :disabled="habitacion.disponibles === 0 || esPropietario"
                  >
                    <i class="bi bi-calendar-check me-2"></i>
                    {{
                      esPropietario
                        ? "Tu hotel"
                        : habitacion.disponibles > 0
                        ? "Reservar"
                        : "No disponible"
                    }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Servicios -->
          <div class="info-card mb-4">
            <h4 class="info-title">
              <i class="bi bi-star-fill me-2"></i>
              Servicios
            </h4>
            <div class="services-grid">
              <div
                v-for="servicio in hotel.servicios"
                :key="servicio"
                class="service-item"
              >
                <i class="bi bi-check-circle-fill"></i>
                {{ servicio }}
              </div>
            </div>
          </div>

          <!-- Reseñas -->
          <div class="info-card">
            <h4 class="info-title">
              <i class="bi bi-chat-dots-fill me-2"></i>
              Reseñas ({{ resenas.length }})
            </h4>

            <div v-if="resenas.length === 0" class="empty-reviews">
              <i class="bi bi-chat-dots"></i>
              <p>Este hotel aún no tiene reseñas</p>
              <small>¡Sé el primero en dejar una!</small>
            </div>

            <div v-else>
              <!-- Lista limitada de reseñas -->
              <div class="reviews-list">
                <div
                  v-for="resena in resenasLimitadas"
                  :key="resena.id"
                  class="review-card"
                >
                  <div class="review-header">
                    <div class="review-user">
                      <div class="user-avatar">
                        <i class="bi bi-person-circle"></i>
                      </div>
                      <div>
                        <h6 class="user-name">{{ resena.userName }}</h6>
                        <div class="review-stars">
                          <i
                            v-for="i in 5"
                            :key="i"
                            class="bi"
                            :class="
                              i <= resena.calificacion
                                ? 'bi-star-fill'
                                : 'bi-star'
                            "
                          ></i>
                        </div>
                      </div>
                    </div>
                    <small class="review-date">
                      {{
                        resena.createdAt
                          ? new Date(
                              resena.createdAt.seconds * 1000
                            ).toLocaleDateString()
                          : "Reciente"
                      }}
                    </small>
                  </div>
                  <p class="review-comment">{{ resena.comentario }}</p>

                  <!-- Respuesta del dueño -->
                  <div v-if="resena.respuestaOwner" class="owner-reply">
                    <div class="owner-reply-header">
                      <i class="bi bi-chat-quote-fill"></i>
                      <span>Respuesta del dueño</span>
                    </div>
                    <p class="owner-reply-text">{{ resena.respuestaOwner }}</p>
                  </div>

                  <div v-else-if="esPropietario" class="owner-reply-form">
                    <label class="form-label mb-2">Responder como dueño</label>
                    <textarea
                      v-model="respuestas[resena.id]"
                      class="form-control mb-2"
                      rows="2"
                      placeholder="Agradece o responde al huésped..."
                    ></textarea>
                    <button
                      class="btn-publicar-respuesta"
                      @click="responderResena(resena.id)"
                    >
                      <i class="bi bi-reply-fill me-2"></i>
                      Publicar respuesta
                    </button>
                  </div>
                </div>
              </div>

              <!-- Botón ver todas -->
              <div v-if="resenas.length > 3" class="text-center mt-3">
                <button @click="openResenas" class="btn-ver-todas">
                  Ver todas las reseñas ({{ resenas.length }})
                  <i class="bi bi-arrow-right ms-2"></i>
                </button>
              </div>
            </div>

            <!-- Formulario de reseña -->
            <div class="review-form" v-if="!usuarioYaReseno && !esPropietario">
              <h5 class="form-title">Deja tu reseña</h5>
              <form @submit.prevent="enviarResena">
                <div class="mb-3" v-if="!user">
                  <label class="form-label">Tu nombre</label>
                  <input
                    v-model="invitadoNombre"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="mb-3" v-if="!user">
                  <label class="form-label">Tu correo</label>
                  <input
                    v-model="invitadoEmail"
                    type="email"
                    class="form-control"
                    required
                  />
                </div>
                <div class="mb-3">
                  <label class="form-label">Calificación</label>
                  <div class="rating-select">
                    <label
                      v-for="rating in [1, 2, 3, 4, 5]"
                      :key="rating"
                      class="rating-option"
                    >
                      <input
                        type="radio"
                        :value="rating"
                        v-model.number="nuevaResena.calificacion"
                      />
                      <i
                        class="bi"
                        :class="
                          rating <= nuevaResena.calificacion
                            ? 'bi-star-fill'
                            : 'bi-star'
                        "
                      ></i>
                    </label>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Comentario</label>
                  <textarea
                    v-model="nuevaResena.comentario"
                    class="form-control"
                    rows="3"
                    placeholder="Cuéntanos sobre tu experiencia..."
                    required
                  ></textarea>
                </div>
                <div class="submit-button-container">
                  <button type="submit" class="btn-submit-review">
                    <i class="bi bi-send-fill me-2"></i>
                    Publicar Reseña
                  </button>
                </div>
              </form>
            </div>

            <!-- Mensaje si ya reseñó -->
            <div v-else-if="usuarioYaReseno" class="already-reviewed">
              <i class="bi bi-check-circle-fill"></i>
              <p>Ya has dejado una reseña para este hotel</p>
            </div>

            <!-- Mensaje si es propietario -->
            <div v-else-if="esPropietario" class="already-reviewed">
              <i class="bi bi-shield-lock-fill"></i>
              <p>Los dueños no pueden calificar su propio hotel</p>
            </div>
          </div>
        </div>

        <!-- Sidebar - Solo desktop -->
        <div class="col-lg-4 d-none d-lg-block">
          <div class="sidebar-card">
            <div class="price-section">
              <div class="price-amount">
                Desde ${{
                  habitaciones.length > 0
                    ? Math.min(
                        ...habitaciones.map((h) => h.precioCop)
                      ).toLocaleString("es-CO")
                    : "0"
                }}
                <span class="price-period">COP /noche</span>
              </div>
              <div class="price-usd">
                ≈ USD ${{
                  habitaciones.length > 0
                    ? Math.min(...habitaciones.map((h) => h.precio)).toFixed(2)
                    : "0"
                }}
              </div>
            </div>

            <!-- Información de contacto -->
            <div class="contact-section">
              <h5 class="contact-title">Información de Contacto</h5>

              <div class="contact-list">
                <div v-if="hotel.telefono" class="contact-item">
                  <i class="bi bi-telephone-fill"></i>
                  <span>{{ hotel.telefono }}</span>
                </div>
                <div v-if="hotel.email" class="contact-item">
                  <i class="bi bi-envelope-fill"></i>
                  <span>{{ hotel.email }}</span>
                </div>
                <div v-if="hotel.direccion" class="contact-item">
                  <i class="bi bi-geo-alt-fill"></i>
                  <span>{{ hotel.direccion }}</span>
                </div>
              </div>

              <!-- Botones de contacto -->
              <div class="contact-buttons">
                <button
                  v-if="hotel.whatsapp"
                  class="btn-whatsapp"
                  @click="contactarWhatsApp"
                >
                  <i class="bi bi-whatsapp me-2"></i>
                  Contactar por WhatsApp
                </button>
                <button
                  v-if="hotel.email"
                  class="btn-email"
                  @click="contactarEmail"
                >
                  <i class="bi bi-envelope me-2"></i>
                  Enviar Email
                </button>
              </div>
            </div>

            <!-- Info del propietario -->
            <div class="owner-section">
              <div class="owner-info">
                <i class="bi bi-person-circle"></i>
                <span>Publicado por: {{ hotel.userName }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Botón flotante - Solo móvil -->
      <button class="floating-contact-btn d-lg-none" @click="openContacto">
        <i class="bi bi-telephone-fill"></i>
      </button>

      <!-- Modal de contacto - Solo móvil -->
      <Teleport to="body">
        <div
          v-if="modalContactoOpen"
          class="modal fade show d-block d-lg-none"
          tabindex="-1"
          style="background-color: rgba(0, 0, 0, 0.5)"
          @click.self="closeContacto"
        >
          <div class="modal-dialog modal-dialog-bottom">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-info-circle-fill me-2"></i>
                  Información y Contacto
                </h5>
                <button
                  type="button"
                  class="btn-close"
                  @click="closeContacto"
                ></button>
              </div>
              <div class="modal-body">
                <!-- Precio -->
                <div class="mobile-price-section">
                  <div class="mobile-price">
                    Desde ${{
                      habitaciones.length > 0
                        ? Math.min(
                            ...habitaciones.map((h) => h.precioCop)
                          ).toLocaleString("es-CO")
                        : "0"
                    }}
                    <span class="mobile-price-period">COP /noche</span>
                  </div>
                  <div class="mobile-price-usd">
                    ≈ USD ${{
                      habitaciones.length > 0
                        ? Math.min(
                            ...habitaciones.map((h) => h.precio)
                          ).toFixed(2)
                        : "0"
                    }}
                  </div>
                </div>

                <!-- Contacto -->
                <div class="mobile-contact-list">
                  <div v-if="hotel.telefono" class="mobile-contact-item">
                    <i class="bi bi-telephone-fill"></i>
                    <span>{{ hotel.telefono }}</span>
                  </div>
                  <div v-if="hotel.email" class="mobile-contact-item">
                    <i class="bi bi-envelope-fill"></i>
                    <span>{{ hotel.email }}</span>
                  </div>
                  <div v-if="hotel.direccion" class="mobile-contact-item">
                    <i class="bi bi-geo-alt-fill"></i>
                    <span>{{ hotel.direccion }}</span>
                  </div>
                </div>

                <!-- Botones -->
                <div class="mobile-contact-buttons">
                  <button
                    v-if="hotel.whatsapp"
                    class="btn-whatsapp"
                    @click="contactarWhatsApp"
                  >
                    <i class="bi bi-whatsapp me-2"></i>
                    WhatsApp
                  </button>
                  <button
                    v-if="hotel.email"
                    class="btn-email"
                    @click="contactarEmail"
                  >
                    <i class="bi bi-envelope me-2"></i>
                    Correo
                  </button>
                </div>

                <!-- Owner -->
                <div class="mobile-owner">
                  <i class="bi bi-person-circle"></i>
                  <span>{{ hotel.userName }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </template>

    <!-- Modal todas las reseñas -->
    <Teleport to="body">
      <div
        v-if="modalResenasOpen"
        class="modal fade show d-block"
        tabindex="-1"
        style="background-color: rgba(0, 0, 0, 0.5)"
        @click.self="closeResenas"
      >
        <div
          class="modal-dialog modal-dialog-centered modal-dialog-scrollable custom-modal-lg"
        >
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-chat-dots-fill me-2"></i>
                Todas las Reseñas ({{ resenas.length }})
              </h5>
              <button
                type="button"
                class="btn-close"
                @click="closeResenas"
              ></button>
            </div>
            <div class="modal-body">
              <div
                v-for="resena in resenas"
                :key="resena.id"
                class="review-card mb-3"
              >
                <div class="review-header">
                  <div class="review-user">
                    <div class="user-avatar">
                      <i class="bi bi-person-circle"></i>
                    </div>
                    <div>
                      <h6 class="user-name">{{ resena.userName }}</h6>
                      <div class="review-stars">
                        <i
                          v-for="i in 5"
                          :key="i"
                          class="bi"
                          :class="
                            i <= resena.calificacion
                              ? 'bi-star-fill'
                              : 'bi-star'
                          "
                        ></i>
                      </div>
                    </div>
                  </div>
                  <small class="review-date">
                    {{
                      resena.createdAt
                        ? new Date(
                            resena.createdAt.seconds * 1000
                          ).toLocaleDateString()
                        : "Reciente"
                    }}
                  </small>
                </div>
                <p class="review-comment">{{ resena.comentario }}</p>

                <!-- Respuesta del dueño -->
                <div v-if="resena.respuestaOwner" class="owner-reply">
                  <div class="owner-reply-header">
                    <i class="bi bi-chat-quote-fill"></i>
                    <span>Respuesta del dueño</span>
                  </div>
                  <p class="owner-reply-text">{{ resena.respuestaOwner }}</p>
                </div>

                <div v-else-if="esPropietario" class="owner-reply-form">
                  <label class="form-label mb-2">Responder como dueño</label>
                  <textarea
                    v-model="respuestas[resena.id]"
                    class="form-control mb-2"
                    rows="2"
                    placeholder="Agradece o responde al huésped..."
                  ></textarea>
                  <button
                    class="btn-publicar-respuesta"
                    @click="responderResena(resena.id)"
                  >
                    <i class="bi bi-reply-fill me-2"></i>
                    Publicar respuesta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Reservar -->
    <ModalReservar
      :is-open="modalReservarOpen"
      :habitacion="habitacionSeleccionada"
      :hotel="hotel"
      @close="closeReservar"
      @reserva-creada="handleReservaCreada"
    />

    <!-- Modal Login -->
    <ModalLogin
      :is-open="modalLoginOpen"
      @close="closeLoginModal"
      @login-exitoso="handleLoginExitoso"
    />
  </div>
</template>

<style scoped>
@import "../components/styles/DetalleHotel.css";

.empty-rooms {
  text-align: center;
  padding: 3rem 2rem;
  color: #999;
}

.empty-rooms i {
  font-size: 4rem;
  color: #ddd;
  margin-bottom: 1rem;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.room-card {
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  border: 2px solid #e0e7ff;
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.room-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
  border-color: #667eea;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.room-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #2d3561;
  margin: 0;
}

.room-price {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-weight: 700;
  font-size: 1.1rem;
  white-space: nowrap;
  text-align: right;
}

.room-price-period {
  display: block;
  font-size: 0.75rem;
  opacity: 0.9;
}

.room-description {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.room-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.room-detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #667eea;
  font-weight: 600;
  font-size: 0.9rem;
}

.room-detail-item i {
  font-size: 1.1rem;
}

.btn-reservar {
  width: 100%;
  background: linear-gradient(135deg, #25d366 0%, #22c55e 100%);
  color: #fff;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
}

.btn-reservar:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
}

.btn-reservar:disabled {
  background: #e0e0e0;
  color: #999;
  cursor: not-allowed;
  box-shadow: none;
}

.room-details-full {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.room-services {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.room-service-tag {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.room-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #e0e7ff;
}

.room-price-usd {
  color: #667eea;
  font-weight: 600;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .rooms-grid {
    grid-template-columns: 1fr;
  }

  .room-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .room-price {
    align-self: flex-start;
  }

  .room-details-full {
    grid-template-columns: 1fr;
  }

  .room-footer {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }

  .btn-reservar {
    width: 100%;
  }
}
</style>
