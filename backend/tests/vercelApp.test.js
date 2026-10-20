import test, { after } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { once } from "node:events";

// Clave efímera generada solo para estas pruebas. No se consulta Firebase ni datos reales.
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
process.env.VERCEL = "1";
process.env.NODE_ENV = "production";
process.env.FIREBASE_PROJECT_ID = "demo-ayvar-pos";
process.env.FRONTEND_URL = "https://ayvar-pos.vercel.app";
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: "backend@demo-ayvar-pos.iam.gserviceaccount.com",
  private_key: privateKey,
});

const { default: app } = await import("../src/server.js");
const { adminAuth, db } = await import("../src/config/firebaseAdmin.js");
const server = app.listen(0, "127.0.0.1");
after(() => new Promise(resolve => server.close(resolve)));
await once(server, "listening");
const baseURL = `http://127.0.0.1:${server.address().port}`;

test("Express exportado para Vercel responde la salud en /api/health", async () => {
  const response = await fetch(`${baseURL}/api/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  assert.equal(response.headers.get("access-control-allow-origin"), process.env.FRONTEND_URL);
});

test("salud anuncia la protección necesaria para activar las cuentas públicas", async () => {
  const response = await fetch(`${baseURL}/api/health`);
  assert.equal((await response.json()).capabilities.publicDemo, 1);
});

for (const path of ["/api/me", "/api/products", "/api/customers", "/api/team", "/api/reports/summary"]) {
  test(`Vercel conserva la protección de ${path}`, async () => {
    const response = await fetch(`${baseURL}${path}`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, "Debes iniciar sesión.");
  });
}

test("una API inexistente devuelve 404, no la página de React", async () => {
  const response = await fetch(`${baseURL}/api/no-existe`);
  assert.equal(response.status, 404);
});

test("un token inválido sigue sin permitir el acceso a la API", async () => {
  const response = await fetch(`${baseURL}/api/me`, {
    headers: { Authorization: "Bearer token-invalido-de-prueba" },
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "Tu sesión no es válida o ha expirado.");
});

test("los routers reales impiden operaciones sensibles incluso al administrador demo", async t => {
  t.mock.method(adminAuth, "verifyIdToken", async () => ({ uid: "public-demo-fixture", email: "admin@ayvar-demo.test" }));
  t.mock.method(adminAuth, "createUser", async () => { throw new Error("La demo nunca debe crear cuentas desde la API."); });
  t.mock.method(db, "runTransaction", async () => { throw new Error("No debe escribir configuración."); });
  t.mock.method(db, "collection", name => ({ doc: id => ({ get: async () => ({
    exists: true, id,
    data: () => name === "users"
      ? { active: true, name: "Demo", role: "admin", businessId: "business-demo-fixture", publicDemo: false }
      : { active: true, name: "Demo pública", currency: "PEN", publicDemo: true },
  }) }) }));

  const headers = { Authorization: "Bearer fixture-demo", "Content-Type": "application/json" };
  for (const [method, path] of [["POST", "/api/team/invite"], ["POST", "/api/team/public-demo-other/resend"],
    ["PATCH", "/api/team/public-demo-other/role"], ["PATCH", "/api/team/public-demo-other/status"], ["PUT", "/api/settings"]]) {
    const response = await fetch(`${baseURL}${path}`, { method, headers, body: JSON.stringify({ publicDemo: false }) });
    assert.equal(response.status, 403, path);
    assert.equal((await response.json()).code, "PUBLIC_DEMO_READ_ONLY", path);
  }
  const me = await fetch(`${baseURL}/api/me`, { headers });
  const session = await me.json();
  assert.equal(me.status, 200);
  assert.equal(session.user.publicDemo, true);
  assert.equal(session.business.id, "business-demo-fixture");
});
