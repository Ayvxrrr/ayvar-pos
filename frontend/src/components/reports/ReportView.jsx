import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3, ReceiptText, Wallet, Package, AlertTriangle,
  CalendarDays, Download, FileText, RefreshCw, ShoppingBag, TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { moneyFromCents } from "../../services/api";
import { getReport, downloadReport, businessToday, dateMinusDays } from "../../services/reports";

const paymentLabels = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", yape: "Yape" };
const PIE_COLORS = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#fb7185"];
const box = "rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6";
const btn = "rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium transition hover:bg-slate-700 disabled:opacity-50";

function Stat({ title, value, icon: Icon, helper }) {
  return <div className={box}>
    <div className="flex items-center justify-between text-sm text-slate-400">
      <span>{title}</span><Icon size={20} className="text-blue-400" />
    </div>
    <p className="mt-3 break-all text-2xl font-bold text-white xl:text-3xl">{value}</p>
    {helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}
  </div>;
}

function displayDate(day) {
  const [year, month, date] = day.split("-");
  return `${date}/${month}`;
}

export default function ReportView({ mode = "reports" }) {
  const today = businessToday();
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  const [from, setFrom] = useState(mode === "dashboard" ? dateMinusDays(today, 29) : firstOfMonth);
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState({ from, to });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getReport(period.from, period.to)
      .then(data => { if (active) setReport(data); })
      .catch(err => { if (active) { setReport(null); setError(err.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period, reloadCount]);

  const submit = useCallback((event) => {
    event.preventDefault();
    if (from > to) { setError("La fecha inicial no puede superar la fecha final."); return; }
    const nDays = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
    if (nDays > 93) { setError("Selecciona un rango de máximo 93 días."); return; }
    setError("");
    setPeriod({ from, to });
    setReloadCount(n => n + 1);
  }, [from, to]);

  function preset(name) {
    const nextToday = businessToday();
    const first = name === "today" ? nextToday : name === "week" ? dateMinusDays(nextToday, 6)
      : name === "month" ? `${nextToday.slice(0, 7)}-01` : dateMinusDays(nextToday, 29);
    setFrom(first); setTo(nextToday);
    setPeriod({ from: first, to: nextToday });
    setReloadCount(n => n + 1);
  }

  async function exportFile(format) {
    try {
      setDownloading(format);
      setError("");
      await downloadReport(period.from, period.to, format);
    } catch (err) { setError(err.message); }
    finally { setDownloading(""); }
  }

  const summary = report?.summary;
  const days = report?.days || [];
  const top = report?.topProducts || [];
  const payments = report?.paymentMethods || [];
  const lowStock = report?.lowStock || [];
  const recent = report?.recentSales || [];
  const isFull = mode === "reports";
  const metricCards = summary ? [
    { title: "Ventas confirmadas", value: summary.saleCount.toLocaleString("es-PE"), icon: ReceiptText, helper: "Operaciones del período" },
    { title: "Ingresos", value: moneyFromCents(summary.revenueCents), icon: Wallet, helper: "Pagos registrados en caja" },
    { title: "Unidades vendidas", value: summary.unitsSold.toLocaleString("es-PE"), icon: ShoppingBag, helper: "Cantidad total de artículos" },
    { title: "Ticket promedio", value: moneyFromCents(summary.averageTicketCents), icon: TrendingUp, helper: "Ingresos / número de ventas" },
    { title: "Productos activos", value: summary.activeProductCount.toLocaleString("es-PE"), icon: Package, helper: "Estado actual del catálogo" },
    { title: "Alertas de stock", value: summary.lowStockCount.toLocaleString("es-PE"), icon: AlertTriangle, helper: "Stock actual menor o igual al mínimo" },
  ] : [];

  return <div className="space-y-6 text-slate-100">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">Ayvar POS / {isFull ? "Reportes" : "Dashboard"}</p>
        <h1 className="mt-2 text-3xl font-bold">{isFull ? "Reportes y estadísticas" : "Resumen del negocio"}</h1>
        <p className="mt-2 text-sm text-slate-400">Datos reales de Firestore · Fechas en horario de Perú (UTC−05)</p>
      </div>
      {!isFull && <Link className={`${btn} inline-flex items-center gap-2`} to="/panel/reportes"><BarChart3 size={17}/> Reportes completos</Link>}
    </div>

    <form onSubmit={submit} className={`${box} space-y-4`}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-36 flex-1 flex-col gap-2 text-sm text-slate-400">Desde
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} required className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white"/>
        </label>
        <label className="flex min-w-36 flex-1 flex-col gap-2 text-sm text-slate-400">Hasta
          <input type="date" value={to} onChange={e => setTo(e.target.value)} required className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white"/>
        </label>
        <button type="submit" disabled={loading} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50">Aplicar filtro</button>
        <button type="button" aria-label="Actualizar reportes" disabled={loading} onClick={() => setReloadCount(n => n + 1)} className={btn}><RefreshCw size={18}/></button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDays size={16} className="text-slate-500"/>
        {[["Hoy","today"],["7 días","week"],["30 días","last30"],["Este mes","month"]].map(([label,value]) =>
          <button type="button" key={value} disabled={loading} onClick={() => preset(value)} className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">{label}</button>
        )}
      </div>
      {isFull && <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
        <button type="button" disabled={!!downloading || loading || !report} onClick={() => exportFile("csv")} className={`${btn} inline-flex items-center gap-2`}><Download size={16}/> {downloading === "csv" ? "Preparando..." : "Exportar ventas CSV"}</button>
        <button type="button" disabled={!!downloading || loading || !report} onClick={() => exportFile("pdf")} className={`${btn} inline-flex items-center gap-2`}><FileText size={16}/> {downloading === "pdf" ? "Preparando..." : "Descargar resumen PDF"}</button>
      </div>}
    </form>

    {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
    {loading ? <div className={`${box} text-center text-slate-400`}>Cargando estadísticas desde Firestore...</div> : report && <>
      <p className="text-xs text-slate-500">Período aplicado: {period.from} al {period.to} · Datos consultados {new Date(report.generatedAt).toLocaleString("es-PE")} · Reporte de gestión interna</p>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Indicadores">
        {metricCards.map(m => <Stat key={m.title} {...m} />)}
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className={box}>
          <h2 className="text-lg font-semibold">Ingresos por día</h2>
          <p className="mb-5 text-xs text-slate-500">Solo ventas confirmadas del período</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={days.map(row => ({...row, label: displayDate(row.date), revenue: row.revenueCents / 100}))} margin={{top:5,right:15,bottom:5,left:0}}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="label" stroke="#94a3b8" tick={{fontSize:11}} minTickGap={18}/>
                <YAxis stroke="#94a3b8" tick={{fontSize:11}} width={60}/>
                <Tooltip formatter={value => [new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(value),"Ingresos"]}/>
                <Line type="monotone" dataKey="revenue" name="Ingresos" stroke="#60a5fa" strokeWidth={3} dot={false} activeDot={{r:5}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className={box}>
          <h2 className="text-lg font-semibold">Productos más vendidos</h2>
          <p className="mb-5 text-xs text-slate-500">Ordenados por unidades · Máximo 10</p>
          {top.length ? <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top.slice(0, 7).map(p => ({...p, label:p.name.length > 15 ? p.name.slice(0,15)+"…":p.name}))} layout="vertical" margin={{top:0,right:20,bottom:0,left:0}}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" allowDecimals={false} stroke="#94a3b8" tick={{fontSize:11}} />
                <YAxis type="category" dataKey="label" stroke="#94a3b8" width={105} tick={{fontSize:11}} />
                <Tooltip formatter={value => [value,"Unidades"]} />
                <Bar dataKey="units" fill="#818cf8" radius={[0,6,6,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div> : <div className="flex h-72 items-center justify-center text-sm text-slate-500">No hay ventas para graficar</div>}
        </section>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className={box}>
          <h2 className="text-lg font-semibold">Métodos de pago</h2>
          <p className="mb-3 text-xs text-slate-500">Pagos declarados; no conciliados con entidades financieras</p>
          {payments.length ? <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={payments.map(p => ({...p,label:paymentLabels[p.method]||p.method,value:p.revenueCents}))} dataKey="value" nameKey="label" innerRadius={45} outerRadius={80} paddingAngle={3}>
                  {payments.map((p,i)=><Cell key={p.method} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={cents => [moneyFromCents(cents),"Total"]}/>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div> : <div className="flex h-64 items-center justify-center text-sm text-slate-500">Sin métodos de pago registrados</div>}
        </section>
        <section className={box}>
          <h2 className="text-lg font-semibold">Stock bajo</h2>
          <p className="mb-4 text-xs text-slate-500">Estado actual del inventario, no histórico</p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {lowStock.length ? lowStock.map(p => <div key={p.sku} className="flex items-center justify-between gap-3 rounded-lg bg-slate-800/70 p-3 text-sm">
              <div className="min-w-0"><p className="truncate font-semibold">{p.name}</p><p className="text-xs text-slate-500">{p.sku}</p></div>
              <div className="text-right"><p className="font-semibold text-orange-300">{p.stock} uds.</p><p className="text-xs text-slate-500">Mínimo {p.minStock}</p></div>
            </div>) : <div className="py-8 text-center text-sm text-slate-500">No hay alertas de stock</div>}
          </div>
          {summary.lowStockCount > lowStock.length && <p className="mt-3 text-xs text-slate-500">Mostrando 30 de {summary.lowStockCount} productos con stock bajo</p>}
        </section>
      </div>
      <section className={`${box} overflow-x-auto`}>
        <h2 className="mb-4 text-lg font-semibold">Últimas ventas del período</h2>
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="border-b border-slate-700 text-xs uppercase text-slate-500"><tr><th className="py-3">Fecha</th><th>Venta</th><th>Cliente</th><th>Método</th><th className="text-right">Total</th></tr></thead>
          <tbody>{recent.map(s => <tr key={s.id} className="border-b border-slate-800 last:border-0">
            <td className="py-3 text-slate-400">{new Date(s.createdAt).toLocaleString("es-PE",{timeZone:"America/Lima"})}</td>
            <td><Link className="font-medium text-blue-400 hover:underline" to={`/panel/ventas/${s.id}`}>{s.id.slice(0,8).toUpperCase()}</Link></td>
            <td>{s.customerName}</td><td>{paymentLabels[s.paymentMethod] || s.paymentMethod}</td>
            <td className="text-right font-semibold">{moneyFromCents(s.totalCents)}</td>
          </tr>)}
          </tbody>
        </table>
        {!recent.length && <p className="py-8 text-center text-sm text-slate-500">Todavía no hay ventas confirmadas en este período.</p>}
      </section>
    </>}
    <p className="text-xs leading-relaxed text-slate-500">Los ingresos reflejan importes de ventas registradas, no utilidades. Los métodos de pago no prueban recepción bancaria. El informe consulta las ventas del período seleccionado (hasta 5.000) y el estado actual de los productos; para grandes volúmenes implementaremos resúmenes agregados incrementales.</p>
  </div>;
}
