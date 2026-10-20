/**
 * Crea exclusivamente cuentas nuevas y datos ficticios en un negocio separado.
 * Las cuentas nacen deshabilitadas y solo se activan tras comprobar las protecciones publicadas.
 * Contraseñas y UID quedan en secrets/public-demo-access.json (ignorado por Git y Vercel).
 */
import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseArgs } from "node:util";
import { publicDemoAccounts, publicDemoProducts } from "../src/config/publicDemoAccounts.js";

const stateFile = fileURLToPath(new URL("../secrets/public-demo-access.json", import.meta.url));
const { values } = parseArgs({ options: {
  project: { type: "string" }, prepare: { type: "boolean" }, activate: { type: "boolean" },
  disable: { type: "boolean" }, api: { type: "string", default: "https://ayvar-pos.vercel.app" },
} });

function save(record, exclusive = false) {
  mkdirSync(path.dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, JSON.stringify(record, null, 2) + "\n", { flag: exclusive ? "wx" : "w", mode: 0o600 });
}

function show(record) {
  console.log(`Proyecto: ${record.projectId} | Negocio Demo: ${record.businessId} | Estado: ${record.status}`);
  console.table(record.accounts.map(({ role, email, password }) => ({ rol: role, correo: email, contraseña: password })));
  console.log("Estas contraseñas son para una demo pública. Nunca reutilizarlas en cuentas reales.");
}

function load(projectId) {
  const record = JSON.parse(readFileSync(stateFile, "utf8"));
  if (record.version !== 1 || record.projectId !== projectId || !record.provisionId || !record.businessId ||
      record.accounts?.length !== publicDemoAccounts.length ||
      !publicDemoAccounts.every(expected => record.accounts.some(account =>
        account.role === expected.role && account.email === expected.email && account.uid?.startsWith("public-demo-")))) {
    throw new Error("El archivo local no corresponde a estas cuentas Demo y proyecto; no se modificará nada.");
  }
  return record;
}

async function prepare(db, auth, projectId, FieldValue) {
  if (existsSync(stateFile)) {
    const prior = load(projectId);
    if (!["prepared", "active", "disabled"].includes(prior.status)) {
      throw new Error("Existe una preparación incompleta. Revisa el archivo local antes de crear nuevas cuentas.");
    }
    show(prior);
    return;
  }

  // No reutiliza, cambia ni restablece cuentas existentes, aunque coincida un correo.
  for (const account of publicDemoAccounts) {
    let existing;
    try { existing = await auth.getUserByEmail(account.email); }
    catch (error) { if (error.code !== "auth/user-not-found") throw error; }
    if (existing) throw new Error(`El correo ${account.email} ya existe. No se cambiará esa cuenta.`);
  }

  const password = process.env.PUBLIC_DEMO_PASSWORD || `Demo-${randomBytes(12).toString("base64url")}!1aA`;
  if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error("PUBLIC_DEMO_PASSWORD debe tener al menos 12 caracteres, mayúscula, minúscula, número y símbolo.");
  }

  const business = db.collection("businesses").doc();
  const record = {
    version: 1, projectId, businessId: business.id, provisionId: randomUUID(), status: "preparing",
    accounts: publicDemoAccounts.map(account => ({ ...account, uid: `public-demo-${randomBytes(12).toString("hex")}`, password })),
  };
  save(record, true);
  const created = [];
  let committed = false;
  try {
    for (const account of record.accounts) {
      await auth.createUser({ uid: account.uid, email: account.email, displayName: account.name,
        password: account.password, disabled: true, emailVerified: false });
      created.push(account.uid);
    }

    const stamp = () => FieldValue.serverTimestamp();
    const batch = db.batch();
    const marker = { publicDemo: true, demoProvisioningId: record.provisionId };
    batch.create(business, { ...marker, name: "Ayvar POS · Demo pública", active: false, currency: "PEN",
      address: "Negocio ficticio de demostración", phone: "", taxId: "",
      receiptFooter: "Demostración con datos ficticios. Ticket interno sin validez fiscal.",
      createdAt: stamp(), updatedAt: stamp() });
    for (const account of record.accounts) {
      batch.create(db.collection("users").doc(account.uid), {
        ...marker, businessId: business.id, role: account.role, name: account.name, email: account.email,
        active: false, inviteStatus: "demo", createdAt: stamp(), updatedAt: stamp(),
      });
    }
    for (const [id, name] of [["accesorios-demo", "Accesorios demo"], ["papeleria-demo", "Papelería demo"]]) {
      batch.create(business.collection("categories").doc(id), {
        name, description: "Categoría ficticia para probar el sistema", active: true,
        createdAt: stamp(), updatedAt: stamp(),
      });
    }
    const actor = record.accounts.find(account => account.role === "admin").uid;
    for (const product of publicDemoProducts) {
      batch.create(business.collection("products").doc(product.sku), {
        ...product, active: true, createdBy: actor, createdAt: stamp(), updatedAt: stamp(),
      });
      batch.create(business.collection("inventoryMovements").doc(), {
        sku: product.sku, type: "initial", quantity: product.stock, previousStock: 0, newStock: product.stock,
        note: "Stock ficticio para demostración", userId: actor, createdAt: stamp(),
      });
    }
    batch.create(business.collection("customers").doc(), {
      name: "Cliente ficticio de demostración", documentType: "none", documentNumber: "", email: "", phone: "", address: "",
      active: true, createdBy: actor, createdAt: stamp(), updatedAt: stamp(),
    });
    await batch.commit();
    committed = true;
    record.status = "prepared";
    save(record);
  } catch (error) {
    // Solo limpia cuentas creadas por esta ejecución; jamás usuarios preexistentes.
    if (!committed) {
      const cleanup = await Promise.allSettled(created.map(uid => auth.deleteUser(uid)));
      record.status = "failed";
      record.cleanupPending = created.filter((uid, index) => cleanup[index].status === "rejected");
      save(record);
    }
    throw error;
  }
  show(record);
  console.log("Cuentas preparadas y DESHABILITADAS hasta publicar las protecciones y ejecutar --activate.");
}

