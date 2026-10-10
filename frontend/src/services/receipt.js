import { auth } from "../firebase";

const ROOT = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function downloadSaleReceipt(saleId) {
  if (!auth.currentUser) throw new Error("Inicia sesión nuevamente.");
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`${ROOT}/api/sales/${encodeURIComponent(saleId)}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `No se pudo descargar el PDF (HTTP ${response.status}).`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ayvar-pos-ticket-${saleId.slice(0, 8)}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Tiempo suficiente para que el navegador tome la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
