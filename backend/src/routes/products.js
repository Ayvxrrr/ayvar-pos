import { Router } from "express";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebaseAdmin.js";
import { requireRole } from "../middleware/requireRole.js";
import { asyncRoute, docJSON, HttpError, validate } from "../utils/api.js";

const router = Router();
router.param("sku", (req, res, next, value) => {
  if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(value)) {
    return res.status(400).json({ error: "Código SKU inválido." });
  }
  next();
});
const nonnegMoney = z.number().int().min(0).max(1_000_000_000);
const qty = z.number().int().min(0).max(1_000_000);
const editable = z.object({
  name: z.string().trim().min(2).max(120),
  categoryId: z.string().trim().min(1).max(60),
  priceCents: nonnegMoney,
  costCents: nonnegMoney,
  minStock: qty,
}).strict();
const createInput = editable.extend({
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{1,39}$/, "SKU: usa letras, números, - o _."),
  initialStock: qty,
});
const stockInput = z.object({
  type: z.enum(["in", "out"]),
  quantity: z.number().int().min(1).max(1_000_000),
  note: z.string().trim().min(3).max(200),
}).strict();

const business = (req) => db.collection("businesses").doc(req.account.businessId);
const products = (req) => business(req).collection("products");
const categories = (req) => business(req).collection("categories");
const movements = (req) => business(req).collection("inventoryMovements");

async function requireCategory(tx, req, categoryId) {
  const snapshot = await tx.get(categories(req).doc(categoryId));
  if (!snapshot.exists || !snapshot.data().active) {
    throw new HttpError(400, "Selecciona una categoría activa.");
  }
}

router.get("/", requireRole("admin", "cashier", "warehouse"), asyncRoute(async (req, res) => {
  const snapshot = await products(req).get();
  let list = snapshot.docs.map(docJSON);
  if (req.account.role === "cashier") {
    list = list.filter(p => p.active).map(({ costCents, ...item }) => item);
  }
  list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  res.json({ products: list });
}));

router.post("/", requireRole("admin", "warehouse"), asyncRoute(async (req, res) => {
  const data = validate(createInput, req.body);
  const { sku, initialStock, ...properties } = data;
  const ref = products(req).doc(sku);
  const movementRef = movements(req).doc();
  await db.runTransaction(async tx => {
    // Todas las lecturas van antes de las escrituras.
    await requireCategory(tx, req, properties.categoryId);
    if ((await tx.get(ref)).exists) throw new HttpError(409, "Ya existe un producto con ese SKU.");
    tx.create(ref, { ...properties, sku, stock: initialStock, active: true,
      createdBy: req.account.uid, createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp() });
    if (initialStock > 0) {
      tx.create(movementRef, { sku, type: "initial", quantity: initialStock,
        previousStock: 0, newStock: initialStock, note: "Existencias iniciales",
        userId: req.account.uid, createdAt: FieldValue.serverTimestamp() });
    }
  });
  res.status(201).json({ product: docJSON(await ref.get()) });
}));

router.put("/:sku", requireRole("admin", "warehouse"), asyncRoute(async (req, res) => {
  const input = validate(editable, req.body);
  const ref = products(req).doc(req.params.sku);
  await db.runTransaction(async tx => {
    const categoryRef = categories(req).doc(input.categoryId);
    const [productSnap, categorySnap] = await Promise.all([tx.get(ref), tx.get(categoryRef)]);
    if (!productSnap.exists) throw new HttpError(404, "Producto no encontrado.");
    if (!productSnap.data().active) throw new HttpError(409, "Producto desactivado.");
    if (!categorySnap.exists || !categorySnap.data().active) throw new HttpError(400, "Selecciona una categoría activa.");
    tx.update(ref, { ...input, updatedBy: req.account.uid,
      updatedAt: FieldValue.serverTimestamp() });
  });
  res.json({ product: docJSON(await ref.get()) });
}));

router.delete("/:sku", requireRole("admin"), asyncRoute(async (req, res) => {
  const ref = products(req).doc(req.params.sku);
  await db.runTransaction(async tx => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new HttpError(404, "Producto no encontrado.");
    if (doc.data().stock !== 0) throw new HttpError(409, "Debes dejar el stock en 0 antes de desactivar.");
    tx.update(ref, { active: false, updatedBy: req.account.uid,
      updatedAt: FieldValue.serverTimestamp() });
  });
  res.json({ message: "Producto desactivado." });
}));

router.patch("/:sku/restore", requireRole("admin"), asyncRoute(async (req, res) => {
  const ref = products(req).doc(req.params.sku);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, "Producto no encontrado.");
    const cat = await tx.get(categories(req).doc(snap.data().categoryId));
    if (!cat.exists || !cat.data().active) throw new HttpError(409, "Primero reactiva su categoría.");
    tx.update(ref, { active: true, updatedBy: req.account.uid,
      updatedAt: FieldValue.serverTimestamp() });
  });
  res.json({ message: "Producto reactivado." });
}));

router.post("/:sku/stock", requireRole("admin", "warehouse"), asyncRoute(async (req, res) => {
  const input = validate(stockInput, req.body);
  const ref = products(req).doc(req.params.sku);
  const movementRef = movements(req).doc();
  const nextStock = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists || !snap.data().active) throw new HttpError(404, "Producto activo no encontrado.");
    const current = snap.data().stock;
    const next = current + (input.type === "in" ? input.quantity : -input.quantity);
    if (!Number.isSafeInteger(next) || next < 0 || next > 1_000_000) {
      throw new HttpError(409, "Stock insuficiente o cantidad fuera de rango.");
    }
    tx.update(ref, { stock: next, updatedBy: req.account.uid,
      updatedAt: FieldValue.serverTimestamp() });
    tx.create(movementRef, { sku: req.params.sku, ...input,
      previousStock: current, newStock: next, userId: req.account.uid,
      createdAt: FieldValue.serverTimestamp() });
    return next;
  });
  res.json({ message: "Inventario actualizado.", stock: nextStock });
}));

export default router;
