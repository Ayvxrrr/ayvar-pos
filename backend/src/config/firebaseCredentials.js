/** Lee la cuenta de servicio desde una variable privada, sin revelar secretos en errores. */
export function serviceAccountFromEnv(env = process.env) {
  const value = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!value) {
    if (env.VERCEL === "1") {
      throw new Error("Configura FIREBASE_SERVICE_ACCOUNT_JSON como variable privada en Vercel.");
    }
    return null;
  }

  let account;
  try {
    account = JSON.parse(value);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON debe contener el JSON completo de una cuenta de servicio.");
  }

  const fields = ["project_id", "client_email", "private_key"];
  if (!account || account.type !== "service_account" ||
      !fields.every(field => typeof account[field] === "string" && account[field].trim())) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON debe incluir type=service_account, project_id, client_email y private_key.");
  }

  const projectId = env.FIREBASE_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT;
  if (projectId && account.project_id !== projectId) {
    throw new Error("La cuenta de FIREBASE_SERVICE_ACCOUNT_JSON no corresponde a FIREBASE_PROJECT_ID.");
  }

  return {
    projectId: account.project_id,
    clientEmail: account.client_email,
    privateKey: account.private_key.replace(/\\n/g, "\n"),
  };
}
