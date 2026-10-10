import { Router } from "express";
import { db } from "../config/firebaseAdmin.js";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "../middleware/requireRole.js";
import { asyncRoute, HttpError, validate } from "../utils/api.js";
import { settingsSchema } from "../validators/adminSchemas.js";
import { auditRef, auditEntry } from "../services/audit.js";

const router = Router();
router.use(requireRole("admin"));

const businessRef = req => db.collection("businesses").doc(req.account.businessId);

router.get("/", asyncRoute(async (req, res) => {
  const snap = await businessRef(req).get();
  if (!snap.exists) throw new HttpError(404, "Negocio inexistente.");
  const b = snap.data();
  res.set("Cache-Control", "no-store");
  res.json({ settings: {
    name: b.name || "", phone: b.phone || "", address: b.address || "",
    taxId: b.taxId || "", receiptFooter: b.receiptFooter || "",
    currency: b.currency || "PEN",
  }});
}));

router.put("/", asyncRoute(async (req, res) => {
  const input = validate(settingsSchema, req.body);
  const ref = businessRef(req);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data().active !== true) {
      throw new HttpError(403, "Negocio no disponible.");
    }
    const before = Object.fromEntries(Object.keys(input).map(k => [k, snap.data()[k] || ""]));
    tx.update(ref, { ...input, updatedBy: req.account.uid, updatedAt: FieldValue.serverTimestamp() });
    tx.create(auditRef(req), auditEntry(req, "business.settings_updated", "business", ref.id, {
      changedFields: Object.keys(input).filter(k => before[k] !== input[k]),
    }));
  });
  res.json({ success: true, message: "Configuración guardada." });
}));

export default router;
