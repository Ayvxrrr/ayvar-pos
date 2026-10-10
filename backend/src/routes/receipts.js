import { Router } from "express";
import { db } from "../config/firebaseAdmin.js";
import { requireRole } from "../middleware/requireRole.js";
import { asyncRoute, HttpError } from "../utils/api.js";
import { createReceiptPDF } from "../utils/createReceiptPDF.js";

const router = Router();
const saleIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.get("/:id/pdf", requireRole("admin", "cashier"), asyncRoute(async (req, res) => {
  if (!saleIdPattern.test(req.params.id)) throw new HttpError(400, "ID de venta inválido.");

  // El negocio SIEMPRE sale del perfil validado, no de la URL del cliente.
  const businessRef = db.collection("businesses").doc(req.account.businessId);
  const [saleDoc, businessDoc] = await Promise.all([
    businessRef.collection("sales").doc(req.params.id).get(),
    businessRef.get(),
  ]);
  if (!saleDoc.exists) throw new HttpError(404, "Venta no encontrada.");
  if (!businessDoc.exists || businessDoc.data().active !== true) {
    throw new HttpError(403, "Negocio no disponible.");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Disposition", `attachment; filename="ayvar-pos-ticket-${saleDoc.id.slice(0, 8)}.pdf"`);
  createReceiptPDF({ sale: { id: saleDoc.id, ...saleDoc.data() }, business: businessDoc.data(), output: res });
}));

export default router;
