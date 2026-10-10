import { useEffect, useState } from "react";
import { Save, Store, Info } from "lucide-react";
import { api } from "../services/api";
import Notice from "../components/ui/Notice";
import PageHeader from "../components/ui/PageHeader";

const fields = [
  { key: "name", label: "Nombre comercial", maxLength: 120, required: true },
  { key: "phone", label: "Teléfono del negocio", maxLength: 25 },
  { key: "address", label: "Dirección", maxLength: 200 },
  { key: "taxId", label: "RUC (opcional, solo formato)", maxLength: 11 },
];
const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none focus:border-blue-500";

export default function BusinessSettingsPage() {
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
    <PageHeader title="Configuración del negocio" description="Administra la información comercial que utiliza Ayvar POS." />
    <Notice message={error}/><Notice message={notice} type="success"/>
    {loading && <p className="text-slate-400">Cargando configuración...</p>}
    {form && <form onSubmit={save} className="max-w-4xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-8">
      <div className="flex items-center gap-3"><Store className="text-blue-400"/><h2 className="text-lg font-semibold">Datos de la empresa</h2></div>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(field => <label key={field.key} className="space-y-2 text-sm text-slate-300">{field.label}
          <input className={inputClass} required={field.required} maxLength={field.maxLength}
            value={form[field.key] || ""} onChange={e => setForm(v => ({ ...v, [field.key]: e.target.value }))}/>
        </label>)}
        <label className="space-y-2 text-sm text-slate-300">Moneda
          <input className={`${inputClass} opacity-60`} disabled value={form.currency || "PEN"}/>
          <p className="text-xs text-slate-500">No se cambia para evitar mezclar importes históricos de monedas distintas.</p>
        </label>
      </div>
      <label className="block space-y-2 text-sm text-slate-300">Mensaje de agradecimiento para tickets
        <textarea className={inputClass} rows={3} maxLength={220} value={form.receiptFooter || ""}
          onChange={e => setForm(v => ({ ...v, receiptFooter: e.target.value }))} placeholder="Gracias por su compra"/>
      </label>
      <div className="flex gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-slate-400">
        <Info size={19} className="shrink-0 text-blue-400"/><p>El RUC solo se valida por longitud, no se consulta SUNAT. Estos datos no convierten el ticket interno en comprobante electrónico válido.</p>
      </div>
      <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"><Save size={17}/>{saving ? "Guardando..." : "Guardar configuración"}</button>
    </form>}
  </div>;
}
