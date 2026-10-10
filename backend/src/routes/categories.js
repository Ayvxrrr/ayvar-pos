import { Router } from "express";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebaseAdmin.js";
import { requireRole } from "../middleware/requireRole.js";
import { asyncRoute, docJSON, HttpError, validate } from "../utils/api.js";

const router = Router();
router.param("id", (req, res, next, value) => {
  if (!/^[a-z0-9-]{1,60}$/.test(value)) {
    return res.status(400).json({ error: "Identificador de categoría inválido." });
  }
  next();
});
const categoryInput = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).default(""),
}).strict();

const businessRef = (req) => db.collection("businesses").doc(req.account.businessId);
const collection = (req) => businessRef(req).collection("categories");

function makeId(name) {
  const id = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 60).replace(/-$/, "");
  if (!id) throw new HttpError(400, "El nombre debe contener letras o números.");
  return id;
}

router.get("/", requireRole("admin", "cashier", "warehouse"), asyncRoute(async (req, res) => {
  const snap = await collection(req).get();
  const categories = snap.docs.map(docJSON);
  categories.sort((a, b) => a.name.localeCompare(b.name, "es"));
  res.json({ categories: req.account.role === "cashier" ? categories.filter(c => c.active) : categories });
}));

router.post("/", requireRole("admin"), asyncRoute(async (req, res) => {
  const input = validate(categoryInput, req.body);
  const id = makeId(input.name);
  const ref = collection(req).doc(id);
  try {
    await ref.create({ ...input, active: true, createdBy: req.account.uid,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  } catch (error) {
    if (error.code === 6 || error.code === "already-exists") throw new HttpError(409, "Ya existe una categoría con ese identificador.");
    throw error;
  }
  res.status(201).json({ category: docJSON(await ref.get()) });
}));

router.put("/:id", requireRole("admin"), asyncRoute(async (req, res) => {
  const input = validate(categoryInput, req.body);
  const ref = collection(req).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Categoría no encontrada.");
  if (!snap.data().active) throw new HttpError(409, "Primero reactiva la categoría.");
  await ref.update({ ...input, updatedAt: FieldValue.serverTimestamp() });
  res.json({ category: docJSON(await ref.get()) });
}));

router.delete("/:id", requireRole("admin"), asyncRoute(async (req, res) => {
  const ref = collection(req).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Categoría no encontrada.");
  const productSnap = await businessRef(req).collection("products")
    .where("categoryId", "==", req.params.id).get();
  if (productSnap.docs.some(d => d.data().active)) {
    throw new HttpError(409, "Esta categoría tiene productos activos. Muévelos o desactívalos primero.");
  }
  await ref.update({ active: false, updatedAt: FieldValue.serverTimestamp() });
  res.json({ message: "Categoría desactivada." });
}));

router.patch("/:id/restore", requireRole("admin"), asyncRoute(async (req, res) => {
  const ref = collection(req).doc(req.params.id);
  if (!(await ref.get()).exists) throw new HttpError(404, "Categoría no encontrada.");
  await ref.update({ active: true, updatedAt: FieldValue.serverTimestamp() });
  res.json({ message: "Categoría reactivada." });
}));

export default router;
