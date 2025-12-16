import { ref } from "vue";

const confirmState = ref({
  show: false,
  title: "",
  message: "",
  confirmText: "Confirmar",
  cancelText: "Cancelar",
  type: "warning",
  onConfirm: null,
  onCancel: null,
});

export const useConfirm = () => {
  const showConfirm = (options) => {
    return new Promise((resolve) => {
      confirmState.value = {
        show: true,
        title: options.title || "Confirmar acción",
        message: options.message || "¿Estás seguro?",
        confirmText: options.confirmText || "Confirmar",
        cancelText: options.cancelText || "Cancelar",
        type: options.type || "warning",
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      };
    });
  };

  const confirm = (message, title = "Confirmar") => {
    return showConfirm({ message, title, type: "warning" });
  };

  const confirmDelete = (
    message = "¿Estás seguro de eliminar este elemento?"
  ) => {
    return showConfirm({
      title: "Confirmar eliminación",
      message,
      confirmText: "Eliminar",
      type: "error",
    });
  };

  const closeConfirm = () => {
    confirmState.value.show = false;
  };

  const handleConfirm = () => {
    if (confirmState.value.onConfirm) {
      confirmState.value.onConfirm();
    }
    closeConfirm();
  };

  const handleCancel = () => {
    if (confirmState.value.onCancel) {
      confirmState.value.onCancel();
    }
    closeConfirm();
  };

  return {
    confirmState,
    showConfirm,
    confirm,
    confirmDelete,
    closeConfirm,
    handleConfirm,
    handleCancel,
  };
};
