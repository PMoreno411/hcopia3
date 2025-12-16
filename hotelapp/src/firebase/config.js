import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

// Tu configuración de Firebase
// Ve a Firebase Console > Project Settings > Your apps > Config
const firebaseConfig = {
  apiKey: "AIzaSyAMM32jlQ9Ni87KUnh3HAaUP21l0uS5WyY",
  authDomain: "hotelapp-45f1d.firebaseapp.com",
  projectId: "hotelapp-45f1d",
  storageBucket: "hotelapp-45f1d.firebasestorage.app",
  messagingSenderId: "305341781228",
  appId: "1:305341781228:web:ada2b83663da259f22c1c9",
};

// Configuración de Supabase para imágenes
// Ve a: https://supabase.com/dashboard/project/_/settings/api
const supabaseUrl = "https://pijjdqvvxlnrgkinphez.supabase.co"; // Ej: https://xyzcompany.supabase.co
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpampkcXZ2eGxucmdraW5waGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2OTUxMzIsImV4cCI6MjA4MTI3MTEzMn0.NvacIGvfTM0Nz1g-SOcM378LczScxD9kHxUrejcuO1g"; // Tu clave pública (anon/public)

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Servicios de Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);

// Cliente de Supabase para Storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Lista de emails de administradores
export const ADMIN_EMAILS = [
  "miguel.morenomej@cun.edu.co",
];

export default app;
