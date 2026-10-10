import test from "node:test";
import assert from "node:assert/strict";
import { inviteSchema, roleSchema, settingsSchema, statusSchema } from "../src/validators/adminSchemas.js";

test("invita a cajero con correo normalizado", () => {
  const parsed = inviteSchema.parse({ name: " Ana Pérez ", email: " ANA@EJEMPLO.COM ", role: "cashier" });
  assert.equal(parsed.email, "ana@ejemplo.com");
  assert.equal(parsed.name, "Ana Pérez");
});
test("no se puede invitar un administrador", () => {
  assert.equal(inviteSchema.safeParse({ name: "Admin Extra", email: "a@example.com", role: "admin" }).success, false);
});
test("no se permite cambio de rol a admin", () => {
  assert.equal(roleSchema.safeParse({ role: "admin" }).success, false);
});
test("solo activo es booleano", () => {
  assert.equal(statusSchema.safeParse({ active: "false" }).success, false);
  assert.equal(statusSchema.safeParse({ active: false }).success, true);
});
test("el negocio no acepta edición directa de currency ni active", () => {
  const base = { name: "Mi negocio", phone: "", address: "", taxId: "", receiptFooter: "" };
  assert.equal(settingsSchema.safeParse({ ...base, currency: "USD" }).success, false);
  assert.equal(settingsSchema.safeParse({ ...base, active: false }).success, false);
});
test("RUC tiene once dígitos o está vacío", () => {
  const base = { name: "Mi negocio", phone: "", address: "", receiptFooter: "" };
  assert.equal(settingsSchema.safeParse({ ...base, taxId: "12345678901" }).success, true);
  assert.equal(settingsSchema.safeParse({ ...base, taxId: "12345" }).success, false);
});
