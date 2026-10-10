import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { db } from "../config/firebaseAdmin.js";
import { HttpError, validate } from "../utils/api.js";
import { aggregateReport } from "./reportMath.js";

const MAX_DAYS = 93;
const MAX_SALES = 5000;
const MAX_PRODUCTS = 5000;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa fecha AAAA-MM-DD.");
const dateSchema = z.object({ from: isoDate, to: isoDate }).strict();

function validDay(day) {
  const [year, month, date] = day.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, date));
  return year >= 2020 && year <= 2100 && d.toISOString().slice(0, 10) === day;
}

export function parsePeriod(query) {
  const { from, to } = validate(dateSchema, query);
  if (!validDay(from) || !validDay(to)) throw new HttpError(400, "Fecha de inicio o fin inválida.");
  const duration = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
  if (duration < 1 || duration > MAX_DAYS) {
    throw new HttpError(400, `Selecciona entre 1 y ${MAX_DAYS} días (ambos inclusive).`);
  }
  // Perú utiliza UTC−05 sin cambios de horario estacionales.
  const start = Timestamp.fromDate(new Date(`${from}T00:00:00-05:00`));
  const nextDay = new Date(Date.parse(`${to}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const endExclusive = Timestamp.fromDate(new Date(`${nextDay}T00:00:00-05:00`));
  return { from, to, start, endExclusive };
}

export async function loadReport(req) {
  const { from, to, start, endExclusive } = parsePeriod(req.query);
  const root = db.collection("businesses").doc(req.account.businessId);
  const [saleDocs, productDocs, businessDoc] = await Promise.all([
    root.collection("sales")
      .where("createdAt", ">=", start)
      .where("createdAt", "<", endExclusive)
      .orderBy("createdAt", "asc")
      .limit(MAX_SALES + 1).get(),
    root.collection("products").limit(MAX_PRODUCTS + 1).get(),
    root.get(),
  ]);
  if (saleDocs.size > MAX_SALES || productDocs.size > MAX_PRODUCTS) {
    throw new HttpError(422, "Demasiados registros para este reporte. Reduce el rango de fechas. Para volúmenes mayores se necesita agregación incremental.");
  }
  const sales = saleDocs.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate?.() }));
  const products = productDocs.docs.map(doc => ({ sku: doc.id, ...doc.data() }));
  try {
    return { ...aggregateReport({ sales, products, from, to }), businessName: String(businessDoc.data()?.name || "Ayvar POS") };
  } catch (err) {
    throw new HttpError(422, err.message);
  }
}

export function publicReport(report) {
  const { allSales, ...safe } = report;
  return { ...safe, generatedAt: new Date().toISOString() };
}
