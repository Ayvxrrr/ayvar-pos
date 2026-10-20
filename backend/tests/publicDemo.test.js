import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { restrictPublicDemoWrites } from "../src/middleware/publicDemo.js";
import { requireRole } from "../src/middleware/requireRole.js";
import { publicDemoAccounts, publicDemoProducts } from "../src/config/publicDemoAccounts.js";

test("la demo contiene un usuario por rol y solo direcciones y productos ficticios", () => {
  assert.deepEqual(publicDemoAccounts.map(account => account.role), ["admin", "cashier", "warehouse"]);
  for (const account of publicDemoAccounts) {
    assert.match(account.email, /@ayvar-demo\.test$/);
    assert.equal("password" in account, false);
  }
  for (const product of publicDemoProducts) {
    assert.match(product.sku, /^DEMO-/);
    assert.ok(Number.isInteger(product.priceCents) && product.priceCents > 0);
    assert.ok(product.stock > 0);
  }
});

function invoke(method, publicDemo, body = {}) {
  let status = 200;
  let nextCalled = false;
  let payload;
  const req = { method, account: { role: "admin", publicDemo }, body };
  const res = { status(value) { status = value; return this; }, json(value) { payload = value; return this; } };
  restrictPublicDemoWrites(req, res, () => { nextCalled = true; });
  return { status, nextCalled, payload };
}

test("el administrador demo puede consultar usuarios y configuración", () => {
  for (const method of ["GET", "HEAD", "OPTIONS"]) assert.equal(invoke(method, true).nextCalled, true);
});

test("la demo no puede invitar, reenviar, modificar roles o bloquear cuentas", () => {
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    const result = invoke(method, true, { publicDemo: false });
    assert.equal(result.status, 403);
    assert.equal(result.nextCalled, false);
    assert.equal(result.payload.code, "PUBLIC_DEMO_READ_ONLY");
  }
});

test("el administrador real conserva sus operaciones sin esta restricción", () => {
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) assert.equal(invoke(method, false).nextCalled, true);
});

test("la restricción se ejecuta antes de cualquier operación sensible del router", async () => {
  const app = express();
  let operations = 0;
  app.use((req, res, next) => { req.account = { role: "admin", publicDemo: true }; next(); });
  app.use("/api/team", requireRole("admin"), restrictPublicDemoWrites);
  app.use("/api/settings", requireRole("admin"), restrictPublicDemoWrites);
  app.use((req, res) => { operations += 1; res.json({ success: true }); });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [method, path] of [["POST", "/api/team/invite"], ["POST", "/api/team/demo-id/resend"],
      ["PATCH", "/api/team/demo-id/role"], ["PATCH", "/api/team/demo-id/status"], ["PUT", "/api/settings"]]) {
      const response = await fetch(`${base}${path}`, { method });
      assert.equal(response.status, 403);
    }
    assert.equal(operations, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
