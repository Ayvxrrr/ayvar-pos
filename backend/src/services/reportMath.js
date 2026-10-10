// Estadísticas puras. Todas las cantidades monetarias se conservan como enteros (céntimos).
// Zona de negocio: Perú (America/Lima, UTC-05:00 sin horario de verano).
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function limaDay(utcDate) {
  return new Date(utcDate.getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 10);
}

function safeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Datos inconsistentes en ${label}. No se generó un reporte incompleto.`);
  }
  return value;
}

export function aggregateReport({ sales, products, from, to }) {
  const days = [];
  const byDay = new Map();
  for (let ms = Date.parse(`${from}T00:00:00Z`); ms <= Date.parse(`${to}T00:00:00Z`); ms += DAY_MS) {
    const date = new Date(ms).toISOString().slice(0, 10);
    const row = { date, sales: 0, revenueCents: 0, units: 0 };
    days.push(row);
    byDay.set(date, row);
  }

  const payMap = new Map();
  const itemMap = new Map();
  let revenueCents = 0;
  let unitsSold = 0;
  let saleCount = 0;
  const completed = [];

  for (const sale of sales) {
    if (sale.status !== "completed") continue;
    if (!(sale.createdAt instanceof Date) || Number.isNaN(sale.createdAt.getTime())) {
      throw new Error("Una venta no tiene fecha válida. Corrige el registro antes de generar informes.");
    }
    const day = limaDay(sale.createdAt);
    if (!byDay.has(day)) continue;
    const amount = safeInteger(sale.totalCents, `total de venta ${sale.id}`);
    const rows = Array.isArray(sale.items) ? sale.items : [];
    if (!Array.isArray(sale.items)) throw new Error(`La venta ${sale.id} no tiene detalle válido.`);
    let saleUnits = 0;
    for (const line of rows) {
      const quantity = safeInteger(line.quantity, `cantidad de ${sale.id}`);
      const lineAmount = safeInteger(line.lineTotalCents, `subtotal de ${sale.id}`);
      saleUnits += quantity;
      const sku = String(line.sku || "SIN-SKU");
      const key = sku;
      const aggregate = itemMap.get(key) || { sku, name: String(line.name || sku), units: 0, revenueCents: 0 };
      aggregate.units += quantity;
      aggregate.revenueCents += lineAmount;
      itemMap.set(key, aggregate);
    }
    if (!Number.isSafeInteger(revenueCents + amount)) throw new Error("Importe fuera de rango seguro.");
    revenueCents += amount;
    unitsSold += saleUnits;
    saleCount++;
    const dayRow = byDay.get(day);
    dayRow.sales++;
    dayRow.revenueCents += amount;
    dayRow.units += saleUnits;
    const method = String(sale.paymentMethod || "other");
    const payment = payMap.get(method) || { method, count: 0, revenueCents: 0 };
    payment.count++;
    payment.revenueCents += amount;
    payMap.set(method, payment);
    completed.push({ ...sale, day });
  }

  const activeProducts = products.filter(p => p.active === true);
  const lowStock = activeProducts.filter(p =>
    Number.isSafeInteger(p.stock) && Number.isSafeInteger(p.minStock) && p.stock <= p.minStock
  ).sort((a, b) => a.stock - b.stock).map(p => ({
    sku: p.sku, name: p.name, stock: p.stock, minStock: p.minStock,
  }));

  const topProducts = [...itemMap.values()].sort((a, b) => b.units - a.units || b.revenueCents - a.revenueCents).slice(0, 10);
  const paymentMethods = [...payMap.values()].sort((a, b) => b.revenueCents - a.revenueCents);
  const recentSales = [...completed].sort((a, b) => b.createdAt - a.createdAt).slice(0, 12).map(s => ({
    id: s.id, createdAt: s.createdAt.toISOString(), totalCents: s.totalCents,
    itemCount: s.itemCount, paymentMethod: s.paymentMethod,
    cashierName: s.cashierName || "Cajero", customerName: s.customerName || "Consumidor final",
  }));
  return {
    period: { from, to, timezone: "America/Lima" },
    summary: {
      saleCount, revenueCents, unitsSold,
      averageTicketCents: saleCount ? Math.round(revenueCents / saleCount) : 0,
      activeProductCount: activeProducts.length,
      lowStockCount: lowStock.length,
    },
    days, topProducts, paymentMethods, lowStock: lowStock.slice(0, 30), recentSales,
    // Solo para generar exportaciones en el servidor, no se devuelve al frontend.
    allSales: completed,
  };
}
