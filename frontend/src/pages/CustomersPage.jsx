import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Pencil, UserRound, History, UserX, RotateCcw, X } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Notice from "../components/ui/Notice";
import PageHeader from "../components/ui/PageHeader";

const empty = { name: "", documentType: "none", documentNumber: "", phone: "", email: "", address: "" };
const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500";
const labelClass = "block space-y-1.5 text-sm text-slate-300";

export default function CustomersPage() {
  const { session } = useAuth();
  const isAdmin = session.user.role === "admin";
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function reload() {
    const result = await api("/api/customers");
    setCustomers(result.customers);
  }
  useEffect(() => {
    let active = true;
    api("/api/customers").then(result => { if (active) setCustomers(result.customers); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => customers.filter(customer =>
    [customer.name, customer.documentNumber, customer.phone, customer.email]
      .join(" ").toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"))
  ), [customers, query]);

  function startNew() {
    setForm({ ...empty }); setEditingId(null); setFormOpen(true); setError(""); setNotice("");
  }
  function startEdit(customer) {
    setForm({ name: customer.name || "", documentType: customer.documentType || "none",
      documentNumber: customer.documentNumber || "", phone: customer.phone || "",
      email: customer.email || "", address: customer.address || "" });
    setEditingId(customer.id); setFormOpen(true); setError(""); setNotice("");
  }
  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value,
      ...(field === "documentType" && value === "none" ? { documentNumber: "" } : {}),
    }));
  }

  async function save(event) {
    event.preventDefault();
    setError(""); setNotice(""); setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), documentNumber: form.documentNumber.trim(),
        phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim() };
      if (editingId) {
        await api(`/api/customers/${editingId}`, { method: "PUT", body: payload });
      } else {
        await api("/api/customers", { method: "POST", body: payload });
      }
      await reload();
      setNotice(editingId ? "Cliente actualizado." : "Cliente registrado correctamente.");
      setFormOpen(false); setEditingId(null); setForm(empty);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function toggleActive(customer) {
    if (!isAdmin) return;
    if (!window.confirm(`¿${customer.active ? "Desactivar" : "Reactivar"} a ${customer.name}?`)) return;
    setError(""); setNotice("");
    try {
      await api(`/api/customers/${customer.id}${customer.active ? "" : "/restore"}`, {
        method: customer.active ? "DELETE" : "PATCH",
      });
      await reload();
      setNotice(customer.active ? "Cliente desactivado; sus compras se conservan." : "Cliente reactivado.");
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Clientes" description="Registro, actualización e historial comercial por cliente." />
        <button onClick={startNew} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500">
          <Plus size={17}/> Nuevo cliente
        </button>
      </div>
      <Notice message={error}/><Notice message={notice} type="success"/>

      {formOpen && <section className="rounded-2xl border border-blue-500/30 bg-slate-900 p-5 md:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{editingId ? "Editar cliente" : "Registrar cliente"}</h2>
          <button aria-label="Cerrar formulario" type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-lg p-2 hover:bg-slate-800"><X size={19}/></button>
        </div>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Nombre / Razón social *
            <input className={inputClass} maxLength={120} minLength={2} required value={form.name} onChange={e => update("name", e.target.value)}/>
          </label>
          <label className={labelClass}>Tipo de documento
            <select className={inputClass} value={form.documentType} onChange={e => update("documentType", e.target.value)}>
              <option value="none">Sin documento</option><option value="dni">DNI</option><option value="ruc">RUC</option>
            </select>
          </label>
          <label className={labelClass}>Número de documento
            <input className={inputClass} disabled={form.documentType === "none"} inputMode="numeric" maxLength={form.documentType === "dni" ? 8 : 11}
              value={form.documentNumber} onChange={e => update("documentNumber", e.target.value)} placeholder="Opcional si no hay documento"/>
          </label>
          <label className={labelClass}>Teléfono
            <input className={inputClass} maxLength={25} value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="Opcional"/>
          </label>
          <label className={labelClass}>Correo electrónico
            <input className={inputClass} type="email" maxLength={150} value={form.email} onChange={e => update("email", e.target.value)} placeholder="Opcional"/>
          </label>
          <label className={labelClass}>Dirección
            <input className={inputClass} maxLength={250} value={form.address} onChange={e => update("address", e.target.value)} placeholder="Opcional"/>
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar cliente"}</button>
            <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-700 px-5 py-3 text-sm hover:bg-slate-800">Cancelar</button>
          </div>
        </form>
      </section>}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
          <h2 className="flex items-center gap-2 font-semibold"><UserRound size={20} className="text-blue-400"/> Clientes ({filtered.length})</h2>
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-400">
            <Search size={17}/><input aria-label="Buscar cliente" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre, DNI, RUC, correo..." className="w-64 max-w-[60vw] bg-transparent py-2.5 text-sm text-white outline-none" />
          </label>
        </div>
        {loading ? <p className="p-6 text-slate-400">Cargando clientes...</p> : filtered.length === 0 ?
          <p className="p-8 text-center text-slate-400">Todavía no hay clientes que coincidan con la búsqueda.</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400"><tr><th className="p-4">Cliente</th><th className="p-4">Documento</th><th className="p-4">Contacto</th><th className="p-4">Estado</th><th className="p-4">Acciones</th></tr></thead>
            <tbody>{filtered.map(customer => <tr key={customer.id} className="border-t border-slate-800 hover:bg-slate-800/30">
              <td className="p-4 font-medium">{customer.name}</td>
              <td className="p-4 text-slate-300">{customer.documentNumber ? `${customer.documentType.toUpperCase()} ${customer.documentNumber}` : "—"}</td>
              <td className="p-4 text-slate-300"><p>{customer.phone || "—"}</p><p className="text-xs text-slate-500">{customer.email}</p></td>
              <td className="p-4"><span className={customer.active ? "text-emerald-400" : "text-amber-400"}>{customer.active ? "Activo" : "Inactivo"}</span></td>
              <td className="p-4"><div className="flex flex-wrap items-center gap-3">
                <Link title="Historial de compras" aria-label={`Historial de ${customer.name}`} to={`/panel/clientes/${customer.id}`} className="text-blue-400 hover:text-blue-300"><History size={19}/></Link>
                {customer.active && <button title="Editar" aria-label={`Editar ${customer.name}`} onClick={() => startEdit(customer)} className="text-slate-300 hover:text-white"><Pencil size={18}/></button>}
                {isAdmin && <button title={customer.active ? "Desactivar" : "Reactivar"} aria-label={`${customer.active ? "Desactivar" : "Reactivar"} ${customer.name}`} onClick={() => toggleActive(customer)} className="text-amber-400 hover:text-amber-300">
                  {customer.active ? <UserX size={18}/> : <RotateCcw size={18}/>}</button>}
              </div></td>
            </tr>)}</tbody>
          </table></div>}
      </section>
      <p className="text-xs text-slate-500">Esta versión muestra hasta 200 clientes del negocio. Los documentos personales deben tratarse de forma privada.</p>
    </div>
  );
}
