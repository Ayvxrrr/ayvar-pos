import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Pencil, UserRound, History, UserX, RotateCcw, X } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Notice from "../components/ui/Notice";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";

const empty = { name: "", documentType: "none", documentNumber: "", phone: "", email: "", address: "" };
const inputClass = "field";
const labelClass = "field-label space-y-2";

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
      <PageHeader eyebrow="Personas que eligen tu negocio" title="Clientes" description="Conoce a tus clientes y mantén su información e historial siempre a mano.">
        <button onClick={startNew} className="btn btn-primary">
          <Plus size={17}/> Nuevo cliente
        </button>
      </PageHeader>
      <Notice message={error}/><Notice message={notice} type="success"/>

      {formOpen && <section className="panel page-enter border-brand-200 p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="panel-title"><span className="section-icon"><UserRound size={20}/></span>{editingId ? "Editar cliente" : "Registrar cliente"}</h2>
          <button aria-label="Cerrar formulario" type="button" disabled={saving} onClick={() => setFormOpen(false)} className="icon-button"><X size={18}/></button>
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
          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5 sm:col-span-2">
            <button disabled={saving} className="btn btn-primary">{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar cliente"}</button>
            <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="btn btn-secondary">Cancelar</button>
          </div>
        </form>
      </section>}

      <section className="panel overflow-hidden">
        <div className="panel-heading">
          <h2 className="panel-title"><UserRound size={18}/> Clientes <span className="badge badge-neutral">{filtered.length}</span></h2>
          <label className="search-field">
            <Search size={17}/><input aria-label="Buscar cliente" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre, DNI, RUC, correo..." className="w-64 max-w-[60vw]" />
          </label>
        </div>
        {loading ? <EmptyState loading title="Cargando clientes..."/> : filtered.length === 0 ?
          <EmptyState icon={UserRound} title="Tus clientes, más cerca" description="Todavía no hay clientes que coincidan con la búsqueda. Registra uno o prueba con otro término."/> :
          <div className="overflow-x-auto"><table className="data-table min-w-[820px]">
            <thead><tr><th className="p-4">Cliente</th><th className="p-4">Documento</th><th className="p-4">Contacto</th><th className="p-4">Estado</th><th className="p-4">Acciones</th></tr></thead>
            <tbody>{filtered.map(customer => <tr key={customer.id}>
              <td className="p-4"><div className="flex items-center gap-3"><span className="section-icon size-9 rounded-full text-xs font-bold">{customer.name?.charAt(0)?.toUpperCase()}</span>{customer.name}</div></td>
              <td className="p-4 text-xs text-slate-500">{customer.documentNumber ? `${customer.documentType.toUpperCase()} ${customer.documentNumber}` : "—"}</td>
              <td className="p-4 text-slate-600"><p>{customer.phone || "—"}</p><p className="mt-1 text-[11px] text-slate-400">{customer.email}</p></td>
              <td className="p-4"><span className={`badge ${customer.active ? "badge-success" : "badge-warning"}`}>{customer.active ? "Activo" : "Inactivo"}</span></td>
              <td className="p-4"><div className="flex flex-wrap items-center gap-3">
                <Link title="Historial de compras" aria-label={`Historial de ${customer.name}`} to={`/panel/clientes/${customer.id}`} className="text-brand-600"><History size={18}/></Link>
                {customer.active && <button title="Editar" aria-label={`Editar ${customer.name}`} onClick={() => startEdit(customer)} className="text-slate-500 hover:text-brand-700"><Pencil size={17}/></button>}
                {isAdmin && <button title={customer.active ? "Desactivar" : "Reactivar"} aria-label={`${customer.active ? "Desactivar" : "Reactivar"} ${customer.name}`} onClick={() => toggleActive(customer)} className="text-slate-400 hover:text-rose-600">
                  {customer.active ? <UserX size={18}/> : <RotateCcw size={18}/>}</button>}
              </div></td>
            </tr>)}</tbody>
          </table></div>}
      </section>
      <p className="text-xs text-slate-500">Esta versión muestra hasta 200 clientes del negocio. Los documentos personales deben tratarse de forma privada.</p>
    </div>
  );
}
