<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import { useFirestore } from "../composables/useFirestore";
import { useStorage } from "../composables/useStorage";
import { useToast } from "../composables/useToast";
import { useConfirm } from "../composables/useConfirm";
import Spinner from "./common/Spinner.vue";

const router = useRouter();
const { user, isAdmin } = useAuth();
const {
  queryDocuments: getAds,
  updateDocument: updateAd,
  deleteDocument: deleteAd,
} = useFirestore("ads");
const {
  queryDocuments: getHotels,
  updateDocument: updateHotel,
  deleteDocument: deleteHotel,
} = useFirestore("hotels");
const {
  queryDocuments: getArticulos,
  updateDocument: updateArticulo,
  deleteDocument: deleteArticulo,
} = useFirestore("articles");
const { getDocument: getConfig, setDocument: setConfig } =
  useFirestore("config");
const { deleteFile, deleteMultipleFiles, extractPathFromUrl } = useStorage();
const { success, error, warning } = useToast();
const { confirm: confirmar } = useConfirm();

const cargando = ref(true);
const vistaActual = ref("anuncios"); // anuncios, hoteles, articulos, estadisticas, configuracion

// Datos
const anunciosPendientes = ref([]);
const anunciosAprobados = ref([]);
const anunciosRechazados = ref([]);
const todosHoteles = ref([]);
const todosArticulos = ref([]);
const totalUsuarios = ref(0);

// Filtros y búsqueda
const busquedaHoteles = ref("");
const busquedaArticulos = ref("");
const filtroEstadoAnuncios = ref("pendientes"); // pendientes, aprobados, rechazados, todos

const estadisticas = computed(() => ({
  totalAnuncios:
    anunciosPendientes.value.length +
    anunciosAprobados.value.length +
    anunciosRechazados.value.length,
  pendientes: anunciosPendientes.value.length,
  aprobados: anunciosAprobados.value.length,
  rechazados: anunciosRechazados.value.length,
  ingresosPotenciales: anunciosPendientes.value.reduce(
    (acc, ad) => acc + ad.plan.precio,
    0
  ),
  ingresosConfirmados: anunciosAprobados.value.reduce(
    (acc, ad) => acc + ad.plan.precio,
    0
  ),
}));

const hotelesFiltrados = computed(() => {
  if (!busquedaHoteles.value.trim()) return todosHoteles.value;
  const termino = busquedaHoteles.value.toLowerCase();
  return todosHoteles.value.filter(
    (h) =>
      h.nombre?.toLowerCase().includes(termino) ||
      h.userName?.toLowerCase().includes(termino) ||
      h.direccion?.toLowerCase().includes(termino)
  );
});

const articulosFiltrados = computed(() => {
  if (!busquedaArticulos.value.trim()) return todosArticulos.value;
  const termino = busquedaArticulos.value.toLowerCase();
  return todosArticulos.value.filter(
    (a) =>
      a.titulo?.toLowerCase().includes(termino) ||
      a.autor?.toLowerCase().includes(termino)
  );
});

const anunciosFiltrados = computed(() => {
  switch (filtroEstadoAnuncios.value) {
    case "pendientes":
      return anunciosPendientes.value;
    case "aprobados":
      return anunciosAprobados.value;
    case "rechazados":
      return anunciosRechazados.value;
    default:
      return [
        ...anunciosPendientes.value,
        ...anunciosAprobados.value,
        ...anunciosRechazados.value,
      ];
  }
});

const cargarAnuncios = async () => {
  try {
    const filters = [
      { type: "orderBy", field: "createdAt", direction: "desc" },
    ];
    const todos = await getAds(filters);

    anunciosPendientes.value = todos.filter(
      (ad) => ad.estadoPago === "pendiente"
    );
    anunciosAprobados.value = todos.filter(
      (ad) => ad.estadoPago === "aprobado"
    );
    anunciosRechazados.value = todos.filter(
      (ad) => ad.estadoPago === "rechazado"
    );
  } catch (err) {
    console.error("Error al cargar anuncios:", err);
  }
};

const cargarHoteles = async () => {
  try {
    const filters = [
      { type: "orderBy", field: "createdAt", direction: "desc" },
    ];
    todosHoteles.value = await getHotels(filters);
  } catch (err) {
    console.error("Error al cargar hoteles:", err);
  }
};

const cargarArticulos = async () => {
  try {
    const filters = [
      { type: "orderBy", field: "createdAt", direction: "desc" },
    ];
    todosArticulos.value = await getArticulos(filters);
  } catch (err) {
    console.error("Error al cargar artículos:", err);
  }
};

const cargarEstadisticas = async () => {
  try {
    const usuariosUnicos = new Set(todosHoteles.value.map((h) => h.userId));
    totalUsuarios.value = usuariosUnicos.size;
  } catch (err) {
    console.error("Error al cargar estadísticas:", err);
  }
};

