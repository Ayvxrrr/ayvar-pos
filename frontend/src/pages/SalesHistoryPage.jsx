import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, RefreshCw, ArrowLeft, Eye, ReceiptText } from "lucide-react";
import { api, moneyFromCents } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import Notice from "../components/ui/Notice";

const paymentLabels = {
  cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", yape: "Yape",
};

export default function SalesHistoryPage() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function reload() {
    setError("");
    setLoading(true);
    try {
      const result = await api("/api/sales");
      setSales(result.sales);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);
  const filtered = useMemo(() => sales.filter(sale => {
    const terms = [sale.id, sale.cashierName, sale.customerName, sale.paymentMethod,
      ...(sale.items || []).flatMap(item => [item.name, item.sku])]
      .join(" ").toLocaleLowerCase("es");
    return terms.includes(search.toLocaleLowerCase("es"));
  }), [sales, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Historial de ventas" description="Consulta las últimas 50 operaciones registradas en el negocio." />
        <Link to="/panel/ventas" className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm hover:bg-slate-800"><ArrowLeft size={17}/> Volver a caja</Link>
      </div>
      <Notice message={error}/>
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
          <h2 className="flex items-center gap-2 font-semibold"><ReceiptText size={19} className="text-blue-400"/> Ventas registradas ({filtered.length})</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-400">
              <Search size={17}/>
              <input aria-label="Buscar ventas" value={search} onChange={e => setSearch(e.target.value)} placeholder="ID, cliente, producto" className="w-48 bg-transparent py-2.5 text-sm text-white outline-none"/>
            </label>
            <button type="button" disabled={loading} onClick={reload} aria-label="Actualizar historial" className="rounded-xl border border-slate-700 p-3 text-slate-300 hover:bg-slate-800"><RefreshCw size={17}/></button>
          </div>
        </div>
        {loading ? <p className="p-6 text-slate-400">Cargando historial...</p> : filtered.length === 0
          ? <p className="p-8 text-center text-slate-400">Todavía no existen ventas para mostrar.</p>
          : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400"><tr>
              <th className="p-4">Venta</th><th className="p-4">Fecha</th><th className="p-4">Cajero</th><th className="p-4">Cliente</th>
              <th className="p-4">Productos</th><th className="p-4">Pago</th><th className="p-4">Total</th><th className="p-4">Detalle</th>
            </tr></thead>
            <tbody>{filtered.map(sale => <tr key={sale.id} className="border-t border-slate-800 hover:bg-slate-800/30">
              <td className="p-4 font-semibold text-blue-400">#{sale.id.slice(0, 8).toUpperCase()}</td>
              <td className="p-4 text-slate-300">{sale.createdAt ? new Date(sale.createdAt).toLocaleString("es-PE") : "—"}</td>
              <td className="p-4">{sale.cashierName || "—"}</td><td className="p-4">{sale.customerName || "Consumidor final"}</td>
              <td className="p-4">{sale.itemCount} und.</td>
              <td className="p-4 text-slate-300">{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</td>
              <td className="p-4 font-semibold text-emerald-400">{moneyFromCents(sale.totalCents)}</td>
              <td className="p-4"><Link to={`/panel/ventas/${sale.id}`} className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"><Eye size={17}/> Ver</Link></td>
            </tr>)}</tbody>
          </table></div>}
      </section>
      <p className="text-xs text-slate-500">Los pagos por tarjeta, transferencia o Yape reflejan lo declarado por el cajero. Esta versión todavía no consulta pasarelas de pago.</p>
    </div>
  );
}
