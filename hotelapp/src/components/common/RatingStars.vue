<script setup>
const props = defineProps({
  rating: {
    type: Number,
    default: 0,
  },
  totalResenas: {
    type: Number,
    default: 0,
  },
  size: {
    type: String,
    default: "md", // sm, md, lg
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
});

const getSizeClass = () => {
  const sizes = {
    sm: "rating-sm",
    md: "rating-md",
    lg: "rating-lg",
  };
  return sizes[props.size];
};
</script>

<template>
  <div :class="['rating-stars', getSizeClass()]">
    <div class="stars">
      <i
        v-for="i in 5"
        :key="i"
        class="bi"
        :class="i <= Math.round(rating) ? 'bi-star-fill' : 'bi-star'"
      ></i>
    </div>
    <span v-if="totalResenas > 0" class="rating-text">
      {{ rating.toFixed(1) }} ({{ totalResenas }})
    </span>
    <span v-else class="rating-text-empty">Sin reseñas</span>
  </div>
</template>

<style scoped>
.rating-stars {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stars {
  display: flex;
  gap: 0.15rem;
  color: #ffc107;
}

.stars i.bi-star {
  color: #ddd;
}

.rating-text {
  color: #666;
  font-weight: 600;
  font-size: 0.9rem;
}

.rating-text-empty {
  color: #999;
  font-size: 0.85rem;
  font-style: italic;
}

/* Tamaños */
.rating-sm .stars i {
  font-size: 0.85rem;
}

.rating-sm .rating-text {
  font-size: 0.8rem;
}

.rating-md .stars i {
  font-size: 1rem;
}

.rating-lg .stars i {
  font-size: 1.25rem;
}

.rating-lg .rating-text {
  font-size: 1rem;
}
</style>