const aprobarAnuncio = async (anuncioId) => {
  if (!(await confirmar("¿Aprobar este pago y activar el anuncio?"))) return;

  try {
    const anuncio = [
      ...anunciosPendientes.value,
      ...anunciosAprobados.value,
      ...anunciosRechazados.value,
    ].find((a) => a.id === anuncioId);

    if (anuncio?.comprobantePago) {
      const rutaComprobante = extractPathFromUrl(anuncio.comprobantePago);
      if (rutaComprobante) {
        try {
          await deleteFile(rutaComprobante);
          console.log("✅ Comprobante eliminado de Supabase (aprobado)");
        } catch (err) {
          console.warn("⚠️ Error al eliminar comprobante:", err);
        }
      }
    }

    await updateAd(anuncioId, {
      estadoPago: "aprobado",
      activo: true,
      aprobadoAt: new Date().toISOString(),
      aprobadoPor: user.value.email,
      comprobantePago: null,
    });

    success("Anuncio aprobado y activado");
    await cargarAnuncios();
  } catch (err) {
    console.error("Error:", err);
    error("Error al aprobar anuncio");
  }
};

const motivoRechazo = ref("");
const modalRechazarOpen = ref(false);
const anuncioARechazar = ref(null);

const rechazarAnuncio = async (anuncioId) => {
  anuncioARechazar.value = anuncioId;
  motivoRechazo.value = "";
  modalRechazarOpen.value = true;
};

const confirmarRechazo = async () => {
  if (!motivoRechazo.value.trim()) {
    warning("Por favor ingresa un motivo de rechazo");
    return;
  }

  try {
    const anuncio = [
      ...anunciosPendientes.value,
      ...anunciosAprobados.value,
      ...anunciosRechazados.value,
    ].find((a) => a.id === anuncioARechazar.value);

    if (anuncio?.comprobantePago) {
      const rutaComprobante = extractPathFromUrl(anuncio.comprobantePago);
      if (rutaComprobante) {
        try {
          await deleteFile(rutaComprobante);
          console.log("✅ Comprobante eliminado de Supabase (rechazado)");
        } catch (err) {
          console.warn("⚠️ Error al eliminar comprobante:", err);
        }
      }
    }

    await updateAd(anuncioARechazar.value, {
      estadoPago: "rechazado",
      activo: false,
      rechazadoAt: new Date().toISOString(),
      rechazadoPor: user.value.email,
      motivoRechazo: motivoRechazo.value.trim(),
      comprobantePago: null,
    });

    warning("Anuncio rechazado");
    modalRechazarOpen.value = false;
    motivoRechazo.value = "";
    anuncioARechazar.value = null;
    await cargarAnuncios();
  } catch (err) {
    console.error("Error:", err);
    error("Error al rechazar anuncio");
  }
};

const cancelarRechazo = () => {
  modalRechazarOpen.value = false;
  motivoRechazo.value = "";
  anuncioARechazar.value = null;
};

const eliminarAnuncioAdmin = async (anuncioId) => {
  if (!(await confirmar("¿Eliminar este anuncio permanentemente?"))) return;

  try {
    const anuncio = [
      ...anunciosPendientes.value,
      ...anunciosAprobados.value,
      ...anunciosRechazados.value,
    ].find((a) => a.id === anuncioId);

    // Eliminar imagen del anuncio
    if (anuncio?.imagen) {
      const rutaImagen = extractPathFromUrl(anuncio.imagen);
      if (rutaImagen) {
        try {
          await deleteFile(rutaImagen);
          console.log("✅ Imagen del anuncio eliminada");
        } catch (err) {
          console.warn("⚠️ Error al eliminar imagen:", err);
        }
      }
    }

    // Eliminar comprobante si existe
    if (anuncio?.comprobantePago) {
      const rutaComprobante = extractPathFromUrl(anuncio.comprobantePago);
      if (rutaComprobante) {
        try {
          await deleteFile(rutaComprobante);
          console.log("✅ Comprobante eliminado");
        } catch (err) {
          console.warn("⚠️ Error al eliminar comprobante:", err);
        }
      }
    }

    await deleteAd(anuncioId);
    success("Anuncio eliminado");
    await cargarAnuncios();
  } catch (err) {
    console.error("Error:", err);
    error("Error al eliminar anuncio");
  }
};

const eliminarHotelAdmin = async (hotelId) => {
  if (
    !(await confirmar(
      "¿Eliminar este hotel? Esto eliminará también todas sus imágenes."
    ))
  )
    return;

  try {
    const hotel = todosHoteles.value.find((h) => h.id === hotelId);

    // Eliminar imágenes
    if (hotel?.imagenes && hotel.imagenes.length > 0) {
      const rutasImagenes = hotel.imagenes
        .map((url) => extractPathFromUrl(url))
        .filter((ruta) => ruta !== null);

      if (rutasImagenes.length > 0) {
        try {
          await deleteMultipleFiles(rutasImagenes);
          console.log("✅ Imágenes del hotel eliminadas");
        } catch (err) {
          console.warn("⚠️ Error al eliminar imágenes:", err);
        }
      }
    }

    await deleteHotel(hotelId);
    success("Hotel eliminado");
    await cargarHoteles();
    await cargarEstadisticas();
  } catch (err) {
    console.error("Error:", err);
    error("Error al eliminar hotel");
  }
};

