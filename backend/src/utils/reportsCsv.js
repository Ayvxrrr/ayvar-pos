const paymentLabels = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", yape: "Yape" };
function cell(value) {
  let text = String(value ?? "");
  // Evita ejecución de fórmulas cuando el CSV se abre en Excel u otros programas.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
const money = cents => (cents / 100).toFixed(2);
export function salesCsv(report) {
  const rows = [["Venta", "Fecha/hora Perú", "Cajero", "Forma de pago", "Unidades", "Artículos", "Total (PEN)"]];
  for (const sale of [...report.allSales].sort((a, b) => a.createdAt - b.createdAt)) {
    const lima = new Date(sale.createdAt.getTime() - 5 * 3600000).toISOString().replace("T", " ").slice(0, 19);
    rows.push([
      sale.id, lima, sale.cashierName || "", paymentLabels[sale.paymentMethod] || sale.paymentMethod,
      sale.items.reduce((n, item) => n + item.quantity, 0),
      sale.items.map(item => `${item.sku} x${item.quantity}`).join("; "), money(sale.totalCents),
    ]);
  }
  return "\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
