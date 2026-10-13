import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ReceiptText, UserRound } from "lucide-react";
import { api, moneyFromCents } from "../services/api";
import Notice from "../components/ui/Notice";
import EmptyState from "../components/ui/EmptyState";

export default function CustomerHistoryPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    Promise.all([
      api(`/api/customers/${encodeURIComponent(id)}`),
      api(`/api/customers/${encodeURIComponent(id)}/sales`),
    ]).then(([profile, history]) => {
      if (active) { setCustomer(profile.customer); setSales(history.sales); }
    }).catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const listedTotal = useMemo(() => sales.reduce((sum, sale) => sum + sale.totalCents, 0), [sales]);

  return <div className="space-y-6">
    <Link to="/panel/clientes" className="btn btn-secondary"><ArrowLeft size={16}/> Volver a clientes</Link>
    <Notice message={error}/>
    {loading ? <div className="panel"><EmptyState loading title="Cargando historial..."/></div> : customer && <>
      <section className="panel p-5 sm:p-7">
        <div className="flex items-start gap-4"><div className="section-icon size-14 rounded-2xl"><UserRound size={25}/></div>
          <div className="min-w-0"><p className="eyebrow mb-1.5">Perfil del cliente</p><h1 className="break-words text-2xl font-extrabold">{customer.name}</h1>
            <p className="mt-2 text-sm text-slate-500">{customer.documentNumber ? `${customer.documentType.toUpperCase()}: ${customer.documentNumber}` : "Sin documento registrado"}</p>
            <p className="mt-1 text-sm text-slate-500">{customer.email || ""} {customer.phone || ""}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5"><p className="text-xs font-semibold text-slate-500">Compras mostradas (máximo 50)</p><p className="mt-2 text-3xl font-extrabold tracking-tight">{sales.length}</p></div>
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-5"><p className="text-xs font-semibold text-brand-700">Total de compras mostradas</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-brand-700">{moneyFromCents(listedTotal)}</p></div>
        </div>
      </section>
      <section className="panel overflow-hidden">
        <div className="panel-heading"><h2 className="panel-title"><ReceiptText size={18}/>Historial de compras</h2></div>
        {sales.length === 0 ? <EmptyState icon={ReceiptText} title="La historia está por comenzar" description="Todavía no hay compras asociadas a este cliente."/> :
          <div className="overflow-x-auto"><table className="data-table min-w-[650px]">
            <thead><tr><th className="p-4">Venta</th><th className="p-4">Fecha</th><th className="p-4">Unidades</th><th className="p-4">Cajero</th><th className="p-4">Total</th><th className="p-4">Detalle</th></tr></thead>
            <tbody>{sales.map(sale => <tr key={sale.id}>
              <td className="p-4 font-semibold">#{sale.saleId.slice(0,8).toUpperCase()}</td>
              <td className="p-4 text-xs text-slate-500">{sale.createdAt ? new Date(sale.createdAt).toLocaleString("es-PE") : "—"}</td>
              <td className="p-4">{sale.itemCount}</td><td className="p-4">{sale.cashierName}</td>
              <td className="p-4 font-bold text-brand-700">{moneyFromCents(sale.totalCents)}</td>
              <td className="p-4"><Link to={`/panel/ventas/${sale.saleId}`} className="text-link">Ver venta</Link></td>
            </tr>)}</tbody>
          </table></div>}
      </section>
      <p className="text-xs text-slate-500">Historial disponible para las ventas asociadas expresamente a clientes desde la fase 6. Las ventas antiguas sin cliente no se asignan automáticamente.</p>
    </>}
  </div>;
}