const toggleVisibilidadHotel = async (hotelId, estadoActual) => {
  try {
    await updateHotel(hotelId, { oculto: !estadoActual });
    success(estadoActual ? "Hotel visible ahora" : "Hotel ocultado");
    await cargarHoteles();
  } catch (err) {
    console.error("Error:", err);
    error("Error al cambiar visibilidad");
  }
};

const eliminarArticuloAdmin = async (articuloId) => {
  if (
    !(await confirmar(
      "¿Eliminar este artículo? Se eliminará también su imagen destacada."
    ))
  )
    return;

  try {
    const articulo = todosArticulos.value.find((a) => a.id === articuloId);

    // Eliminar imagen destacada
    if (articulo?.imagenDestacada) {
      const rutaImagen = extractPathFromUrl(articulo.imagenDestacada);
      if (rutaImagen) {
        try {
          await deleteFile(rutaImagen);
          console.log("✅ Imagen del artículo eliminada");
        } catch (err) {
          console.warn("⚠️ Error al eliminar imagen:", err);
        }
      }
    }

    await deleteArticulo(articuloId);
    success("Artículo eliminado");
    await cargarArticulos();
  } catch (err) {
    console.error("Error:", err);
    error("Error al eliminar artículo");
  }
};

const toggleVisibilidadArticulo = async (articuloId, estadoActual) => {
  try {
    await updateArticulo(articuloId, { oculto: !estadoActual });
    success(estadoActual ? "Artículo visible ahora" : "Artículo ocultado");
    await cargarArticulos();
  } catch (err) {
    console.error("Error:", err);
    error("Error al cambiar visibilidad");
  }
};

const calcularDiasRestantes = (fechaFin) => {
  const ahora = new Date();
  const fin = new Date(fechaFin);
  const diferencia = fin - ahora;
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  return dias > 0 ? dias : 0;
};

