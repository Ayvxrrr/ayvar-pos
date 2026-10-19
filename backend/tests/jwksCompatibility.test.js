import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { generateKeyPairSync, sign, verify } from "node:crypto";

const require = createRequire(import.meta.url);
const jwksRsa = require("jwks-rsa");
const { retrieveSigningKeys } = require("jwks-rsa/src/utils.js");

test("jwks-rsa carga jose y conserva la verificación de firmas RSA", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const keys = await retrieveSigningKeys([{
    ...publicKey.export({ format: "jwk" }),
    kid: "clave-efimera-de-prueba",
    use: "sig",
    alg: "RS256",
  }]);

  assert.equal(keys.length, 1);
  assert.equal(keys[0].kid, "clave-efimera-de-prueba");
  const message = Buffer.from("mensaje de prueba sin datos reales");
  const signature = sign("RSA-SHA256", message, privateKey);
  const pem = keys[0].getPublicKey();
  assert.equal(verify("RSA-SHA256", message, pem, signature), true);
  assert.equal(verify("RSA-SHA256", Buffer.from("mensaje alterado"), pem, signature), false);
});

test("jwks-rsa descarta claves que no son válidas para firmar", async () => {
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const keys = await retrieveSigningKeys([
    { ...publicKey.export({ format: "jwk" }), use: "enc", alg: "RS256" },
    { kty: "RSA", n: "invalido", e: "invalido", alg: "algoritmo-no-admitido" },
  ]);
  assert.deepEqual(keys, []);
});

test("la integración Passport también carga jose de forma compatible sin consultar la red", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "prueba-passport", use: "sig", alg: "RS256" };
  const provider = jwksRsa.passportJwtSecret({
    jwksUri: "https://example.invalid/jwks",
    cache: false,
    getKeysInterceptor: async () => [jwk],
  });
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: jwk.kid })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "usuario-ficticio" })).toString("base64url");
  const message = Buffer.from(`${header}.${payload}`);
  const signature = sign("RSA-SHA256", message, privateKey);
  const token = `${message}.${signature.toString("base64url")}`;
  const getKey = token => new Promise((resolve, reject) => {
    provider({}, token, (error, key) => error ? reject(error) : resolve(key));
  });

  const pem = await getKey(token);
  assert.equal(verify("RSA-SHA256", message, pem, signature), true);
  assert.equal(await getKey("token-invalido"), null);
});
