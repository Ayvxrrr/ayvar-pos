import { Router } from "express";
import { db } from "../config/firebaseAdmin.js";
import { requireRole } from "../middleware/requireRole.js";
import { asyncRoute } from "../utils/api.js";

const router = Router();
router.use(requireRole("admin"));

router.get("/", asyncRoute(async (req, res) => {
  const snap = await db.collection("businesses").doc(req.account.businessId)
    .collection("auditLogs").orderBy("createdAt", "desc").limit(100).get();
  const events = snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.().toISOString() ?? null,
  }));
  res.set("Cache-Control", "no-store");
  res.json({ events });
}));

export default router;
