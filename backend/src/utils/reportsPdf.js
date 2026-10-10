import PDFDocument from "pdfkit";
const money = cents => `S/ ${(cents / 100).toFixed(2)}`;
const methodNames = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", yape: "Yape" };

export function streamReportPdf(res, report, businessName) {
  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, info: { Title: "Ayvar POS - Reporte interno de ventas" } });
  res.type("application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="ayvar-pos-reporte-${report.period.from}-${report.period.to}.pdf"`);
  doc.pipe(res);
  const safe = value => String(value || "").replace(/[\r\n\t]/g, " ").slice(0, 90);
  function section(title) {
    if (doc.y > 680) doc.addPage();
    doc.moveDown(0.7).font("Helvetica-Bold").fontSize(13).fillColor("#163c74").text(title);
    doc.moveDown(0.35).font("Helvetica").fontSize(10).fillColor("#1c293a");
  }
  function row(label, value) {
    if (doc.y > 725) doc.addPage();
    doc.font("Helvetica").fontSize(10).fillColor("#243044").text(`${safe(label)}:  ${safe(value)}`, { lineGap: 3 });
  }
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#174ea6").text("AYVAR POS");
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#1c293a").text("Reporte interno de ventas");
  doc.font("Helvetica").fontSize(10).fillColor("#68768a")
    .text(safe(businessName)).text(`Período: ${report.period.from} al ${report.period.to} (hora de Perú)`)
    .text(`Generado: ${new Date().toISOString()}`)
    .moveDown(0.6);
  doc.moveTo(48, doc.y).lineTo(548, doc.y).strokeColor("#d4e0ed").stroke();
  section("Indicadores generales");
  row("Ventas confirmadas", report.summary.saleCount);
  row("Ingresos", money(report.summary.revenueCents));
  row("Unidades vendidas", report.summary.unitsSold);
  row("Ticket promedio", money(report.summary.averageTicketCents));
  row("Productos activos (estado actual)", report.summary.activeProductCount);
  row("Productos con stock bajo (estado actual)", report.summary.lowStockCount);
  section("Métodos de pago (declarados por caja)");
  for (const pay of report.paymentMethods) row(methodNames[pay.method] || pay.method, `${pay.count} ventas · ${money(pay.revenueCents)}`);
  if (!report.paymentMethods.length) row("Sin operaciones", "—");
  section("Productos más vendidos");
  for (const product of report.topProducts) row(`${product.sku} - ${product.name}`, `${product.units} unidades · ${money(product.revenueCents)}`);
  if (!report.topProducts.length) row("Sin productos vendidos", "—");
  section("Ventas por día");
  for (const day of report.days) row(day.date, `${day.sales} ventas · ${money(day.revenueCents)}`);
  section("Aviso");
  doc.font("Helvetica").fontSize(9).fillColor("#68768a")
    .text("Documento de gestión interna. No reemplaza la documentación fiscal ni los comprobantes electrónicos de SUNAT. Los pagos no se concilian con bancos o pasarelas.");
  doc.end();
}
