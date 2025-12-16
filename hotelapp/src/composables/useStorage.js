import { ref } from "vue";
import { supabase } from "../firebase/config";

export const useStorage = () => {
  const error = ref(null);
  const isPending = ref(false);
  const uploadProgress = ref(0);

  const BUCKET_NAME = "hotel-images";

  // Subir archivo a Supabase
  const uploadFile = async (file, path) => {
    error.value = null;
    isPending.value = true;

    try {
      // Validar archivo
      if (!file || !file.name) {
        throw new Error("Archivo inválido");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      console.log("📤 Subiendo archivo:", filePath);

      // Subir archivo a Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Error al subir:", uploadError);
        throw uploadError;
      }

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      console.log("✅ Archivo subido exitosamente:", publicUrlData.publicUrl);

      return {
        url: publicUrlData.publicUrl,
        path: filePath,
      };
    } catch (err) {
      console.error("❌ Error al subir archivo:", err);
      error.value = err.message || "Error al subir el archivo";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Subir múltiples archivos
  const uploadMultipleFiles = async (files, path) => {
    error.value = null;
    isPending.value = true;

    try {
      if (!files || files.length === 0) {
        throw new Error("No hay archivos para subir");
      }

      console.log(`📤 Subiendo ${files.length} archivos...`);

      const uploadPromises = Array.from(files).map((file) =>
        uploadFile(file, path)
      );
      const results = await Promise.all(uploadPromises);

      console.log(`✅ ${results.length} archivos subidos exitosamente`);

      return results;
    } catch (err) {
      console.error("❌ Error al subir archivos:", err);
      error.value = err.message || "Error al subir los archivos";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Eliminar archivo de Supabase
  const deleteFile = async (filePath) => {
    error.value = null;
    isPending.value = true;

    try {
      console.log("🗑️ Eliminando archivo:", filePath);

      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (deleteError) {
        console.error("❌ Error al eliminar:", deleteError);
        throw deleteError;
      }

      console.log("✅ Archivo eliminado exitosamente");
    } catch (err) {
      console.error("❌ Error al eliminar archivo:", err);
      error.value = err.message || "Error al eliminar el archivo";
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  // Eliminar múltiples archivos
  const deleteMultipleFiles = async (filePaths) => {
    error.value = null;
    isPending.value = true;

    try {
      if (!filePaths || filePaths.length === 0) {
        return;
      }

      console.log(`🗑️ Eliminando ${filePaths.length} archivos...`);

      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filePaths);

      if (deleteError) {
        console.error("❌ Error al eliminar archivos:", deleteError);
        throw deleteError;
      }

      console.log("✅ Archivos eliminados exitosamente");
    } catch (err) {
      console.error("❌ Error al eliminar archivos:", err);
      error.value = err.message || "Error al eliminar los archivos";
    } finally {
      isPending.value = false;
    }
  };

  // Función helper para extraer ruta de URL de Supabase
  const extractPathFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const bucketIndex = pathParts.indexOf("public") + 1;
      return pathParts.slice(bucketIndex + 1).join("/");
    } catch (err) {
      console.error("Error al extraer ruta de URL:", err);
      return null;
    }
  };

  return {
    error,
    isPending,
    uploadProgress,
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    deleteMultipleFiles,
    extractPathFromUrl,
  };
};
