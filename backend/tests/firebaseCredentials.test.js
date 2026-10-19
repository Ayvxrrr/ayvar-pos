import test from "node:test";
import assert from "node:assert/strict";
import { serviceAccountFromEnv } from "../src/config/firebaseCredentials.js";

const account = {
  type: "service_account",
  project_id: "demo-ayvar-pos",
  client_email: "backend@demo-ayvar-pos.iam.gserviceaccount.com",
  private_key: "clave-ficticia\\nsegunda-linea",
};
const env = {
  VERCEL: "1",
  FIREBASE_PROJECT_ID: account.project_id,
  FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(account),
};

test("Vercel lee la cuenta privada y normaliza saltos de línea", () => {
  assert.deepEqual(serviceAccountFromEnv(env), {
    projectId: account.project_id,
    clientEmail: account.client_email,
    privateKey: "clave-ficticia\nsegunda-linea",
  });
});

test("local y Cloud Run mantienen su configuración sin JSON en el entorno", () => {
  assert.equal(serviceAccountFromEnv({ NODE_ENV: "development" }), null);
  assert.equal(serviceAccountFromEnv({ NODE_ENV: "production" }), null);
});

test("Vercel falla con un mensaje claro si falta su credencial privada", () => {
  assert.throws(() => serviceAccountFromEnv({ VERCEL: "1" }), /Configura FIREBASE_SERVICE_ACCOUNT_JSON/);
});

test("JSON inválido no aparece en el mensaje de error", () => {
  const secret = "no-es-json-clave-privada-ficticia";
  assert.throws(() => serviceAccountFromEnv({ ...env, FIREBASE_SERVICE_ACCOUNT_JSON: secret }), error => {
    assert.match(error.message, /JSON completo/);
    assert.equal(error.message.includes(secret), false);
    return true;
  });
});

test("rechaza valores y campos de credenciales inválidos", () => {
  for (const invalid of [null, [], "texto", {}, { ...account, type: "authorized_user" },
    { ...account, project_id: "" }, { ...account, client_email: 123 }, { ...account, private_key: " " }]) {
    assert.throws(() => serviceAccountFromEnv({
      ...env, FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(invalid),
    }), /debe incluir/);
  }
});

test("rechaza cuentas de servicio de otro proyecto Firebase", () => {
  assert.throws(() => serviceAccountFromEnv({ ...env, FIREBASE_PROJECT_ID: "otro-proyecto" }), /no corresponde/);
  assert.throws(() => serviceAccountFromEnv({
    FIREBASE_SERVICE_ACCOUNT_JSON: env.FIREBASE_SERVICE_ACCOUNT_JSON,
    GOOGLE_CLOUD_PROJECT: "otro-proyecto",
  }), /no corresponde/);
});
