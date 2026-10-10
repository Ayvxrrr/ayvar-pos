import { Router } from "express";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebaseAdmin.js";
import { requireRole } from "../middleware/requireRole.js";
import { asyncRoute, docJSON, HttpError, validate } from "../utils/api.js";

const router = Router();
const skuSchema = z.string().regex(/^[A-Z0-9][A-Z0-9_-]{1,39}$/);
const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  "Identificador de operación inválido."
);
const centsSchema = z.number().int().min(0).max(1_000_000_000_000);

const checkoutSchema = z.object({
  requestId: uuidSchema,
  items: z.array(z.object({
    sku: skuSchema,
    quantity: z.number().int().min(1).max(1_000),
  }).strict()).min(1).max(20),
  expectedTotalCents: centsSchema,
  paymentMethod: z.enum(["cash", "card", "transfer", "yape"]),
  receivedCents: centsSchema.nullish(),
}).strict();

const businessRef = req => db.collection("businesses").doc(req.account.businessId);
const salesRef = req => businessRef(req).collection("sales");
const productsRef = req => businessRef(req).collection("products");
const movementsRef = req => businessRef(req).collection("inventoryMovements");

function canonicalInput(input) {
  const sortedItems = [...input.items].sort((a, b) => a.sku.localeCompare(b.sku));
  return JSON.stringify({
    items: sortedItems,
    expectedTotalCents: input.expectedTotalCents,
    paymentMethod: input.paymentMethod,
    receivedCents: input.paymentMethod === "cash" ? input.receivedCents : null,
  });
}

router.get("/", requireRole("admin", "cashier"), asyncRoute(async (req, res) => {
  // Fase 5: primeros 50, sin filtros de fecha ni paginación todavía.
  const snap = await salesRef(req).orderBy("createdAt", "desc").limit(50).get();
  res.json({ sales: snap.docs.map(docJSON) });
}));

router.post("/", requireRole("admin", "cashier"), asyncRoute(async (req, res) => {
  const input = validate(checkoutSchema, req.body);
  const uniqueSkus = new Set(input.items.map(item => item.sku));
  if (uniqueSkus.size !== input.items.length) {
    throw new HttpError(400, "No envíes productos repetidos en el carrito.");
  }
  if (input.paymentMethod === "cash" && input.receivedCents == null) {
    throw new HttpError(400, "Indica el importe recibido en efectivo.");
  }
  if (input.paymentMethod !== "cash" && input.receivedCents != null) {
    throw new HttpError(400, "El efectivo recibido solo se utiliza en pagos en efectivo.");
  }

  const fingerprint = canonicalInput(input);
  const saleRef = salesRef(req).doc(input.requestId);
  const productRefs = input.items.map(item => productsRef(req).doc(item.sku));
  // IDs creados fuera del callback; una transacción puede ejecutarse varias veces.
  const movementRefs = input.items.map(() => movementsRef(req).doc());

  const outcome = await db.runTransaction(async (tx) => {
    // Orden obligatorio: TODAS las lecturas antes de la primera escritura.
    const priorSale = await tx.get(saleRef);
    if (priorSale.exists) {
      if (priorSale.data().requestFingerprint !== fingerprint) {
        throw new HttpError(409, "Este identificador ya se utilizó para una venta diferente.");
      }
      return "existing";
    }

    const [businessSnap, ...productSnaps] = await Promise.all([
      tx.get(businessRef(req)),
      ...productRefs.map(ref => tx.get(ref)),
    ]);
    if (!businessSnap.exists || businessSnap.data().active !== true) {
      throw new HttpError(403, "El negocio no está disponible.");
    }
    if (businessSnap.data().currency !== "PEN") {
      throw new HttpError(400, "Esta versión de caja solo admite negocios con moneda PEN.");
    }

    let totalCents = 0;
    let units = 0;
    const lines = input.items.map((item, index) => {
      const snap = productSnaps[index];
      if (!snap.exists || snap.data().active !== true) {
        throw new HttpError(409, `El producto ${item.sku} ya no está disponible.`);
      }
      const product = snap.data();
      if (!Number.isSafeInteger(product.stock) || product.stock < item.quantity) {
        throw new HttpError(409, `Stock insuficiente para ${item.sku}. Actualiza el carrito.`);
      }
      if (!Number.isSafeInteger(product.priceCents) || product.priceCents < 0) {
        throw new HttpError(409, `Precio inválido para ${item.sku}.`);
      }
      const lineTotalCents = product.priceCents * item.quantity;
      totalCents += lineTotalCents;
      units += item.quantity;
      if (!Number.isSafeInteger(totalCents) || totalCents > 1_000_000_000_000) {
        throw new HttpError(400, "La venta excede el importe permitido.");
      }
      return {
        sku: item.sku,
        name: product.name,
        categoryId: product.categoryId,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        lineTotalCents,
        previousStock: product.stock,
        newStock: product.stock - item.quantity,
      };
    });

    // El total real se determina en el servidor, no en el navegador.
    if (totalCents !== input.expectedTotalCents) {
      throw new HttpError(409, "Cambió el precio de algún producto. Actualiza la caja antes de cobrar.");
    }
    if (input.paymentMethod === "cash" && input.receivedCents < totalCents) {
      throw new HttpError(400, "El efectivo recibido no cubre el total de la venta.");
    }
    const changeCents = input.paymentMethod === "cash" ? input.receivedCents - totalCents : 0;
    const saleItems = lines.map(({ previousStock, newStock, ...line }) => line);

    tx.create(saleRef, {
      status: "completed",
      currency: "PEN",
      items: saleItems,
      itemCount: units,
      totalCents,
      paymentMethod: input.paymentMethod,
      // Card / transfer / Yape: no es confirmación de la entidad financiera.
      paymentStatus: "declared",
      receivedCents: input.paymentMethod === "cash" ? input.receivedCents : null,
      changeCents,
      userId: req.account.uid,
      cashierName: req.account.name || req.account.email || "Cajero",
      requestFingerprint: fingerprint,
      createdAt: FieldValue.serverTimestamp(),
    });
    lines.forEach((line, i) => {
      tx.update(productRefs[i], {
        stock: line.newStock,
        updatedBy: req.account.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.create(movementRefs[i], {
        sku: line.sku,
        type: "sale",
        quantity: line.quantity,
        previousStock: line.previousStock,
        newStock: line.newStock,
        saleId: input.requestId,
        note: `Venta ${input.requestId.slice(0, 8).toUpperCase()}`,
        userId: req.account.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return "created";
  });

  res.status(outcome === "created" ? 201 : 200).json({
    sale: docJSON(await saleRef.get()),
    repeated: outcome === "existing",
  });
}));

router.get("/:id", requireRole("admin", "cashier"), asyncRoute(async (req, res) => {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) throw new HttpError(400, "Identificador de venta inválido.");
  const snap = await salesRef(req).doc(parsed.data).get();
  if (!snap.exists) throw new HttpError(404, "Venta no encontrada.");
  res.json({ sale: docJSON(snap) });
}));

export default router;
