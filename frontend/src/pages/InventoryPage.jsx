import { useEffect, useState } from "react";
import { Boxes, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { api } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import Notice from "../components/ui/Notice";

const inputClass = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none focus:border-blue-500";
export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState({ sku: "", type: "in", quantity: "1", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    const [p, m] = await Promise.all([api("/api/products"), api("/api/inventory/movements")]);
    setProducts(p.products.filter(product => product.active));
    setMovements(m.movements);
  }
  useEffect(() => { reload().catch(e=>setError(e.message)).finally(()=>setLoading(false)); }, []);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      await api(`/api/products/${encodeURIComponent(form.sku)}/stock`, {
        method: "POST", body: { type: form.type, quantity: Number(form.quantity), note: form.note },
      });
      await reload(); setForm(s=>({ ...s, quantity: "1", note: "" }));
      setSuccess("Ajuste guardado y registrado en el historial.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Inventario" description="Registra entradas y salidas sin perder el historial de existencias." />
      <Notice message={error}/><Notice message={success} type="success"/>
      <form onSubmit={submit} className="mb-7 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-5 flex items-center gap-2 font-semibold"><Boxes size={20} className="text-blue-400"/> Ajustar existencias</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm text-slate-300">Producto *
            <select required value={form.sku} onChange={e=>setForm(s=>({...s,sku:e.target.value}))} className={inputClass}>
              <option value="">Seleccionar...</option>
              {products.map(p=><option key={p.sku} value={p.sku}>{p.sku} — {p.name} (stock: {p.stock})</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Movimiento *
            <select value={form.type} onChange={e=>setForm(s=>({...s,type:e.target.value}))} className={inputClass}>
              <option value="in">Entrada (+)</option><option value="out">Salida (-)</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">Cantidad *
            <input type="number" required min="1" max="1000000" step="1" value={form.quantity}
              onChange={e=>setForm(s=>({...s,quantity:e.target.value}))} className={inputClass}/>
          </label>
          <label className="text-sm text-slate-300">Motivo *
            <input required minLength={3} maxLength={200} placeholder="Compra a proveedor, ajuste..." value={form.note}
              onChange={e=>setForm(s=>({...s,note:e.target.value}))} className={inputClass}/>
          </label>
        </div>
        <button disabled={busy || !products.length} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500 disabled:opacity-50">
          {busy ? "Guardando..." : "Registrar movimiento"}
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5"><h2 className="font-semibold">Últimos movimientos (máximo 100)</h2></div>
        {loading ? <p className="p-6 text-slate-400">Cargando...</p> : movements.length === 0
          ? <p className="p-6 text-slate-400">Todavía no existen movimientos de inventario.</p>
          : <div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm">
            <thead className="bg-slate-800/60 text-slate-400"><tr><th className="p-4">Fecha</th><th className="p-4">Producto</th><th className="p-4">Tipo</th><th className="p-4">Cantidad</th><th className="p-4">Stock final</th><th className="p-4">Motivo</th></tr></thead>
            <tbody>{movements.map(m=><tr key={m.id} className="border-t border-slate-800">
              <td className="p-4 text-slate-400">{m.createdAt ? new Date(m.createdAt).toLocaleString("es-PE") : "—"}</td>
              <td className="p-4">{m.sku}</td>
              <td className="p-4"><span className="flex items-center gap-1">{m.type === "out" ? <ArrowDownCircle size={16} className="text-red-400"/> : <ArrowUpCircle size={16} className="text-emerald-400"/>}{m.type === "initial" ? "Inicial" : m.type === "in" ? "Entrada" : "Salida"}</span></td>
              <td className="p-4">{m.quantity}</td><td className="p-4 font-semibold">{m.newStock}</td><td className="p-4 text-slate-400">{m.note}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </div>
  );
}
