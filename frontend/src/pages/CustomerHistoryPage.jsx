import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ReceiptText, UserRound } from "lucide-react";
import { api, moneyFromCents } from "../services/api";
import Notice from "../components/ui/Notice";

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
    <Link to="/panel/clientes" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={18}/> Volver a clientes</Link>
    <Notice message={error}/>
    {loading ? <p className="p-6 text-slate-400">Cargando historial...</p> : customer && <>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start gap-4"><div className="rounded-xl bg-blue-500/10 p-3 text-blue-400"><UserRound size={25}/></div>
          <div><h1 className="text-2xl font-bold">{customer.name}</h1>
            <p className="mt-1 text-sm text-slate-400">{customer.documentNumber ? `${customer.documentType.toUpperCase()}: ${customer.documentNumber}` : "Sin documento registrado"}</p>
            <p className="mt-1 text-sm text-slate-500">{customer.email || ""} {customer.phone || ""}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-800 p-4"><p className="text-xs text-slate-400">Compras mostradas (máximo 50)</p><p className="mt-2 text-2xl font-bold">{sales.length}</p></div>
          <div className="rounded-xl bg-slate-800 p-4"><p className="text-xs text-slate-400">Total de compras mostradas</p><p className="mt-2 text-2xl font-bold text-emerald-400">{moneyFromCents(listedTotal)}</p></div>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-800 p-5"><ReceiptText size={20} className="text-blue-400"/><h2 className="font-semibold">Historial de compras</h2></div>
        {sales.length === 0 ? <p className="p-8 text-center text-slate-400">Todavía no hay compras asociadas a este cliente desde la fase 6.</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400"><tr><th className="p-4">Venta</th><th className="p-4">Fecha</th><th className="p-4">Unidades</th><th className="p-4">Cajero</th><th className="p-4">Total</th><th className="p-4">Detalle</th></tr></thead>
            <tbody>{sales.map(sale => <tr key={sale.id} className="border-t border-slate-800 hover:bg-slate-800/30">
              <td className="p-4 font-semibold">#{sale.saleId.slice(0,8).toUpperCase()}</td>
              <td className="p-4 text-slate-300">{sale.createdAt ? new Date(sale.createdAt).toLocaleString("es-PE") : "—"}</td>
              <td className="p-4">{sale.itemCount}</td><td className="p-4">{sale.cashierName}</td>
              <td className="p-4 font-semibold text-emerald-400">{moneyFromCents(sale.totalCents)}</td>
              <td className="p-4"><Link to={`/panel/ventas/${sale.saleId}`} className="text-blue-400 hover:underline">Ver venta</Link></td>
            </tr>)}</tbody>
          </table></div>}
      </section>
      <p className="text-xs text-slate-500">Historial disponible para las ventas asociadas expresamente a clientes desde la fase 6. Las ventas antiguas sin cliente no se asignan automáticamente.</p>
    </>}
  </div>;
}
