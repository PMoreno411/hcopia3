import { ref } from "vue";

const toastState = ref({
  show: false,
  message: "",
  type: "info",
  duration: 3000,
});

export const useToast = () => {
  const showToast = (message, type = "info", duration = 3000) => {
    toastState.value = {
      show: true,
      message,
      type,
      duration,
    };
  };

  const success = (message, duration = 3000) => {
    showToast(message, "success", duration);
  };

  const error = (message, duration = 4000) => {
    showToast(message, "error", duration);
  };

  const warning = (message, duration = 3500) => {
    showToast(message, "warning", duration);
  };

  const info = (message, duration = 3000) => {
    showToast(message, "info", duration);
  };

  const closeToast = () => {
    toastState.value.show = false;
  };

  return {
    toastState,
    showToast,
    success,
    error,
    warning,
    info,
    closeToast,
  };
};
