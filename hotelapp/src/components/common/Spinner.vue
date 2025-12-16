<script setup>
const props = defineProps({
  size: {
    type: String,
    default: "md", // sm, md, lg, xl
    validator: (value) => ["sm", "md", "lg", "xl"].includes(value),
  },
  message: {
    type: String,
    default: "Cargando...",
  },
  fullscreen: {
    type: Boolean,
    default: false,
  },
});

const getSizeClass = () => {
  const sizes = {
    sm: "spinner-sm",
    md: "spinner-md",
    lg: "spinner-lg",
    xl: "spinner-xl",
  };
  return sizes[props.size];
};
</script>

<template>
  <div :class="['spinner-container', { 'spinner-fullscreen': fullscreen }]">
    <div class="spinner-content">
      <div :class="['custom-spinner', getSizeClass()]">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-logo">
          <i class="bi bi-building-fill"></i>
        </div>
      </div>
      <p v-if="message" class="spinner-message">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.spinner-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  min-height: calc(100vh - 200px);
}

.spinner-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  z-index: 9999;
  padding: 0;
  min-height: 100vh;
}

.spinner-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.custom-spinner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-ring {
  position: absolute;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: #667eea;
  animation: spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
}

.spinner-ring:nth-child(1) {
  border-top-color: #667eea;
  animation-delay: 0s;
}

.spinner-ring:nth-child(2) {
  border-top-color: #764ba2;
  animation-delay: 0.3s;
}

.spinner-ring:nth-child(3) {
  border-top-color: #11998e;
  animation-delay: 0.6s;
}

.spinner-logo {
  position: relative;
  z-index: 1;
  color: #667eea;
  animation: pulse-logo 2s ease-in-out infinite;
}

/* Tamaños */
.spinner-sm .spinner-ring {
  width: 40px;
  height: 40px;
}

.spinner-sm .spinner-logo i {
  font-size: 1.25rem;
}

.spinner-md .spinner-ring {
  width: 60px;
  height: 60px;
}

.spinner-md .spinner-logo i {
  font-size: 1.75rem;
}

.spinner-lg .spinner-ring {
  width: 80px;
  height: 80px;
}

.spinner-lg .spinner-logo i {
  font-size: 2.25rem;
}

.spinner-xl .spinner-ring {
  width: 120px;
  height: 120px;
}

.spinner-xl .spinner-logo i {
  font-size: 3rem;
}

.spinner-message {
  color: #667eea;
  font-weight: 600;
  font-size: 1rem;
  margin: 0;
  animation: fade 2s ease-in-out infinite;
}

/* Animaciones */
@keyframes spin {
  0% {
    transform: rotate(0deg);
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    transform: rotate(360deg);
    opacity: 1;
  }
}

@keyframes pulse-logo {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes fade {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
