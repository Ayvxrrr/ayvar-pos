import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
const frontendConfig = JSON.parse(readFileSync(new URL("../../frontend/vercel.json", import.meta.url), "utf8"));

test("Vercel publica Express y Vite desde sus carpetas", () => {
  assert.equal(config.services.backend.root, "backend");
  assert.equal(config.services.backend.framework, "express");
  assert.equal(config.services.frontend.root, "frontend");
  assert.equal(config.services.frontend.framework, "vite");
  assert.equal(config.services.frontend.outputDirectory, "dist");
  for (const service of Object.values(config.services)) {
    assert.equal(existsSync(new URL(`../../${service.root}/package.json`, import.meta.url)), true);
  }
});

test("el frontend instala herramientas de compilación incluso con NODE_ENV=production", () => {
  assert.equal(config.services.frontend.installCommand, "npm ci --include=dev");
});

test("la API se dirige primero a Express y el resto a React en el mismo dominio", () => {
  assert.deepEqual(config.rewrites, [
    { source: "/api/:path*", destination: { service: "backend" } },
    { source: "/(.*)", destination: { service: "frontend" } },
  ]);
});

test("el servicio frontend conserva las rutas SPA sin ocultar errores de la API", () => {
  assert.deepEqual(config.services.frontend.rewrites, frontendConfig.rewrites);
  const rule = config.services.frontend.rewrites[0];
  const pattern = new RegExp("^" + rule.source.replace("/:path(", "/(") + "$");
  for (const path of ["/", "/login", "/productos", "/reportes"]) assert.equal(pattern.test(path), true);
  for (const path of ["/api", "/api/health", "/api/me"]) assert.equal(pattern.test(path), false);
  assert.equal(rule.destination, "/index.html");
});
