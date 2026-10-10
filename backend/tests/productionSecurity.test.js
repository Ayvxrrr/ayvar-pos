import test from "node:test";
import assert from "node:assert/strict";
import { validateProductionConfig, corsSettings } from "../src/config/productionSecurity.js";

test("producción exige HTTPS y projectId", () => {
  assert.throws(() => validateProductionConfig({ NODE_ENV: "production", FRONTEND_URL: "http://evil.test", FIREBASE_PROJECT_ID: "ayvar-pos" }), /HTTPS/);
  assert.throws(() => validateProductionConfig({ NODE_ENV: "production", FRONTEND_URL: "https://ayvar-pos.web.app" }), /PROJECT_ID/);
  assert.equal(validateProductionConfig({ NODE_ENV: "production", FRONTEND_URL: "https://ayvar-pos.web.app", FIREBASE_PROJECT_ID: "ayvar-pos" }), true);
});

test("desarrollo permite la URL local y CORS permite solo el origen configurado", () => {
  assert.equal(validateProductionConfig({ NODE_ENV: "development" }), true);
  assert.equal(corsSettings({ FRONTEND_URL: "https://ayvar-pos.web.app" }).origin, "https://ayvar-pos.web.app");
  assert.equal(corsSettings({}).origin, "http://localhost:5173");
});
