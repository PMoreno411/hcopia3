import { createRouter, createWebHistory } from "vue-router";
import Inicio from "../components/Inicio.vue";
import Magazine from "../components/Magazine.vue";
import DetalleArticulo from "../components/DetalleArticulo.vue";
import AdminPanel from "../components/AdminPanel.vue";

const routes = [
  {
    path: "/",
    name: "Inicio",
    component: Inicio,
  },
  {
    path: "/hotel/:id",
    name: "DetalleHotel",
    component: () => import("../components/DetalleHotel.vue"),
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: () => import("../components/Dashboard.vue"),
  },
  {
    path: "/magazine",
    name: "Magazine",
    component: Magazine,
  },
  {
    path: "/magazine/:id",
    name: "DetalleArticulo",
    component: DetalleArticulo,
  },
  {
    path: "/admin",
    name: "AdminPanel",
    component: AdminPanel,
    meta: { requiresAdmin: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
