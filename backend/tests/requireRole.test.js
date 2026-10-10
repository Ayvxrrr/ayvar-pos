import test from "node:test";
import assert from "node:assert/strict";
import { requireRole } from "../src/middleware/requireRole.js";

function invoke(middleware, account) {
  let httpCode = 200;
  let payload = null;
  let nextCalled = false;
  const req = { account };
  const res = { status(n) { httpCode = n; return this; }, json(value) { payload = value; return this; } };
  middleware(req, res, () => { nextCalled = true; });
  return { httpCode, payload, nextCalled };
}

test("solicitud sin perfil recibe 401", () => {
  const result = invoke(requireRole("admin"), undefined);
  assert.equal(result.httpCode, 401);
  assert.equal(result.nextCalled, false);
});

test("el cajero no puede consultar rutas administrativas", () => {
  const result = invoke(requireRole("admin"), { role: "cashier" });
  assert.equal(result.httpCode, 403);
  assert.equal(result.nextCalled, false);
});

test("administrador autorizado avanza al siguiente middleware", () => {
  const result = invoke(requireRole("admin"), { role: "admin" });
  assert.equal(result.nextCalled, true);
});
