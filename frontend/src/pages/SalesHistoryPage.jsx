import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, RefreshCw, ArrowLeft, Eye, ReceiptText } from "lucide-react";
import { api, moneyFromCents } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import Notice from "../components/ui/Notice";
import EmptyState from "../components/ui/EmptyState";

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
      <PageHeader eyebrow="Cada venta, cada detalle" title="Historial de ventas" description="Consulta las últimas 50 operaciones registradas en el negocio.">
        <Link to="/panel/ventas" className="btn btn-secondary"><ArrowLeft size={17}/> Volver a caja</Link>
      </PageHeader>
      <Notice message={error}/>
      <section className="panel overflow-hidden">
        <div className="panel-heading">
          <h2 className="panel-title"><ReceiptText size={18}/> Ventas registradas <span className="badge badge-neutral">{filtered.length}</span></h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="search-field">
              <Search size={17}/>
              <input aria-label="Buscar ventas" value={search} onChange={e => setSearch(e.target.value)} placeholder="ID, cliente, producto" className="w-48"/>
            </label>
            <button type="button" disabled={loading} onClick={reload} aria-label="Actualizar historial" className="icon-button size-11"><RefreshCw size={17} className={loading ? "animate-spin" : ""}/></button>
          </div>
        </div>
        {loading ? <EmptyState loading title="Cargando historial..."/> : filtered.length === 0
          ? <EmptyState icon={ReceiptText} title="Todavía no hay ventas para mostrar" description="Las ventas registradas aparecerán aquí con todos sus detalles."/>
          : <div className="overflow-x-auto"><table className="data-table min-w-[980px]">
            <thead><tr>
              <th className="p-4">Venta</th><th className="p-4">Fecha</th><th className="p-4">Cajero</th><th className="p-4">Cliente</th>
              <th className="p-4">Productos</th><th className="p-4">Pago</th><th className="p-4">Total</th><th className="p-4">Detalle</th>
            </tr></thead>
            <tbody>{filtered.map(sale => <tr key={sale.id}>
              <td className="p-4 font-semibold text-brand-700">#{sale.id.slice(0, 8).toUpperCase()}</td>
              <td className="p-4 text-xs text-slate-500">{sale.createdAt ? new Date(sale.createdAt).toLocaleString("es-PE") : "—"}</td>
              <td className="p-4">{sale.cashierName || "—"}</td><td className="p-4">{sale.customerName || "Consumidor final"}</td>
              <td className="p-4">{sale.itemCount} und.</td>
              <td className="p-4"><span className="badge badge-neutral">{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</span></td>
              <td className="p-4 font-bold text-brand-700">{moneyFromCents(sale.totalCents)}</td>
              <td className="p-4"><Link to={`/panel/ventas/${sale.id}`} className="text-link inline-flex items-center gap-2 px-2"><Eye size={16}/> Ver</Link></td>
            </tr>)}</tbody>
          </table></div>}
      </section>
      <p className="text-xs text-slate-500">Los pagos por tarjeta, transferencia o Yape reflejan lo declarado por el cajero. Esta versión todavía no consulta pasarelas de pago.</p>
    </div>
  );
}
