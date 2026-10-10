
import express from "express";
import cors from "cors";
import "dotenv/config";

import { db } from "./config/firebaseAdmin.js";
import { requireAuth } from "./middleware/requireAuth.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
}));

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    project: "Ayvar POS",
    message: "Backend funcionando correctamente",
  });
});

app.get("/api/me", requireAuth, async (req, res) => {
  try {
    const businessDoc = await db
      .collection("businesses")
      .doc(req.account.businessId)
      .get();

    if (!businessDoc.exists ||
        businessDoc.data().active !== true) {
      return res.status(403).json({
        error: "El negocio no está disponible.",
      });
    }

    const business = businessDoc.data();

    return res.json({
      success: true,
      user: {
        uid: req.account.uid,
        email: req.account.email,
        name: req.account.name,
        role: req.account.role,
      },
      business: {
        id: businessDoc.id,
        name: business.name,
        currency: business.currency,
      },
    });
  } catch (error) {
    console.error("Error al obtener el negocio:", error);

    return res.status(500).json({
      error: "Error al obtener los datos del negocio.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Ayvar POS API: http://localhost:${PORT}`);
});
