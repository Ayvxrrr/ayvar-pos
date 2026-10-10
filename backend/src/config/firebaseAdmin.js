
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const currentDir = path.dirname(
  fileURLToPath(import.meta.url)
);

const credentialsPath = path.resolve(
  currentDir,
  "../../secrets/firebase-service-account.json"
);

const serviceAccount = JSON.parse(
  readFileSync(credentialsPath, "utf8")
);

const app = initializeApp({
  credential: cert(serviceAccount),
});

export const adminAuth = getAuth(app);
export const db = getFirestore(app);
