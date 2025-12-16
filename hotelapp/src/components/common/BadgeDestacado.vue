<script setup>
const props = defineProps({
  calificacion: {
    type: Number,
    default: 0,
  },
  totalResenas: {
    type: Number,
    default: 0,
  },
});

const esDestacado = () => {
  return props.calificacion >= 4.5 && props.totalResenas >= 3;
};
</script>

<template>
  <div v-if="esDestacado()" class="badge-destacado">
    <i class="bi bi-award-fill"></i>
    <span>Destacado</span>
  </div>
</template>

<style scoped>
.badge-destacado {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #2d3561;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-weight: 700;
  font-size: 0.85rem;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  animation: pulse-badge 2s ease-in-out infinite;
}

.badge-destacado i {
  font-size: 1rem;
}

@keyframes pulse-badge {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6);
  }
}
</style>
