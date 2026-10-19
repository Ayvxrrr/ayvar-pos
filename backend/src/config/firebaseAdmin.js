/**
 * Administración Firebase para desarrollo local, Vercel y Cloud Run.
 * Vercel usa una variable privada; Cloud Run conserva su identidad administrada (ADC).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applicationDefault, cert, initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { serviceAccountFromEnv } from "./firebaseCredentials.js";

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "ayvar-pos";

function credentials() {
  const serviceAccount = serviceAccountFromEnv();
  if (serviceAccount) return cert(serviceAccount);
  if (process.env.NODE_ENV === "production") {
    return applicationDefault();
  }
  // Conserva el JSON únicamente en tu máquina local.
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const jsonPath = path.resolve(directory, "../../secrets/firebase-service-account.json");
  return cert(JSON.parse(readFileSync(jsonPath, "utf8")));
}

const firebaseApp = getApps()[0] || initializeApp({ credential: credentials(), projectId });
export const db = getFirestore(firebaseApp);
export const adminAuth = getAuth(firebaseApp);
