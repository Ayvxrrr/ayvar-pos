import express from "express";
import cors from "cors";
import "dotenv/config";

import { db } from "./config/firebaseAdmin.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { requireRole } from "./middleware/requireRole.js";
import categoriesRouter from "./routes/categories.js";
import productsRouter from "./routes/products.js";
import inventoryRouter from "./routes/inventory.js";
import salesRouter from "./routes/sales.js";
import customersRouter from "./routes/customers.js";
import receiptsRouter from "./routes/receipts.js";
import { requireBusinessActive } from "./utils/requireBusinessActive.js";
import reportsRouter from "./routes/reports.js";
import helmet from "helmet";
import teamRouter from "./routes/team.js";
import settingsRouter from "./routes/settings.js";
import auditRouter from "./routes/audit.js";
import { validateProductionConfig, corsSettings } from "./config/productionSecurity.js";
import { rateLimit } from "express-rate-limit";

const app = express();
validateProductionConfig();
app.disable("x-powered-by");
app.use(helmet());
const PORT = Number(process.env.PORT || 4000);
app.set("trust proxy", 1);
app.use(cors(corsSettings()));
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
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones. Intenta más tarde." },
}));

app.use("/api/categories", requireAuth, requireBusinessActive, categoriesRouter);
app.use("/api/products", requireAuth, requireBusinessActive, productsRouter);
app.use("/api/inventory", requireAuth, requireBusinessActive, inventoryRouter);
app.use("/api/customers", requireAuth, requireBusinessActive, customersRouter);
app.use("/api/sales", requireAuth, requireBusinessActive, receiptsRouter);
app.use("/api/sales", requireAuth, requireBusinessActive, salesRouter);
app.use("/api/reports", requireAuth, requireBusinessActive, reportsRouter);
app.use("/api/team", requireAuth, requireBusinessActive, teamRouter);
app.use("/api/settings", requireAuth, requireBusinessActive, settingsRouter);
app.use("/api/audit", requireAuth, requireBusinessActive, auditRouter);


app.use((err, req, res, next) => {
  console.error("Error de API:", err);
  res.status(err.status || 500).json({
    error: err.status ? err.message : "Error interno del servidor.",
  });
});

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => console.log(`Ayvar POS API: http://localhost:${PORT}`));
}

export default app;