const formatearFecha = (fecha) => {
  if (!fecha) return "N/A";
  const date = fecha.seconds ? new Date(fecha.seconds * 1000) : new Date(fecha);
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Configuración del sistema
const formatCOP = (val) => {
  const n = parseInt((val || "").toString().replace(/\D/g, ""), 10) || 0;
  return n.toLocaleString("es-CO");
};
const parseCOP = (val) =>
  parseInt((val || "").toString().replace(/\D/g, ""), 10) || 0;

const configuracion = ref({
  numeroNequi: "3001234567",
  planesPublicidad: {
    basico: {
      nombre: "Básico",
      precio: formatCOP(50000),
      duracion: 7,
      descripcion: "1 semana",
    },
    premium: {
      nombre: "Premium",
      precio: formatCOP(150000),
      duracion: 30,
      descripcion: "1 mes",
    },
    destacado: {
      nombre: "Destacado",
      precio: formatCOP(400000),
      duracion: 90,
      descripcion: "3 meses",
    },
  },
});

const cargarConfiguracion = async () => {
  try {
    const config = await getConfig("sistema", { silentNotFound: true });
    if (config) {
      configuracion.value.numeroNequi =
        config.numeroNequi || configuracion.value.numeroNequi;
      const planes =
        config.planesPublicidad || configuracion.value.planesPublicidad;
      configuracion.value.planesPublicidad = {
        basico: { ...planes.basico, precio: formatCOP(planes.basico?.precio) },
        premium: {
          ...planes.premium,
          precio: formatCOP(planes.premium?.precio),
        },
        destacado: {
          ...planes.destacado,
          precio: formatCOP(planes.destacado?.precio),
        },
      };
    }
  } catch (err) {
    console.log("Usando configuración por defecto");
  }
};

const guardarConfiguracion = async () => {
  try {
    const payload = {
      ...configuracion.value,
      planesPublicidad: {
        basico: {
          ...configuracion.value.planesPublicidad.basico,
          precio: parseCOP(configuracion.value.planesPublicidad.basico.precio),
        },
        premium: {
          ...configuracion.value.planesPublicidad.premium,
          precio: parseCOP(configuracion.value.planesPublicidad.premium.precio),
        },
        destacado: {
          ...configuracion.value.planesPublicidad.destacado,
          precio: parseCOP(
            configuracion.value.planesPublicidad.destacado.precio
          ),
        },
      },
    };
    await setConfig("sistema", payload);
    success("Configuración guardada exitosamente");
  } catch (err) {
    console.error("Error al guardar configuración:", err);
    error("Error al guardar configuración");
  }
};

// Paginación
const paginaAnuncios = ref(1);
const paginaHoteles = ref(1);
const paginaArticulos = ref(1);
const itemsPorPagina = 10;

const anunciosPaginados = computed(() => {
  const inicio = (paginaAnuncios.value - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  return anunciosFiltrados.value.slice(inicio, fin);
});

const totalPaginasAnuncios = computed(() =>
  Math.ceil(anunciosFiltrados.value.length / itemsPorPagina)
);

const hotelesPaginados = computed(() => {
  const inicio = (paginaHoteles.value - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  return hotelesFiltrados.value.slice(inicio, fin);
});

const totalPaginasHoteles = computed(() =>
  Math.ceil(hotelesFiltrados.value.length / itemsPorPagina)
);

const articulosPaginados = computed(() => {
  const inicio = (paginaArticulos.value - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  return articulosFiltrados.value.slice(inicio, fin);
});

const totalPaginasArticulos = computed(() =>
  Math.ceil(articulosFiltrados.value.length / itemsPorPagina)
);

const cambiarPagina = (tipo, pagina) => {
  if (tipo === "anuncios") paginaAnuncios.value = pagina;
  if (tipo === "hoteles") paginaHoteles.value = pagina;
  if (tipo === "articulos") paginaArticulos.value = pagina;

  // Scroll al inicio de la tabla
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// Reset página al cambiar filtros
watch(filtroEstadoAnuncios, () => (paginaAnuncios.value = 1));
watch(busquedaHoteles, () => (paginaHoteles.value = 1));
watch(busquedaArticulos, () => (paginaArticulos.value = 1));

onMounted(async () => {
  if (!isAdmin.value) {
    error("Acceso denegado");
    router.push("/");
    return;
  }

  cargando.value = true;
  await Promise.all([cargarAnuncios(), cargarHoteles(), cargarArticulos()]);
  await cargarEstadisticas();
  await cargarConfiguracion();
  cargando.value = false;
});
</script>

<template>
  <div>
    <!-- Header Admin -->
    <div class="admin-header">
      <div class="header-content">
        <div>
          <h1 class="admin-title">
            <i class="bi bi-shield-lock-fill me-3"></i>
            Panel de Administración
          </h1>
          <p class="admin-subtitle">Control total del sistema</p>
        </div>
      </div>
    </div>

    <!-- Tabs de navegación -->
    <div class="admin-tabs">
      <button
        :class="['tab-btn', { active: vistaActual === 'anuncios' }]"
        @click="vistaActual = 'anuncios'"
      >
        <i class="bi bi-megaphone-fill me-2"></i>
        Anuncios
        <span v-if="anunciosPendientes.length > 0" class="badge-count">
          {{ anunciosPendientes.length }}
        </span>
      </button>
      <button
        :class="['tab-btn', { active: vistaActual === 'hoteles' }]"
        @click="vistaActual = 'hoteles'"
      >
        <i class="bi bi-building-fill me-2"></i>
        Hoteles ({{ todosHoteles.length }})
      </button>
      <button
        :class="['tab-btn', { active: vistaActual === 'articulos' }]"
        @click="vistaActual = 'articulos'"
      >
        <i class="bi bi-journal-text me-2"></i>
        Artículos ({{ todosArticulos.length }})
      </button>
      <button
        :class="['tab-btn', { active: vistaActual === 'estadisticas' }]"
        @click="vistaActual = 'estadisticas'"
      >
        <i class="bi bi-graph-up-arrow me-2"></i>
        Estadísticas
      </button>
      <button
        :class="['tab-btn', { active: vistaActual === 'configuracion' }]"
        @click="vistaActual = 'configuracion'"
      >
        <i class="bi bi-gear-fill me-2"></i>
        Configuración
      </button>
    </div>

    <!-- Loading -->
    <Spinner v-if="cargando" size="lg" message="Cargando datos..." />

    <!-- Vista: Anuncios -->
    <div v-else-if="vistaActual === 'anuncios'">
      <!-- Stats Cards -->
      <div class="stats-grid mb-4">
        <div
          class="stat-card stat-warning"
          @click="filtroEstadoAnuncios = 'pendientes'"
        >
          <div class="stat-icon">
            <i class="bi bi-clock-fill"></i>
          </div>
          <div class="stat-content">
            <h3 class="stat-number">{{ estadisticas.pendientes }}</h3>
            <p class="stat-label">Pendientes</p>
          </div>
        </div>

        <div
          class="stat-card stat-success"
          @click="filtroEstadoAnuncios = 'aprobados'"
        >
          <div class="stat-icon">
            <i class="bi bi-check-circle-fill"></i>
          </div>
          <div class="stat-content">
            <h3 class="stat-number">{{ estadisticas.aprobados }}</h3>
            <p class="stat-label">Aprobados</p>
          </div>
        </div>

        <div
          class="stat-card stat-danger"
          @click="filtroEstadoAnuncios = 'rechazados'"
        >
          <div class="stat-icon">
            <i class="bi bi-x-circle-fill"></i>
          </div>
          <div class="stat-content">
            <h3 class="stat-number">{{ estadisticas.rechazados }}</h3>
            <p class="stat-label">Rechazados</p>
          </div>
        </div>

        <div class="stat-card stat-info">
          <div class="stat-icon">
            <i class="bi bi-cash-stack"></i>
          </div>
          <div class="stat-content">
            <h3 class="stat-number">
              ${{ estadisticas.ingresosConfirmados.toLocaleString() }}
            </h3>
            <p class="stat-label">Ingresos COP</p>
          </div>
        </div>
      </div>

      <!-- Filtros de anuncios -->
      <div class="admin-section">
        <div class="filter-bar mb-3">
          <button
            :class="[
              'filter-btn',
              { active: filtroEstadoAnuncios === 'pendientes' },
            ]"
            @click="filtroEstadoAnuncios = 'pendientes'"
          >
            Pendientes ({{ anunciosPendientes.length }})
          </button>
          <button
            :class="[
              'filter-btn',
              { active: filtroEstadoAnuncios === 'aprobados' },
            ]"
            @click="filtroEstadoAnuncios = 'aprobados'"
          >
            Aprobados ({{ anunciosAprobados.length }})
          </button>
          <button
            :class="[
              'filter-btn',
              { active: filtroEstadoAnuncios === 'rechazados' },
            ]"
            @click="filtroEstadoAnuncios = 'rechazados'"
          >
            Rechazados ({{ anunciosRechazados.length }})
          </button>
          <button
            :class="[
              'filter-btn',
              { active: filtroEstadoAnuncios === 'todos' },
            ]"
            @click="filtroEstadoAnuncios = 'todos'"
          >
            Todos
          </button>
        </div>

        <!-- Tabla de anuncios -->
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Título</th>
                <th>Usuario</th>
                <th>Plan</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Días Rest.</th>
                <th>Vistas</th>
                <th>Comprobante</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ad in anunciosPaginados" :key="ad.id">
                <td>
                  <img :src="ad.imagen" class="table-img" alt="Preview" />
                </td>
                <td>
                  <strong>{{ ad.titulo }}</strong>
                </td>
                <td>{{ ad.userName }}</td>
                <td>
                  <span class="badge-table badge-plan-table">{{
                    ad.plan.nombre
                  }}</span>
                </td>
                <td>${{ ad.plan.precio.toLocaleString() }}</td>
                <td>
                  <span
                    :class="[
                      'badge-table',
                      ad.estadoPago === 'pendiente'
                        ? 'badge-warning'
                        : ad.estadoPago === 'aprobado'
                        ? 'badge-success'
                        : 'badge-danger',
                    ]"
                  >
                    {{ ad.estadoPago }}
                  </span>
                </td>
                <td>{{ calcularDiasRestantes(ad.fechaFin) }}d</td>
                <td>{{ ad.impresiones || 0 }}</td>
                <td>
                  <a
                    v-if="ad.comprobantePago"
                    :href="ad.comprobantePago"
                    target="_blank"
                    class="btn-table btn-info"
                  >
                    <i class="bi bi-file-image"></i>
                  </a>
                  <span v-else class="text-muted">-</span>
                </td>
                <td>
                  <div class="action-btns">
                    <button
                      v-if="ad.estadoPago === 'pendiente'"
                      @click="aprobarAnuncio(ad.id)"
                      class="btn-table btn-success"
                      title="Aprobar"
                    >
                      <i class="bi bi-check-lg"></i>
                    </button>
                    <button
                      v-if="ad.estadoPago === 'pendiente'"
                      @click="rechazarAnuncio(ad.id)"
                      class="btn-table btn-warning"
                      title="Rechazar"
                    >
                      <i class="bi bi-x-lg"></i>
                    </button>
                    <button
                      @click="eliminarAnuncioAdmin(ad.id)"
                      class="btn-table btn-danger"
                      title="Eliminar"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación Anuncios -->
        <div v-if="totalPaginasAnuncios > 1" class="pagination-container">
          <button
            class="pagination-btn"
            :disabled="paginaAnuncios === 1"
            @click="cambiarPagina('anuncios', paginaAnuncios - 1)"
          >
            <i class="bi bi-chevron-left"></i>
          </button>

          <div class="pagination-numbers">
            <button
              v-for="pagina in totalPaginasAnuncios"
              :key="pagina"
              :class="[
                'pagination-number',
                { active: paginaAnuncios === pagina },
              ]"
              @click="cambiarPagina('anuncios', pagina)"
            >
              {{ pagina }}
            </button>
          </div>

          <button
            class="pagination-btn"
            :disabled="paginaAnuncios === totalPaginasAnuncios"
            @click="cambiarPagina('anuncios', paginaAnuncios + 1)"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>

        <div class="pagination-info">
          Mostrando {{ (paginaAnuncios - 1) * itemsPorPagina + 1 }} -
          {{
            Math.min(paginaAnuncios * itemsPorPagina, anunciosFiltrados.length)
          }}
          de {{ anunciosFiltrados.length }} anuncios
        </div>
      </div>
    </div>

    <!-- Vista: Hoteles -->
    <div v-else-if="vistaActual === 'hoteles'">
      <div class="admin-section">
        <div class="search-bar mb-3">
          <input
            v-model="busquedaHoteles"
            type="text"
            class="search-input"
            placeholder="Buscar por nombre, dueño o dirección..."
          />
          <i class="bi bi-search search-icon"></i>
        </div>

        <!-- Tabla de hoteles -->
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Nombre</th>
                <th>Dueño</th>
                <th>Calif.</th>
                <th>Visitas</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="hotel in hotelesPaginados" :key="hotel.id">
                <td>
                  <img
                    v-if="hotel.imagenes?.[0]"
                    :src="hotel.imagenes[0]"
                    class="table-img"
                    alt="Hotel"
                  />
                  <div v-else class="table-img-placeholder">
                    <i class="bi bi-image"></i>
                  </div>
                </td>
                <td>
                  <strong>{{ hotel.nombre }}</strong>
                  <br />
                  <small class="text-muted">{{ hotel.direccion }}</small>
                </td>
                <td>{{ hotel.userName }}</td>
                <td>
                  <span class="rating-badge">
                    <i class="bi bi-star-fill"></i>
                    {{ hotel.calificacion || 0 }}
                  </span>
                </td>
                <td>{{ hotel.visitas || 0 }}</td>
                <td>{{ formatearFecha(hotel.createdAt) }}</td>
                <td>
                  <span
                    :class="[
                      'badge-table',
                      hotel.oculto ? 'badge-danger' : 'badge-success',
                    ]"
                  >
                    {{ hotel.oculto ? "Oculto" : "Visible" }}
                  </span>
                </td>
                <td>
                  <div class="action-btns">
                    <router-link
                      :to="`/hotel/${hotel.id}`"
                      class="btn-table btn-info"
                      title="Ver"
                      target="_blank"
                    >
                      <i class="bi bi-eye"></i>
                    </router-link>
                    <button
                      @click="toggleVisibilidadHotel(hotel.id, hotel.oculto)"
                      class="btn-table btn-warning"
                      :title="hotel.oculto ? 'Mostrar' : 'Ocultar'"
                    >
                      <i
                        :class="hotel.oculto ? 'bi bi-eye' : 'bi bi-eye-slash'"
                      ></i>
                    </button>
                    <button
                      @click="eliminarHotelAdmin(hotel.id)"
                      class="btn-table btn-danger"
                      title="Eliminar"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación Hoteles -->
        <div v-if="totalPaginasHoteles > 1" class="pagination-container">
          <button
            class="pagination-btn"
            :disabled="paginaHoteles === 1"
            @click="cambiarPagina('hoteles', paginaHoteles - 1)"
          >
            <i class="bi bi-chevron-left"></i>
          </button>

          <div class="pagination-numbers">
            <button
              v-for="pagina in totalPaginasHoteles"
              :key="pagina"
              :class="[
                'pagination-number',
                { active: paginaHoteles === pagina },
              ]"
              @click="cambiarPagina('hoteles', pagina)"
            >
              {{ pagina }}
            </button>
          </div>

          <button
            class="pagination-btn"
            :disabled="paginaHoteles === totalPaginasHoteles"
            @click="cambiarPagina('hoteles', paginaHoteles + 1)"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>

        <div class="pagination-info">
          Mostrando {{ (paginaHoteles - 1) * itemsPorPagina + 1 }} -
          {{
            Math.min(paginaHoteles * itemsPorPagina, hotelesFiltrados.length)
          }}
          de {{ hotelesFiltrados.length }} hoteles
        </div>
      </div>
    </div>

    <!-- Vista: Artículos -->
    <div v-else-if="vistaActual === 'articulos'">
      <div class="admin-section">
        <div class="search-bar mb-3">
          <input
            v-model="busquedaArticulos"
            type="text"
            class="search-input"
            placeholder="Buscar por título o autor..."
          />
          <i class="bi bi-search search-icon"></i>
        </div>

        <!-- Tabla de artículos -->
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Título</th>
                <th>Autor</th>
                <th>Categoría</th>
                <th>Vistas</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="articulo in articulosPaginados" :key="articulo.id">
                <td>
                  <img
                    v-if="articulo.imagenDestacada"
                    :src="articulo.imagenDestacada"
                    class="table-img"
                    alt="Artículo"
                  />
                  <div v-else class="table-img-placeholder">
                    <i class="bi bi-image"></i>
                  </div>
                </td>
                <td>
                  <strong>{{ articulo.titulo }}</strong>
                </td>
                <td>{{ articulo.autor }}</td>
                <td>
                  <span class="badge-table badge-plan-table">{{
                    articulo.categoria
                  }}</span>
                </td>
                <td>{{ articulo.vistas || 0 }}</td>
                <td>{{ formatearFecha(articulo.createdAt) }}</td>
                <td>
                  <span
                    :class="[
                      'badge-table',
                      articulo.oculto ? 'badge-danger' : 'badge-success',
                    ]"
                  >
                    {{ articulo.oculto ? "Oculto" : "Visible" }}
                  </span>
                </td>
                <td>
                  <div class="action-btns">
                    <router-link
                      :to="`/magazine/${articulo.id}`"
                      class="btn-table btn-info"
                      title="Ver"
                      target="_blank"
                    >
                      <i class="bi bi-eye"></i>
                    </router-link>
                    <button
                      @click="
                        toggleVisibilidadArticulo(articulo.id, articulo.oculto)
                      "
                      class="btn-table btn-warning"
                      :title="articulo.oculto ? 'Mostrar' : 'Ocultar'"
                    >
                      <i
                        :class="
                          articulo.oculto ? 'bi bi-eye' : 'bi bi-eye-slash'
                        "
                      ></i>
                    </button>
                    <button
                      @click="eliminarArticuloAdmin(articulo.id)"
                      class="btn-table btn-danger"
                      title="Eliminar"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación Artículos -->
        <div v-if="totalPaginasArticulos > 1" class="pagination-container">
          <button
            class="pagination-btn"
            :disabled="paginaArticulos === 1"
            @click="cambiarPagina('articulos', paginaArticulos - 1)"
          >
            <i class="bi bi-chevron-left"></i>
          </button>

          <div class="pagination-numbers">
            <button
              v-for="pagina in totalPaginasArticulos"
              :key="pagina"
              :class="[
                'pagination-number',
                { active: paginaArticulos === pagina },
              ]"
              @click="cambiarPagina('articulos', pagina)"
            >
              {{ pagina }}
            </button>
          </div>

          <button
            class="pagination-btn"
            :disabled="paginaArticulos === totalPaginasArticulos"
            @click="cambiarPagina('articulos', paginaArticulos + 1)"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>

        <div class="pagination-info">
          Mostrando {{ (paginaArticulos - 1) * itemsPorPagina + 1 }} -
          {{
            Math.min(
              paginaArticulos * itemsPorPagina,
              articulosFiltrados.length
            )
          }}
          de {{ articulosFiltrados.length }} artículos
        </div>
      </div>
    </div>

    <!-- Vista: Estadísticas -->
    <div v-else-if="vistaActual === 'estadisticas'">
      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-icon">
            <i class="bi bi-building-fill"></i>
          </div>
          <div class="stat-content">
            <h3 class="stat-number">{{ todosHoteles.length }}</h3>
            <p class="stat-label">Hoteles Totales</p>
          </div>
        </div>

        <div class="stat-card stat-success">
          <div class="stat-icon">
            <i class="bi bi-journal-text"></i>
          </div>
          <div class="stat-content">
            <h3 class="stat-number">{{ todosArticulos.length }}</h3>
            <p class="stat-label">Artículos Publicados</p>
          </div>
        </div>

        <div class="stat-card stat-warning">
          <div class="stat-icon">
            <i class="bi bi-people-fill"></i>
          </div>
          <div class="stat-content">
            <h3 class="stat-number">{{ totalUsuarios }}</h3>
            <p class="stat-label">Usuarios Activos</p>
          </div>
        </div>

        <div class="stat-card stat-info">
          <div class="stat-icon">
            <i class="bi bi-megaphone-fill"></i>
          </div>
          <div class="stat-content">
            <h3 class="stat-number">{{ estadisticas.totalAnuncios }}</h3>
            <p class="stat-label">Total Anuncios</p>
          </div>
        </div>
      </div>

      <!-- Resumen Financiero -->
      <div class="admin-section mt-4">
        <h3 class="section-title">
          <i class="bi bi-cash-stack me-2"></i>
          Resumen Financiero
        </h3>

        <div class="financial-grid">
          <div class="financial-card">
            <div class="financial-label">Ingresos Confirmados</div>
            <div class="financial-amount confirmed">
              ${{ estadisticas.ingresosConfirmados.toLocaleString() }} COP
            </div>
          </div>

          <div class="financial-card">
            <div class="financial-label">Ingresos Potenciales</div>
            <div class="financial-amount pending">
              ${{ estadisticas.ingresosPotenciales.toLocaleString() }} COP
            </div>
          </div>

          <div class="financial-card">
            <div class="financial-label">Total Proyectado</div>
            <div class="financial-amount total">
              ${{
                (
                  estadisticas.ingresosConfirmados +
                  estadisticas.ingresosPotenciales
                ).toLocaleString()
              }}
              COP
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vista: Configuración -->
    <div v-else-if="vistaActual === 'configuracion'">
      <div class="admin-section">
        <h3 class="section-title">
          <i class="bi bi-gear-fill me-2"></i>
          Configuración del Sistema
        </h3>

        <form @submit.prevent="guardarConfiguracion">
          <!-- Número Nequi -->
          <div class="config-card mb-4">
            <h5 class="config-card-title">
              <i class="bi bi-wallet2 me-2"></i>
              Información de Pago - Nequi
            </h5>
            <div class="mb-3">
              <label class="form-label">Número de Nequi</label>
              <input
                v-model="configuracion.numeroNequi"
                type="tel"
                class="form-control form-control-lg"
                placeholder="3001234567"
                required
              />
              <small class="text-muted">
                Este número se mostrará a los usuarios para realizar pagos de
                anuncios
              </small>
            </div>
          </div>

          <!-- Planes de Publicidad -->
          <div class="config-card mb-4">
            <h5 class="config-card-title">
              <i class="bi bi-tag-fill me-2"></i>
              Planes de Publicidad
            </h5>

            <!-- Plan Básico -->
            <div class="plan-config mb-4">
              <h6 class="plan-config-name">Plan Básico</h6>
              <div class="row">
                <div class="col-md-4 mb-3">
                  <label class="form-label">Precio (COP)</label>
                  <input
                    :value="configuracion.planesPublicidad.basico.precio"
                    @input="
                      configuracion.planesPublicidad.basico.precio = formatCOP(
                        $event.target.value
                      )
                    "
                    type="text"
                    class="form-control"
                    inputmode="numeric"
                    min="0"
                  />
                </div>
                <div class="col-md-4 mb-3">
                  <label class="form-label">Duración (días)</label>
                  <input
                    v-model.number="
                      configuracion.planesPublicidad.basico.duracion
                    "
                    type="number"
                    class="form-control"
                    min="1"
                  />
                </div>
                <div class="col-md-4 mb-3">
                  <label class="form-label">Descripción</label>
                  <input
                    v-model="configuracion.planesPublicidad.basico.descripcion"
                    type="text"
                    class="form-control"
                  />
                </div>
              </div>
            </div>

            <!-- Plan Premium -->
            <div class="plan-config mb-4">
              <h6 class="plan-config-name">Plan Premium</h6>
              <div class="row">
                <div class="col-md-4 mb-3">
                  <label class="form-label">Precio (COP)</label>
                  <input
                    :value="configuracion.planesPublicidad.premium.precio"
                    @input="
                      configuracion.planesPublicidad.premium.precio = formatCOP(
                        $event.target.value
                      )
                    "
                    type="text"
                    class="form-control"
                    inputmode="numeric"
                    min="0"
                  />
                </div>
                <div class="col-md-4 mb-3">
                  <label class="form-label">Duración (días)</label>
                  <input
                    v-model.number="
                      configuracion.planesPublicidad.premium.duracion
                    "
                    type="number"
                    class="form-control"
                    min="1"
                  />
                </div>
                <div class="col-md-4 mb-3">
                  <label class="form-label">Descripción</label>
                  <input
                    v-model="configuracion.planesPublicidad.premium.descripcion"
                    type="text"
                    class="form-control"
                  />
                </div>
              </div>
            </div>

            <!-- Plan Destacado -->
            <div class="plan-config mb-4">
              <h6 class="plan-config-name">Plan Destacado</h6>
              <div class="row">
                <div class="col-md-4 mb-3">
                  <label class="form-label">Precio (COP)</label>
                  <input
                    :value="configuracion.planesPublicidad.destacado.precio"
                    @input="
                      configuracion.planesPublicidad.destacado.precio =
                        formatCOP($event.target.value)
                    "
                    type="text"
                    class="form-control"
                    inputmode="numeric"
                    min="0"
                  />
                </div>
                <div class="col-md-4 mb-3">
                  <label class="form-label">Duración (días)</label>
                  <input
                    v-model.number="
                      configuracion.planesPublicidad.destacado.duracion
                    "
                    type="number"
                    class="form-control"
                    min="1"
                  />
                </div>
                <div class="col-md-4 mb-3">
                  <label class="form-label">Descripción</label>
                  <input
                    v-model="
                      configuracion.planesPublicidad.destacado.descripcion
                    "
                    type="text"
                    class="form-control"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Botón Guardar -->
          <div class="text-end">
            <button type="submit" class="btn-save-config">
              <i class="bi bi-check-circle me-2"></i>
              Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Rechazar Anuncio -->
    <Teleport to="body">
      <div
        v-if="modalRechazarOpen"
        class="modal fade show d-block"
        tabindex="-1"
        style="background-color: rgba(0, 0, 0, 0.5)"
        @click.self="cancelarRechazo"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-x-circle-fill me-2 text-danger"></i>
                Rechazar Anuncio
              </h5>
              <button
                type="button"
                class="btn-close"
                @click="cancelarRechazo"
              ></button>
            </div>
            <div class="modal-body">
              <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Importante:</strong> El motivo será enviado al
                anunciante.
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Motivo del rechazo <span class="text-danger">*</span>
                </label>
                <textarea
                  v-model="motivoRechazo"
                  class="form-control"
                  rows="4"
                  placeholder="Ej: El comprobante de pago no es legible, por favor envía una imagen más clara..."
                  required
                ></textarea>
                <small class="text-muted">
                  Sé claro y específico para que el usuario pueda corregir el
                  problema.
                </small>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                @click="cancelarRechazo"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="btn btn-danger"
                @click="confirmarRechazo"
              >
                <i class="bi bi-x-lg me-2"></i>
                Rechazar Anuncio
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@import "../components/styles/AdminPanel.css";
</style>
