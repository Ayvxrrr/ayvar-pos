/** Validación sencilla para que el servidor no arranque con una URL insegura. */
export function validateProductionConfig(env = process.env) {
  if (env.NODE_ENV !== "production") return true;
  const url = env.FRONTEND_URL;
  if (!url || !/^https:\/\/[^\s/?#]+\/?$/.test(url)) {
    throw new Error("FRONTEND_URL debe ser una URL HTTPS pública en producción.");
  }
  if (!env.FIREBASE_PROJECT_ID) {
    throw new Error("Configura FIREBASE_PROJECT_ID para evitar usar otro proyecto por accidente.");
  }
  return true;
}

/** CORS no reemplaza Firebase Auth; solo limita accesos cruzados desde navegador. */
export function corsSettings(env = process.env) {
  const allowed = env.FRONTEND_URL || "http://localhost:5173";
  return { origin: allowed, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], maxAge: 600 };
}
