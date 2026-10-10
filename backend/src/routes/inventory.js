import { Router } from "express";
import { db } from "../config/firebaseAdmin.js";
import { requireRole } from "../middleware/requireRole.js";
import { asyncRoute } from "../utils/api.js";

const router = Router();
router.get("/movements", requireRole("admin", "warehouse"), asyncRoute(async (req, res) => {
  const snap = await db.collection("businesses").doc(req.account.businessId)
    .collection("inventoryMovements").orderBy("createdAt", "desc").limit(100).get();
  res.json({ movements: snap.docs.map(doc => ({
    id: doc.id, ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.().toISOString() ?? null,
  })) });
}));
export default router;
