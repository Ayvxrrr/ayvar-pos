import { auth } from "../firebase";

const ROOT = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://localhost:4000");

export async function api(path, { method = "GET", body } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sesión nuevamente.");
  const token = await user.getIdToken();
  const response = await fetch(`${ROOT}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
  return data;
}

export function moneyFromCents(cents = 0) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })
    .format(cents / 100);
}

export function centsFromMoney(input) {
  const value = String(input).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error("Escribe un precio válido con máximo dos decimales.");
  }
  return Math.round(Number(value) * 100);
}