async function changeStatus(db, auth, projectId, FieldValue, activate) {
  const record = load(projectId);
  if (!["prepared", "active", "disabled"].includes(record.status)) throw new Error("La preparación no terminó correctamente.");
  if (activate) {
    const url = new URL(values.api);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      throw new Error("--api debe ser el origen HTTPS del frontend, sin rutas ni credenciales.");
    }
    const response = await fetch(new URL("/api/health", url), { signal: AbortSignal.timeout(15000) });
    const health = response.ok ? await response.json() : null;
    if (health?.capabilities?.publicDemo !== 1) {
      throw new Error("Primero publica las protecciones de la demo en Vercel. Las cuentas siguen sin activarse.");
    }
  }

  const business = db.collection("businesses").doc(record.businessId);
  const profiles = record.accounts.map(account => db.collection("users").doc(account.uid));
  const snapshots = await db.getAll(business, ...profiles);
  for (const snapshot of snapshots) {
    if (!snapshot.exists || snapshot.data().publicDemo !== true || snapshot.data().demoProvisioningId !== record.provisionId) {
      throw new Error("Los documentos no corresponden a esta Demo; no se cambiará su estado.");
    }
  }
  for (const [index, account] of record.accounts.entries()) {
    if (snapshots[index + 1].data().businessId !== record.businessId ||
        (activate && snapshots[index + 1].data().role !== account.role)) {
      throw new Error("El perfil fue modificado; revisa la Demo antes de continuar.");
    }
    if (activate) {
      const user = await auth.getUser(account.uid);
      if (user.email !== account.email) throw new Error("Un correo Demo cambió. Revísalo antes de continuar.");
    }
  }

  const setProfiles = async active => {
    const batch = db.batch();
    for (const ref of [business, ...profiles]) batch.update(ref, { active, updatedAt: FieldValue.serverTimestamp() });
    await batch.commit();
  };
  if (activate) {
    try {
      for (const account of record.accounts) await auth.updateUser(account.uid, { disabled: false });
      await setProfiles(true);
    } catch (error) {
      await Promise.allSettled([
        setProfiles(false),
        ...record.accounts.map(account => auth.updateUser(account.uid, { disabled: true })),
      ]);
      throw error;
    }
  } else {
    await setProfiles(false);
    for (const account of record.accounts) {
      try {
        await auth.updateUser(account.uid, { disabled: true });
        await auth.revokeRefreshTokens(account.uid);
      } catch (error) {
        if (error.code !== "auth/user-not-found") throw error;
      }
    }
  }
  record.status = activate ? "active" : "disabled";
  save(record);
  show(record);
}

async function main() {
  if (!values.project || [values.prepare, values.activate, values.disable].filter(Boolean).length !== 1) {
    throw new Error("Usa --project ID y exactamente una opción: --prepare, --activate o --disable.");
  }
  const { db, adminAuth } = await import("../src/config/firebaseAdmin.js");
  if (db.projectId !== values.project) throw new Error("El proyecto configurado no coincide con --project. No se modificará nada.");
  const { FieldValue } = await import("firebase-admin/firestore");
  if (values.prepare) await prepare(db, adminAuth, values.project, FieldValue);
  else await changeStatus(db, adminAuth, values.project, FieldValue, values.activate === true);
}

try { await main(); }
catch (error) {
  console.error(error.code ? `Firebase: ${error.code}` : error.message);
  process.exitCode = 1;
}
