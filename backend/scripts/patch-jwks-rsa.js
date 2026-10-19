/**
 * Compatibilidad de jwks-rsa 4.1.0 con require(ESM) desactivado en Vercel.
 * Solo cambia la carga de jose; no modifica algoritmos ni validaciones de tokens.
 * https://github.com/auth0/node-jwks-rsa/issues/507
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const digest = value => createHash("sha256").update(value).digest("hex");
const patches = [
  {
    file: "src/utils.js",
    original: "c535773fd798202296e846e7c057f96f631148686194ff2990f0729fa4c1b7af",
    patched: "f1ffe481947f3de681f1b37418208dab0968bbbd20eb12a544b5276642f6c9e2",
    replacements: [
      ["const jose = require('jose');\n", ""],
      ["async function retrieveSigningKeys(jwks) {\n", "async function retrieveSigningKeys(jwks) {\n  const jose = await import('jose');\n"],
    ],
  },
  {
    file: "src/integrations/passport.js",
    original: "03557fac70296dda6d19872b1702d2b8f1d4c50d22d3fbcf1fb65f9afa7ddcbb",
    patched: "6f071bedf7fb3477670bf2c9bf98944010a0bcd88b269899a064835f8ef8920e",
    replacements: [
      ["const jose = require('jose');\n", ""],
      ["return function secretProvider(", "return async function secretProvider("],
      ["    try {\n      decoded = {", "    try {\n      const jose = await import('jose');\n      decoded = {"],
    ],
  },
];

export function patchJwksRsa(directory = path.dirname(require.resolve("jwks-rsa/package.json"))) {
  const { version } = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
  if (version !== "4.1.0") {
    throw new Error(`Revisa la compatibilidad ESM antes de actualizar jwks-rsa a ${version}.`);
  }

  // Valida todos los archivos antes de escribir; admite instalaciones ya parcheadas.
  const updates = patches.map(patch => {
    const file = path.join(directory, patch.file);
    const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    const hash = digest(source);
    if (hash === patch.patched) return null;
    if (hash !== patch.original) {
      throw new Error(`El contenido de jwks-rsa/${patch.file} cambió; revisa el parche ESM.`);
    }
    const updated = patch.replacements.reduce((text, [before, after]) => text.replace(before, after), source);
    if (digest(updated) !== patch.patched) {
      throw new Error(`No se pudo validar el parche ESM de jwks-rsa/${patch.file}.`);
    }
    return { file, updated };
  });

  for (const update of updates) {
    if (update) writeFileSync(update.file, update.updated);
  }
  console.log("jwks-rsa@4.1.0: compatibilidad ESM aplicada (2 archivos verificados).");
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  patchJwksRsa();
}
