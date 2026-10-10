import test from "node:test";
import assert from "node:assert/strict";
import { aggregateReport, limaDay } from "../src/services/reportMath.js";
const sale = (id, date, items, totalCents, method="cash") => ({
  id, createdAt: new Date(date), status: "completed", totalCents,
  paymentMethod: method, items,
});
const line = (sku, quantity, lineTotalCents) => ({ sku, name: sku, quantity, lineTotalCents });

test("zona Perú asigna 04:59 UTC al día local anterior", () => {
  assert.equal(limaDay(new Date("2026-10-10T04:59:59Z")), "2026-10-09");
  assert.equal(limaDay(new Date("2026-10-10T05:00:00Z")), "2026-10-10");
});
test("suma ventas, tickets, productos y stock bajo sin mezclar negocios", () => {
  const report = aggregateReport({ from: "2026-10-09", to: "2026-10-10", sales: [
    sale("s1", "2026-10-10T04:59:59Z", [line("TEC-1", 2, 9000)], 9000),
    sale("s2", "2026-10-10T05:00:00Z", [line("TEC-1", 1, 4500)], 4500, "yape"),
    { ...sale("s3", "2026-10-10T05:01:00Z", [line("TEC-1", 1, 4500)], 4500), status: "cancelled" },
  ], products: [
    { sku: "TEC-1", active: true, stock: 3, minStock: 5 },
    { sku: "TEC-2", active: false, stock: 0, minStock: 5 },
  ]});
  assert.deepEqual(report.summary, { saleCount: 2, revenueCents: 13500, unitsSold: 3, averageTicketCents: 6750, activeProductCount: 1, lowStockCount: 1 });
  assert.deepEqual(report.days.map(d => d.revenueCents), [9000, 4500]);
  assert.deepEqual(report.topProducts[0].units, 3);
  assert.equal(report.paymentMethods.length, 2);
});
test("periodo sin ventas devuelve cero y días en blanco", () => {
  const report = aggregateReport({ sales: [], products: [], from: "2026-10-09", to: "2026-10-10" });
  assert.equal(report.summary.saleCount, 0);
  assert.equal(report.days.length, 2);
  assert.equal(report.summary.averageTicketCents, 0);
});
