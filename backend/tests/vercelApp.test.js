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
