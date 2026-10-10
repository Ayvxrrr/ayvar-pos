import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer, ReceiptText, CheckCircle2, Download } from "lucide-react";
import { api, moneyFromCents } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Notice from "../components/ui/Notice";
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

  if (loading) return <p className="p-8 text-slate-400">Cargando comprobante interno...</p>;
  if (!sale) return <Notice message={error || "Venta no encontrada."}/>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/panel/ventas/historial" className="inline-flex items-center gap-2 text-slate-300 hover:text-white"><ArrowLeft size={18}/> Historial</Link>
        <div className="flex gap-3">
          <Link to="/panel/ventas" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800">Nueva venta</Link>
          <button type="button" disabled={downloading} onClick={handleDownload} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"><Download size={17}/> {downloading ? "Descargando..." : "Descargar PDF"}</button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500"><Printer size={17}/> Imprimir ticket</button>
        </div>
      </div>
      <Notice message={error}/>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><ReceiptText className="text-blue-400"/> Detalle de venta</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400"><CheckCircle2 size={16}/> Registrada</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">El stock ya se descontó en Firestore. Este registro no equivale a un comprobante fiscal.</p>
        <div className="mt-6 grid gap-4 border-t border-slate-800 pt-5 text-sm sm:grid-cols-2">
          <div><p className="text-slate-500">N.º operación</p><p className="break-all font-semibold">{sale.id}</p></div>
          <div><p className="text-slate-500">Fecha</p><p className="font-medium">{sale.createdAt ? new Date(sale.createdAt).toLocaleString("es-PE") : "—"}</p></div>
          <div><p className="text-slate-500">Negocio</p><p className="font-medium">{session.business.name}</p></div>
          <div><p className="text-slate-500">Cajero</p><p className="font-medium">{sale.cashierName}</p></div>
          <div><p className="text-slate-500">Cliente</p><p className="font-medium">{sale.customerName || "Consumidor final"}</p>{sale.customerDocumentNumber && <p className="text-xs text-slate-400">{sale.customerDocumentType?.toUpperCase()} {sale.customerDocumentNumber}</p>}</div>
        </div>
        <div className="mt-7 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[490px] text-left text-sm">
            <thead className="bg-slate-800/60 text-slate-400"><tr><th className="p-3">Producto</th><th className="p-3">Cant.</th><th className="p-3">Unitario</th><th className="p-3">Subtotal</th></tr></thead>
            <tbody>{(sale.items || []).map(item => <tr key={item.sku} className="border-t border-slate-800">
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
          <div className="flex justify-between border-t border-slate-700 pt-4 text-lg font-bold"><span>Total</span><span className="text-emerald-400">{moneyFromCents(sale.totalCents)}</span></div>
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
