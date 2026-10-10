import PDFDocument from "pdfkit";

const soles = value => new Intl.NumberFormat("es-PE", {
  style: "currency", currency: "PEN",
}).format((Number(value) || 0) / 100);
const paymentNames = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", yape: "Yape" };
const dateText = value => {
  try {
    const d = value?.toDate?.() || (value ? new Date(value) : null);
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleString("es-PE", { timeZone: "America/Lima" }) : "Sin fecha";
  } catch { return "Sin fecha"; }
};

export function createReceiptPDF({ sale, business, output }) {
  const pdf = new PDFDocument({ size: "A4", margin: 44, info: {
    Title: `Constancia interna ${sale.id.slice(0, 8).toUpperCase()}`,
    Author: "Ayvar POS",
  }});
  pdf.on("error", error => output.destroy(error));
  pdf.pipe(output);
  const navy = "#0f172a";
  const muted = "#64748b";
  const maxX = 508;

  function divider() {
    pdf.moveDown(0.65);
    const y = pdf.y;
    pdf.moveTo(44, y).lineTo(552, y).strokeColor("#e2e8f0").stroke();
    pdf.moveDown(0.7);
  }
  function row(label, value, strong = false) {
    const y = pdf.y;
    pdf.font("Helvetica").fontSize(10).fillColor(muted).text(label, 44, y, { width: 220 });
    pdf.font(strong ? "Helvetica-Bold" : "Helvetica").fillColor(navy).text(String(value), 270, y, { width: 282, align: "right" });
    pdf.y = Math.max(pdf.y, y + 19);
  }
  function tableTitle() {
    pdf.font("Helvetica-Bold").fontSize(9).fillColor("#475569");
    const y = pdf.y;
    pdf.text("PRODUCTO", 44, y, { width: 275 });
    pdf.text("CANT.", 324, y, { width: 44, align: "right" });
    pdf.text("P. UNIT.", 377, y, { width: 74, align: "right" });
    pdf.text("SUBTOTAL", 464, y, { width: 88, align: "right" });
    pdf.y = y + 20;
  }

  pdf.rect(0, 0, 595, 116).fill(navy);
  pdf.fillColor("#ffffff").font("Helvetica-Bold").fontSize(24)
    .text("AYVAR POS", 44, 39, { width: maxX });
  pdf.font("Helvetica").fontSize(10).fillColor("#cbd5e1")
    .text("CONSTANCIA INTERNA DE VENTA", 44, 76, { width: maxX });
  pdf.y = 139;

  pdf.font("Helvetica-Bold").fontSize(17).fillColor(navy)
    .text(String(business.name || "Negocio"), 44, pdf.y, { width: maxX });
  pdf.moveDown(0.5);
  pdf.font("Helvetica-Bold").fontSize(9).fillColor("#b45309")
    .text("NO ES BOLETA NI FACTURA ELECTRÓNICA. NO VÁLIDO COMO COMPROBANTE SUNAT.", { width: maxX });
  divider();

  row("Operación", sale.id);
  row("Fecha de registro", dateText(sale.createdAt));
  row("Cajero", sale.cashierName || "—");
  row("Cliente", sale.customerName || "Consumidor final");
  if (sale.customerDocumentNumber) {
    row(sale.customerDocumentType === "ruc" ? "RUC" : "DNI", sale.customerDocumentNumber);
  }
  divider();
  tableTitle();

  for (const item of sale.items || []) {
    const y = pdf.y;
    if (y > 705) {
      pdf.addPage();
      pdf.y = 60;
      tableTitle();
    }
    const start = pdf.y;
    pdf.fillColor(navy).font("Helvetica").fontSize(9)
      .text(`${item.name || "Artículo"}\nSKU: ${item.sku || "—"}`, 44, start, { width: 270 });
    const afterName = pdf.y;
    pdf.text(String(item.quantity || 0), 324, start, { width: 44, align: "right" });
    pdf.text(soles(item.unitPriceCents), 377, start, { width: 74, align: "right" });
    pdf.text(soles(item.lineTotalCents), 464, start, { width: 88, align: "right" });
    pdf.y = Math.max(afterName, start + 38) + 7;
  }

  if (pdf.y > 710) { pdf.addPage(); pdf.y = 60; }
  divider();
  row("Método de pago", paymentNames[sale.paymentMethod] || sale.paymentMethod || "—");
  if (sale.paymentMethod === "cash") {
    row("Efectivo recibido", soles(sale.receivedCents));
    row("Vuelto", soles(sale.changeCents));
  }
  pdf.moveDown(0.5);
  pdf.font("Helvetica-Bold").fontSize(17).fillColor(navy)
    .text(`TOTAL: ${soles(sale.totalCents)}`, 44, pdf.y, { width: maxX, align: "right" });
  pdf.moveDown(1.5);
  pdf.font("Helvetica").fontSize(9).fillColor(muted)
    .text("Documento informativo generado a partir de una venta registrada en Ayvar POS.", { align: "center", width: maxX });
  pdf.end();
}
