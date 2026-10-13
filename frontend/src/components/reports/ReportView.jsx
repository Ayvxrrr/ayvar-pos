import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3, ReceiptText, Wallet, Package, AlertTriangle,
  CalendarDays, Download, FileText, RefreshCw, ShoppingBag, TrendingUp, Plus, ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis,
  Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { moneyFromCents } from "../../services/api";
import { getReport, downloadReport, businessToday, dateMinusDays } from "../../services/reports";
import PageHeader from "../ui/PageHeader";
import StatCard from "../dashboard/StatCard";
import EmptyState from "../ui/EmptyState";
import Notice from "../ui/Notice";

const paymentLabels = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", yape: "Yape" };
const PIE_COLORS = ["#128064", "#63b5b4", "#9e90cf", "#e9b55c", "#d78094"];
const box = "panel chart-panel min-w-0 p-5 md:p-6";
const btn = "btn btn-secondary";

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

  return <div className="space-y-6">
    <PageHeader eyebrow={isFull ? "Análisis de tu negocio" : "Tu negocio, de un vistazo"} title={isFull ? "Reportes y estadísticas" : "Resumen del negocio"}
      description={isFull ? "Convierte tus ventas en información para tomar mejores decisiones." : "Cada venta cuenta. Aquí tienes el pulso de tu tienda."}>
      {!isFull && <><Link className={btn} to="/panel/reportes"><BarChart3 size={16}/> Ver reportes</Link><Link className="btn btn-primary" to="/panel/ventas"><Plus size={17}/> Nueva venta</Link></>}
    </PageHeader>

    <form onSubmit={submit} className="panel space-y-4 p-4 md:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto hidden self-center pr-5 xl:block"><p className="panel-title"><CalendarDays size={18}/> Período de análisis</p><p className="mt-1.5 text-[11px] text-slate-400">Horario de Perú · UTC−05</p></div>
        <label className="field-label flex min-w-36 flex-1 flex-col gap-1.5 xl:max-w-48">Desde
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} required className="field"/>
        </label>
        <label className="field-label flex min-w-36 flex-1 flex-col gap-1.5 xl:max-w-48">Hasta
          <input type="date" value={to} onChange={e => setTo(e.target.value)} required className="field"/>
        </label>
        <button type="submit" disabled={loading} className="btn btn-primary">Aplicar filtro</button>
        <button type="button" aria-label="Actualizar reportes" disabled={loading} onClick={() => setReloadCount(n => n + 1)} className="icon-button size-11"><RefreshCw size={17} className={loading ? "animate-spin" : ""}/></button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] text-slate-400">Vista rápida</span>
        {[["Hoy","today"],["7 días","week"],["30 días","last30"],["Este mes","month"]].map(([label,value]) =>
          <button type="button" key={value} disabled={loading} onClick={() => preset(value)} aria-pressed={period.to === today && period.from === (value === "today" ? today : value === "week" ? dateMinusDays(today, 6) : value === "month" ? firstOfMonth : dateMinusDays(today, 29))} className="filter-chip">{label}</button>
        )}
      </div>
      {isFull && <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button type="button" disabled={!!downloading || loading || !report} onClick={() => exportFile("csv")} className={`${btn} inline-flex items-center gap-2`}><Download size={16}/> {downloading === "csv" ? "Preparando..." : "Exportar ventas CSV"}</button>
        <button type="button" disabled={!!downloading || loading || !report} onClick={() => exportFile("pdf")} className={`${btn} inline-flex items-center gap-2`}><FileText size={16}/> {downloading === "pdf" ? "Preparando..." : "Descargar resumen PDF"}</button>
      </div>}
    </form>

    <Notice message={error} />
    {loading ? <div role="status" aria-label="Cargando estadísticas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({length: 6}, (_, i) => <div key={i} className="panel p-6"><div className="skeleton h-3 w-28"/><div className="skeleton mt-5 h-8 w-36"/><div className="skeleton mt-5 h-2 w-40"/></div>)}<span className="sr-only">Cargando estadísticas...</span></div> : report && <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400"><span className="font-semibold">DEL {period.from} AL {period.to}</span><span>Última consulta: {new Date(report.generatedAt).toLocaleString("es-PE")} · Gestión interna</span></div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Indicadores">
        {metricCards.map((m, i) => <StatCard key={m.title} {...m} description={m.helper} color={["blue", "green", "purple", "green", "blue", "orange"][i]} />)}
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className={box}>
          <div className="flex items-center justify-between"><h2 className="panel-title">Ingresos por día</h2><span className="badge badge-success"><span className="size-1.5 rounded-full bg-brand-500"/> Ingresos</span></div>
          <p className="mt-2 mb-6 text-[11px] text-slate-400">Evolución de las ventas confirmadas del período</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={days.map(row => ({...row, label: displayDate(row.date), revenue: row.revenueCents / 100}))} margin={{top:5,right:15,bottom:5,left:0}}>
                <defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1c9e7d" stopOpacity={.2}/><stop offset="100%" stopColor="#1c9e7d" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid stroke="#edf1f3" strokeDasharray="4 4" vertical={false}/>
                <XAxis dataKey="label" stroke="#94a3b8" tick={{fontSize:11}} minTickGap={18}/>
                <YAxis stroke="#94a3b8" tick={{fontSize:11}} width={60}/>
                <Tooltip formatter={value => [new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(value),"Ingresos"]}/>
                <Area type="monotone" dataKey="revenue" name="Ingresos" stroke="#128064" fill="url(#revenue-fill)" strokeWidth={2.5} dot={false} activeDot={{r:5, stroke: "#fff", strokeWidth: 3}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className={box}>
          <h2 className="panel-title">Productos más vendidos</h2>
          <p className="mt-2 mb-6 text-[11px] text-slate-400">Los favoritos de tus clientes · Por unidades vendidas</p>
          {top.length ? <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top.slice(0, 7).map(p => ({...p, label:p.name.length > 15 ? p.name.slice(0,15)+"…":p.name}))} layout="vertical" margin={{top:0,right:20,bottom:0,left:0}}>
                <CartesianGrid stroke="#edf1f3" strokeDasharray="4 4" horizontal={false}/>
                <XAxis type="number" allowDecimals={false} stroke="#94a3b8" tick={{fontSize:11}} />
                <YAxis type="category" dataKey="label" stroke="#94a3b8" width={105} tick={{fontSize:11}} />
                <Tooltip formatter={value => [value,"Unidades"]} />
                <Bar dataKey="units" fill="#63b5b4" radius={[0,5,5,0]} maxBarSize={22}/>
              </BarChart>
            </ResponsiveContainer>
          </div> : <EmptyState icon={BarChart3} title="Aún no hay ventas para graficar" description="Las ventas del período aparecerán aquí."/>}
        </section>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className={box}>
          <h2 className="panel-title">Métodos de pago</h2>
          <p className="mt-2 mb-3 text-[11px] text-slate-400">Pagos declarados; no conciliados con entidades financieras</p>
          {payments.length ? <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={payments.map(p => ({...p,label:paymentLabels[p.method]||p.method,value:p.revenueCents}))} dataKey="value" nameKey="label" innerRadius={62} outerRadius={85} paddingAngle={4} cornerRadius={4}>
                  {payments.map((p,i)=><Cell key={p.method} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={cents => [moneyFromCents(cents),"Total"]}/>
                <Legend iconType="circle" iconSize={7}/>
              </PieChart>
            </ResponsiveContainer>
          </div> : <EmptyState icon={Wallet} title="Sin pagos registrados" description="Aquí verás cómo pagan tus clientes."/>}
        </section>
        <section className={box}>
          <div className="flex items-center justify-between"><h2 className="panel-title"><AlertTriangle size={17} className="text-amber-500"/> Atención al inventario</h2><Link to="/panel/inventario" aria-label="Ver inventario" className="icon-button size-8 border-transparent"><ArrowUpRight size={16}/></Link></div>
          <p className="mt-2 mb-4 text-[11px] text-slate-400">Productos con stock bajo · Existencias actuales</p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {lowStock.length ? lowStock.map(p => <div key={p.sku} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-sm">
              <div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Package size={16}/></span><div className="min-w-0"><p className="truncate text-xs font-bold">{p.name}</p><p className="mt-1 text-[10px] text-slate-400">{p.sku}</p></div></div>
              <div className="shrink-0 text-right"><p className="badge badge-warning">{p.stock} uds.</p><p className="mt-1 text-[10px] text-slate-400">Mínimo {p.minStock}</p></div>
            </div>) : <EmptyState icon={Package} title="Inventario al día" description="No hay productos con alertas de stock."/>}
          </div>
          {summary.lowStockCount > lowStock.length && <p className="mt-3 text-xs text-slate-500">Mostrando 30 de {summary.lowStockCount} productos con stock bajo</p>}
        </section>
      </div>
      <section className="panel overflow-hidden">
        <div className="panel-heading"><h2 className="panel-title"><ReceiptText size={18}/> Últimas ventas del período</h2><Link className="text-link inline-flex items-center gap-1 text-xs" to="/panel/ventas/historial">Ver historial <ArrowUpRight size={14}/></Link></div>
        <div className="overflow-x-auto"><table className="data-table min-w-[650px]">
          <thead><tr><th>Fecha</th><th>Venta</th><th>Cliente</th><th>Método</th><th className="text-right">Total</th></tr></thead>
          <tbody>{recent.map(s => <tr key={s.id}>
            <td className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleString("es-PE",{timeZone:"America/Lima"})}</td>
            <td><Link className="text-link text-xs" to={`/panel/ventas/${s.id}`}>#{s.id.slice(0,8).toUpperCase()}</Link></td>
            <td className="text-xs">{s.customerName}</td><td><span className="badge badge-neutral">{paymentLabels[s.paymentMethod] || s.paymentMethod}</span></td>
            <td className="text-right font-semibold">{moneyFromCents(s.totalCents)}</td>
          </tr>)}
          </tbody>
        </table></div>
        {!recent.length && <EmptyState icon={ReceiptText} title="Tu próxima venta empieza aquí" description="Todavía no hay ventas confirmadas en este período."/>}
      </section>
    </>}
    <p className="text-xs leading-relaxed text-slate-500">Los ingresos reflejan importes de ventas registradas, no utilidades. Los métodos de pago no prueban recepción bancaria. El informe consulta las ventas del período seleccionado (hasta 5.000) y el estado actual de los productos; para grandes volúmenes implementaremos resúmenes agregados incrementales.</p>
  </div>;
}
