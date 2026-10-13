import { useEffect, useState } from "react";
import { Boxes, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { api } from "../services/api";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/ui/PageHeader";
import Notice from "../components/ui/Notice";
import EmptyState from "../components/ui/EmptyState";

const inputClass = "field mt-2";
export default function InventoryPage() {
  const { session } = useAuth();
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
      <PageHeader eyebrow="El control de tus existencias" title="Inventario" description="Cada movimiento tiene su historia. Mantén el stock de tu tienda al día." />
      <Notice message={error}/><Notice message={success} type="success"/>
      <form onSubmit={submit} className="panel mb-6 p-5 md:p-6">
        <h2 className="panel-title mb-5"><span className="section-icon"><Boxes size={20}/></span>Ajustar existencias</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="field-label">Producto *
            <select required value={form.sku} onChange={e=>setForm(s=>({...s,sku:e.target.value}))} className={inputClass}>
              <option value="">Seleccionar...</option>
              {products.map(p=><option key={p.sku} value={p.sku}>{p.sku} — {p.name} (stock: {p.stock})</option>)}
            </select>
          </label>
          <label className="field-label">Movimiento *
            <select value={form.type} onChange={e=>setForm(s=>({...s,type:e.target.value}))} className={inputClass}>
              <option value="in">Entrada (+)</option><option value="out">Salida (-)</option>
            </select>
          </label>
          <label className="field-label">Cantidad *
            <input type="number" required min="1" max="1000000" step="1" value={form.quantity}
              onChange={e=>setForm(s=>({...s,quantity:e.target.value}))} className={inputClass}/>
          </label>
          <label className="field-label">Motivo *
            <input required minLength={3} maxLength={200} placeholder="Compra a proveedor, ajuste..." value={form.note}
              onChange={e=>setForm(s=>({...s,note:e.target.value}))} className={inputClass}/>
          </label>
        </div>
        <button disabled={busy || !products.length} className="btn btn-primary mt-5">
          {busy ? "Guardando..." : "Registrar movimiento"}
        </button>
      </form>

      <section className="panel overflow-hidden">
        <div className="panel-heading"><h2 className="panel-title">Últimos movimientos</h2><span className="badge badge-neutral">Hasta 100 registros</span></div>
        {loading ? <EmptyState loading title="Cargando movimientos..."/> : movements.length === 0
          ? <EmptyState icon={Boxes} title="Todo movimiento empieza aquí" description="Todavía no existen movimientos de inventario."/>
          : <div className="overflow-x-auto"><table className="data-table min-w-[750px]">
            <thead><tr><th className="p-4">Fecha</th><th className="p-4">Producto</th><th className="p-4">Tipo</th><th className="p-4">Cantidad</th><th className="p-4">Stock final</th><th className="p-4">Motivo</th></tr></thead>
            <tbody>{movements.map(m=><tr key={m.id}>
              <td className="p-4 text-xs text-slate-500">{m.createdAt ? new Date(m.createdAt).toLocaleString("es-PE") : "—"}</td>
              <td className="p-4">{m.sku}</td>
              <td className="p-4"><span className={`badge ${["out", "sale"].includes(m.type) ? "badge-warning" : "badge-success"}`}>{["out", "sale"].includes(m.type) ? <ArrowDownCircle size={14}/> : <ArrowUpCircle size={14}/>}{m.type === "initial" ? "Inicial" : m.type === "in" ? "Entrada" : m.type === "sale" ? "Venta" : "Salida"}</span></td>
              <td className="p-4">{m.quantity}</td><td className="p-4 font-semibold">{m.newStock}</td><td className="p-4 text-slate-500">{(m.saleId && session.user.role === "admin") ? <Link to={`/panel/ventas/${m.saleId}`} className="text-link">{m.note}</Link> : m.note}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </div>
  );
}
