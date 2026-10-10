import { auth } from "../firebase";
import { api } from "./api";

const ROOT = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function reportQuery(from, to) {
  return new URLSearchParams({ from, to }).toString();
}

export function getReport(from, to) {
  return api(`/api/reports/summary?${reportQuery(from, to)}`);
}

export async function downloadReport(from, to, format) {
  if (!["csv", "pdf"].includes(format)) throw new Error("Formato no permitido.");
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Debes iniciar sesión de nuevo.");
  const token = await currentUser.getIdToken();
  const path = format === "csv" ? "sales.csv" : "summary.pdf";
  const response = await fetch(`${ROOT}/api/reports/${path}?${reportQuery(from, to)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }
  const fileBlob = await response.blob();
  const url = URL.createObjectURL(fileBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ayvar-pos-${format === "csv" ? "ventas" : "reporte"}-${from}-${to}.${format}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function businessToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const obj = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
}

export function dateMinusDays(day, days) {
  return new Date(Date.parse(`${day}T00:00:00Z`) - days * 86400000).toISOString().slice(0, 10);
}
