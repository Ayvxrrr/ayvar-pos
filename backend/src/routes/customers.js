import { Router } from "express";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebaseAdmin.js";
import { requireRole } from "../middleware/requireRole.js";
import { asyncRoute, docJSON, HttpError, validate } from "../utils/api.js";

const router = Router();
const idPattern = /^[A-Za-z0-9]{20}$/; // IDs automáticos de Firestore.
router.param("id", (req, res, next, id) => {
  if (!idPattern.test(id)) return res.status(400).json({ error: "ID de cliente inválido." });
  next();
});

const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  documentType: z.enum(["none", "dni", "ruc"]),
  documentNumber: z.string().trim().max(11).default(""),
  phone: z.string().trim().max(25).default(""),
  email: z.string().trim().max(150).default(""),
  address: z.string().trim().max(250).default(""),
}).strict().superRefine((input, ctx) => {
  const number = input.documentNumber;
  if (input.documentType === "none" && number) {
    ctx.addIssue({ code: "custom", path: ["documentNumber"], message: "Selecciona un documento o deja el número vacío." });
  }
  if (input.documentType === "dni" && !/^\d{8}$/.test(number)) {
    ctx.addIssue({ code: "custom", path: ["documentNumber"], message: "El DNI debe tener 8 dígitos." });
  }
  if (input.documentType === "ruc" && !/^\d{11}$/.test(number)) {
    ctx.addIssue({ code: "custom", path: ["documentNumber"], message: "El RUC debe tener 11 dígitos." });
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    ctx.addIssue({ code: "custom", path: ["email"], message: "Correo inválido." });
  }
  if (input.phone && !/^\+?[\d ()-]{6,25}$/.test(input.phone)) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "Teléfono inválido." });
  }
});

const businessRef = req => db.collection("businesses").doc(req.account.businessId);
const customers = req => businessRef(req).collection("customers");
const keys = req => businessRef(req).collection("customerDocumentKeys");
const keyFor = value => value.documentType === "none" ? null : `${value.documentType}-${value.documentNumber}`;

router.get("/", requireRole("admin", "cashier"), asyncRoute(async (req, res) => {
  // Primera versión: hasta 200 clientes. Implementaremos paginación en una fase futura.
  const snapshot = await customers(req).limit(200).get();
  const list = snapshot.docs.map(docJSON).sort((a, b) => a.name.localeCompare(b.name, "es"));
  res.json({ customers: list });
}));

router.post("/", requireRole("admin", "cashier"), asyncRoute(async (req, res) => {
  const input = validate(customerSchema, req.body);
  const ref = customers(req).doc();
  const key = keyFor(input);
  const keyRef = key ? keys(req).doc(key) : null;
  await db.runTransaction(async tx => {
    // Todas las lecturas antes de cualquier escritura.
    if (keyRef && (await tx.get(keyRef)).exists) {
      throw new HttpError(409, "Ya existe un cliente con ese tipo y número de documento.");
    }
    tx.create(ref, {
      ...input, active: true, createdBy: req.account.uid,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    if (keyRef) tx.create(keyRef, { customerId: ref.id });
  });
  res.status(201).json({ customer: docJSON(await ref.get()) });
}));

router.get("/:id", requireRole("admin", "cashier"), asyncRoute(async (req, res) => {
  const snap = await customers(req).doc(req.params.id).get();
  if (!snap.exists) throw new HttpError(404, "Cliente no encontrado.");
  res.json({ customer: docJSON(snap) });
}));

router.get("/:id/sales", requireRole("admin", "cashier"), asyncRoute(async (req, res) => {
  const ref = customers(req).doc(req.params.id);
  if (!(await ref.get()).exists) throw new HttpError(404, "Cliente no encontrado.");
  // Esta subcolección solo contiene ventas vinculadas desde la fase 6.
  const snap = await ref.collection("sales").orderBy("createdAt", "desc").limit(50).get();
  res.json({ sales: snap.docs.map(docJSON) });
}));

router.put("/:id", requireRole("admin", "cashier"), asyncRoute(async (req, res) => {
  const input = validate(customerSchema, req.body);
  const ref = customers(req).doc(req.params.id);
  await db.runTransaction(async tx => {
    const prior = await tx.get(ref);
    if (!prior.exists) throw new HttpError(404, "Cliente no encontrado.");
    if (!prior.data().active) throw new HttpError(409, "El cliente está desactivado.");

    const previousKey = keyFor(prior.data());
    const nextKey = keyFor(input);
    const nextRef = nextKey && nextKey !== previousKey ? keys(req).doc(nextKey) : null;
    if (nextRef && (await tx.get(nextRef)).exists) {
      throw new HttpError(409, "Ese DNI o RUC ya pertenece a otro cliente.");
    }
    tx.update(ref, { ...input, updatedBy: req.account.uid, updatedAt: FieldValue.serverTimestamp() });
    if (previousKey !== nextKey) {
      if (previousKey) tx.delete(keys(req).doc(previousKey));
      if (nextRef) tx.create(nextRef, { customerId: ref.id });
    }
  });
  res.json({ customer: docJSON(await ref.get()) });
}));

router.delete("/:id", requireRole("admin"), asyncRoute(async (req, res) => {
  const ref = customers(req).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Cliente no encontrado.");
  await ref.update({ active: false, updatedBy: req.account.uid, updatedAt: FieldValue.serverTimestamp() });
  res.json({ message: "Cliente desactivado. Las ventas históricas se mantienen." });
}));

router.patch("/:id/restore", requireRole("admin"), asyncRoute(async (req, res) => {
  const ref = customers(req).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Cliente no encontrado.");
  await ref.update({ active: true, updatedBy: req.account.uid, updatedAt: FieldValue.serverTimestamp() });
  res.json({ message: "Cliente reactivado." });
}));

export default router;
