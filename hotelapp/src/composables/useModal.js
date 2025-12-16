import { ref } from "vue";

export const useModal = () => {
  const isOpen = ref(false);

  const openModal = () => {
    isOpen.value = true;
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    isOpen.value = false;
    document.body.style.overflow = "";
  };

  return {
    isOpen,
    openModal,
    closeModal,
  };
};
