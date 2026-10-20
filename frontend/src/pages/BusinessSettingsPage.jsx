import { useEffect, useState } from "react";
import { Save, Store, Info, ReceiptText } from "lucide-react";
import { api } from "../services/api";
import Notice from "../components/ui/Notice";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { useAuth } from "../context/AuthContext";

const fields = [
  { key: "name", label: "Nombre comercial", maxLength: 120, required: true },
  { key: "phone", label: "Teléfono del negocio", maxLength: 25 },
  { key: "address", label: "Dirección", maxLength: 200 },
  { key: "taxId", label: "RUC (opcional, solo formato)", maxLength: 11 },
];
const inputClass = "field";

export default function BusinessSettingsPage() {
  const { session } = useAuth();
  const publicDemo = session.user.publicDemo === true;
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let alive = true;
    api("/api/settings").then(r => { if (alive) setForm(r.settings); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  async function save(e) {
    e.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const { name, phone, address, taxId, receiptFooter } = form;
      const result = await api("/api/settings", {
        method: "PUT", body: { name, phone, address, taxId, receiptFooter },
      });
      setNotice(`${result.message} Recarga la página para actualizar el nombre del negocio en el encabezado.`);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Hazlo tuyo" title="Configuración del negocio" description="La identidad de tu tienda, presente en cada detalle." />
    <Notice message={error}/><Notice message={notice} type="success"/>
    {loading && <div className="panel"><EmptyState loading title="Cargando configuración..."/></div>}
    {form && <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"><form onSubmit={save} className="panel min-w-0 space-y-6 p-5 md:p-6">
      <div className="flex items-center gap-3"><span className="section-icon"><Store size={20}/></span><div><h2 className="panel-title">Datos de la empresa</h2><p className="mt-1 text-xs text-slate-400">Información que identifica a tu negocio.</p></div></div>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(field => <label key={field.key} className="field-label space-y-2">{field.label}{field.required && " *"}
          <input className={inputClass} disabled={publicDemo} required={field.required} maxLength={field.maxLength}
            value={form[field.key] || ""} onChange={e => setForm(v => ({ ...v, [field.key]: e.target.value }))}/>
        </label>)}
        <label className="field-label space-y-2">Moneda
          <input className={`${inputClass} opacity-60`} disabled value={form.currency || "PEN"}/>
          <p className="text-xs text-slate-500">No se cambia para evitar mezclar importes históricos de monedas distintas.</p>
        </label>
      </div>
      <label className="field-label space-y-2 border-t border-slate-100 pt-5">Mensaje de agradecimiento para tickets
        <textarea className={inputClass} disabled={publicDemo} rows={3} maxLength={220} value={form.receiptFooter || ""}
          onChange={e => setForm(v => ({ ...v, receiptFooter: e.target.value }))} placeholder="Gracias por su compra"/>
      </label>
      <div className="flex gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-xs leading-relaxed text-slate-500">
        <Info size={18} className="shrink-0 text-brand-600"/><p>El RUC solo se valida por longitud, no se consulta SUNAT. Estos datos no convierten el ticket interno en comprobante electrónico válido.</p>
      </div>
      <button disabled={saving || publicDemo} className="btn btn-primary"><Save size={17}/>{saving ? "Guardando..." : publicDemo ? "Solo lectura en la demo pública" : "Guardar configuración"}</button>
    </form>
    <aside className="panel overflow-hidden">
      <div className="panel-heading"><h2 className="panel-title"><ReceiptText size={18}/> Tu identidad comercial</h2></div>
      <div className="bg-slate-50 p-5">
        <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Vista previa de los datos</p>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <Store size={28} className="mx-auto mb-4 text-brand-600" strokeWidth={1.5}/>
          <p className="break-words text-base font-extrabold tracking-tight">{form.name || "Tu negocio"}</p>
          <div className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-slate-500">
            {form.address && <p className="break-words">{form.address}</p>}
            {form.phone && <p>{form.phone}</p>}
            {form.taxId && <p>RUC: {form.taxId}</p>}
          </div>
          <div className="my-6 space-y-3 border-y border-dashed border-slate-200 py-5" aria-hidden="true"><div className="flex justify-between gap-8"><span className="h-2 w-24 rounded bg-slate-100"/><span className="h-2 w-8 rounded bg-slate-100"/></div><div className="h-2 w-20 rounded bg-slate-100"/><div className="h-2 w-28 rounded bg-slate-100"/></div>
          <p className="break-words text-xs font-semibold text-brand-700">{form.receiptFooter || "Gracias por su compra"}</p>
          <p className="mt-5 text-[8px] tracking-[.16em] text-slate-400">AYVAR POS · TICKET INTERNO</p>
        </div>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">Guarda los cambios para actualizar la información de tu negocio.</p>
      </div>
    </aside></div>}
  </div>;
}
