import express from "express";
import cors from "cors";
import "dotenv/config";

import { db } from "./config/firebaseAdmin.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { requireRole } from "./middleware/requireRole.js";
import categoriesRouter from "./routes/categories.js";
import productsRouter from "./routes/products.js";
import inventoryRouter from "./routes/inventory.js";
import { requireBusinessActive } from "./utils/requireBusinessActive.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "50kb" }));

app.get("/api/health", (req, res) => res.json({
  success: true, project: "Ayvar POS", message: "Backend funcionando correctamente",
}));

app.get("/api/me", requireAuth, async (req, res, next) => {
  try {
    const doc = await db.collection("businesses").doc(req.account.businessId).get();
    if (!doc.exists || doc.data().active !== true) {
      return res.status(403).json({ error: "El negocio no está disponible." });
    }
    res.json({ success: true, user: {
      uid: req.account.uid, email: req.account.email, name: req.account.name,
      role: req.account.role,
    }, business: { id: doc.id, name: doc.data().name, currency: doc.data().currency } });
  } catch (error) { next(error); }
});

app.get("/api/admin/check", requireAuth, requireRole("admin"), (req, res) =>
  res.json({ success: true, message: "Acceso de administrador autorizado" }));

app.use("/api/categories", requireAuth, requireBusinessActive, categoriesRouter);
app.use("/api/products", requireAuth, requireBusinessActive, productsRouter);
app.use("/api/inventory", requireAuth, requireBusinessActive, inventoryRouter);

app.use((err, req, res, next) => {
  console.error("Error de API:", err);
  res.status(err.status || 500).json({
    error: err.status ? err.message : "Error interno del servidor.",
  });
});

app.listen(PORT, () => console.log(`Ayvar POS API: http://localhost:${PORT}`));
