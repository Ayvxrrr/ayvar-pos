import test from "node:test";
import assert from "node:assert/strict";

/**
 * Ejecutar tras iniciar backend o desplegar:
 * Windows CMD: set BASE_URL=http://localhost:4000 && node --test tests/smoke.test.js
 * No modifica datos ni requiere credenciales de usuario.
 */
const baseURL = process.env.BASE_URL?.replace(/\/$/, "");
const opts = { skip: !baseURL && "Define BASE_URL para pruebas de humo." };

test("API responde salud pública", opts, async () => {
  const response = await fetch(`${baseURL}/api/health`, { signal: AbortSignal.timeout(12000) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
});

for (const path of ["/api/me", "/api/products", "/api/customers", "/api/team", "/api/reports/summary?from=2026-10-01&to=2026-10-02"]) {
  test(`sin credenciales ${path} devuelve 401`, opts, async () => {
    const response = await fetch(`${baseURL}${path}`, { signal: AbortSignal.timeout(12000) });
    assert.equal(response.status, 401);
  });
}
