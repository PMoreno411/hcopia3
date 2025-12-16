<script setup>
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="footer-main">
    <div class="container">
      <div class="footer-content">
        <p class="footer-copyright mb-2">
          © {{ currentYear }} Mangelistt - Todos los derechos reservados
        </p>
        <p class="footer-made mb-0">
          Desarrollado por Mangelistt
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-main {
  background: linear-gradient(135deg, #2d3561 0%, #3f2b5c 100%);
  color: #fff;
  padding: 1rem 0;
  margin-top: 4rem;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1), 0 -2px 10px rgba(45, 53, 97, 0.2);
}

.footer-content {
  text-align: center;
  padding: 0.5rem 0;
}

.footer-copyright {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  font-weight: 500;
}

.footer-made {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
}

.footer-made i {
  animation: heartbeat 1.5s ease-in-out infinite;
  color: #ff6b6b;
}

@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  10%,
  30% {
    transform: scale(1.1);
  }
  20%,
  40% {
    transform: scale(1);
  }
}

@media (max-width: 768px) {
  .footer-main {
    padding: 1.5rem 0;
    margin-top: 3rem;
  }

  .footer-copyright,
  .footer-made {
    font-size: 0.8rem;
  }
}
</style>
