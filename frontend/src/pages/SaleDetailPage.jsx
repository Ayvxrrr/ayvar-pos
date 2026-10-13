import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer, ReceiptText, CheckCircle2, Download } from "lucide-react";
import { api, moneyFromCents } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Notice from "../components/ui/Notice";
import EmptyState from "../components/ui/EmptyState";
import { downloadSaleReceipt } from "../services/receipt";
import "../styles/receipt.css";

const paymentLabels = {
  cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", yape: "Yape",
};

export default function SaleDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true); setError("");
    try { await downloadSaleReceipt(id); }
    catch (err) { setError(err.message); }
    finally { setDownloading(false); }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/api/sales/${encodeURIComponent(id)}`)
      .then(data => { if (active) setSale(data.sale); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="panel"><EmptyState loading title="Cargando comprobante interno..."/></div>;
  if (!sale) return <Notice message={error || "Venta no encontrada."}/>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/panel/ventas/historial" className="btn btn-ghost"><ArrowLeft size={16}/> Historial</Link>
        <div className="flex flex-wrap gap-2">
          <Link to="/panel/ventas" className="btn btn-secondary">Nueva venta</Link>
          <button type="button" disabled={downloading} onClick={handleDownload} className="btn btn-secondary"><Download size={16}/> {downloading ? "Descargando..." : "Descargar PDF"}</button>
          <button type="button" onClick={() => window.print()} className="btn btn-primary"><Printer size={16}/> Imprimir ticket</button>
        </div>
      </div>
      <Notice message={error}/>
      <section className="panel overflow-hidden border-t-4 border-t-brand-500 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-3 text-2xl font-extrabold"><span className="section-icon"><ReceiptText size={21}/></span> Detalle de venta</h1>
          <span className="badge badge-success"><CheckCircle2 size={14}/> Registrada</span>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">El stock ya se descontó en Firestore. Este registro no equivale a un comprobante fiscal.</p>
        <div className="mt-6 grid gap-5 rounded-xl border border-slate-100 bg-slate-50/80 p-5 text-sm sm:grid-cols-2">
          <div><p className="text-slate-500">N.º operación</p><p className="break-all font-semibold">{sale.id}</p></div>
          <div><p className="text-slate-500">Fecha</p><p className="font-medium">{sale.createdAt ? new Date(sale.createdAt).toLocaleString("es-PE") : "—"}</p></div>
          <div><p className="text-slate-500">Negocio</p><p className="font-medium">{session.business.name}</p></div>
          <div><p className="text-slate-500">Cajero</p><p className="font-medium">{sale.cashierName}</p></div>
          <div><p className="text-slate-500">Cliente</p><p className="font-medium">{sale.customerName || "Consumidor final"}</p>{sale.customerDocumentNumber && <p className="text-xs text-slate-400">{sale.customerDocumentType?.toUpperCase()} {sale.customerDocumentNumber}</p>}</div>
        </div>
        <div className="mt-7 overflow-x-auto rounded-xl border border-slate-200">
          <table className="data-table min-w-[490px]">
            <thead><tr><th className="p-3">Producto</th><th className="p-3">Cant.</th><th className="p-3">Unitario</th><th className="p-3">Subtotal</th></tr></thead>
            <tbody>{(sale.items || []).map(item => <tr key={item.sku}>
              <td className="p-3">{item.name}<p className="text-xs text-slate-500">{item.sku}</p></td>
              <td className="p-3">{item.quantity}</td><td className="p-3">{moneyFromCents(item.unitPriceCents)}</td><td className="p-3 font-medium">{moneyFromCents(item.lineTotalCents)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="mt-6 ml-auto max-w-xs space-y-3">
          <div className="flex justify-between text-sm"><span className="text-slate-400">Método</span><span>{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</span></div>
          {sale.paymentMethod === "cash" && <>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Recibido</span><span>{moneyFromCents(sale.receivedCents)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Vuelto</span><span>{moneyFromCents(sale.changeCents)}</span></div>
          </>}
          <div className="flex items-center justify-between rounded-xl bg-brand-50 p-4 text-lg font-extrabold"><span className="text-sm text-brand-700">Total</span><span className="text-brand-700">{moneyFromCents(sale.totalCents)}</span></div>
        </div>
      </section>

      <div id="sale-print-receipt" className="hidden" aria-label="Ticket interno para impresión">
        <h2 className="text-center text-xl font-bold">{session.business.name}</h2>
        <p className="text-center text-sm">TICKET INTERNO — NO VÁLIDO COMO COMPROBANTE SUNAT</p>
        <hr/>
        <p>Operación: {sale.id.slice(0, 8).toUpperCase()}</p>
        <p>Fecha: {sale.createdAt ? new Date(sale.createdAt).toLocaleString("es-PE") : "—"}</p>
        <p>Cajero: {sale.cashierName}</p>
        <p>Cliente: {sale.customerName || "Consumidor final"}</p>
        <hr/>
        {(sale.items || []).map(item => <div key={item.sku} className="sale-print-item">
          <p>{item.name} ({item.sku})</p>
          <p>{item.quantity} x {moneyFromCents(item.unitPriceCents)} = {moneyFromCents(item.lineTotalCents)}</p>
        </div>)}
        <hr/>
        <p className="sale-print-total">TOTAL: {moneyFromCents(sale.totalCents)}</p>
        <p>Pago declarado: {paymentLabels[sale.paymentMethod] || sale.paymentMethod}</p>
        {sale.paymentMethod === "cash" && <>
          <p>Recibido: {moneyFromCents(sale.receivedCents)}</p>
          <p>Vuelto: {moneyFromCents(sale.changeCents)}</p>
        </>}
        <p className="mt-5 text-center">Gracias por su compra</p>
      </div>
    </div>
  );
}
