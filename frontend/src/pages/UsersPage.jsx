import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus, Search, RotateCcw, Shield, ShieldOff, Send, UserCog } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Notice from "../components/ui/Notice";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";

const input = "field";
const roles = { admin: "Administrador", cashier: "Cajero", warehouse: "Almacén" };
const initial = { name: "", email: "", role: "cashier" };

export default function UsersPage() {
  const { session } = useAuth();
  const publicDemo = session.user.publicDemo === true;
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initial);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const reload = useCallback(async () => {
    const result = await api("/api/team");
    setUsers(result.users);
  }, []);

  useEffect(() => {
    let alive = true;
    api("/api/team").then(r => { if (alive) setUsers(r.users); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => users.filter(u =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query.toLowerCase())
  ), [query, users]);

  async function invite(e) {
    e.preventDefault();
    setBusy(true); setError(""); setSuccess("");
    try {
      const r = await api("/api/team/invite", { method: "POST", body: form });
      setSuccess(r.message); setOpen(false); setForm(initial);
    } catch (e) {
      setError(e.message);
    } finally {
      await reload().catch(() => {});
      setBusy(false);
    }
  }

  async function changeRole(user, role) {
    if (user.role === role) return;
    if (!window.confirm(`¿Cambiar rol de ${user.name} a ${roles[role]}?`)) return;
    setError(""); setSuccess(""); setBusy(true);
    try {
      const r = await api(`/api/team/${encodeURIComponent(user.uid)}/role`, {
        method: "PATCH", body: { role },
      });
      setSuccess(r.message); await reload();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function changeStatus(user) {
    const next = !user.active;
    if (!window.confirm(`¿${next ? "Reactivar" : "Desactivar"} a ${user.name}?`)) return;
    setError(""); setSuccess(""); setBusy(true);
    try {
      const r = await api(`/api/team/${encodeURIComponent(user.uid)}/status`, {
        method: "PATCH", body: { active: next },
      });
      setSuccess(r.message);
    } catch (e) { setError(e.message); }
    finally { await reload().catch(() => {}); setBusy(false); }
  }

  async function resend(user) {
    if (!window.confirm(`¿Reenviar invitación a ${user.email}?`)) return;
    setError(""); setSuccess(""); setBusy(true);
    try {
      const r = await api(`/api/team/${encodeURIComponent(user.uid)}/resend`, { method: "POST" });
      setSuccess(r.message);
    } catch (e) { setError(e.message); }
    finally { await reload().catch(() => {}); setBusy(false); }
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Un gran negocio, un gran equipo" title="Equipo y permisos" description="Invita trabajadores y administra sus permisos sin compartir contraseñas.">
      <button disabled={publicDemo} onClick={() => { setOpen(v => !v); setError(""); }} className="btn btn-primary" aria-expanded={open}>
        <UserPlus size={18}/> Invitar trabajador
      </button>
    </PageHeader>
    <Notice message={error}/><Notice message={success} type="success"/>

    {open && <section className="panel page-enter border-brand-200 p-5 md:p-6">
      <h2 className="panel-title mb-5"><span className="section-icon"><Send size={18}/></span>Enviar invitación por correo</h2>
      <form onSubmit={invite} className="grid gap-4 md:grid-cols-3">
        <label className="field-label space-y-2">Nombre
          <input required minLength={2} maxLength={100} className={input} value={form.name}
            onChange={e => setForm(v => ({ ...v, name: e.target.value }))}/>
        </label>
        <label className="field-label space-y-2">Correo electrónico
          <input required type="email" maxLength={254} className={input} value={form.email}
            onChange={e => setForm(v => ({ ...v, email: e.target.value }))}/>
        </label>
        <label className="field-label space-y-2">Rol
          <select className={input} value={form.role} onChange={e => setForm(v => ({ ...v, role: e.target.value }))}>
            <option value="cashier">Cajero</option><option value="warehouse">Almacén</option>
          </select>
        </label>
        <div className="md:col-span-3 flex flex-wrap gap-3">
          <button disabled={busy} className="btn btn-primary">
            <Send size={17}/> {busy ? "Enviando..." : "Crear y enviar invitación"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">Cancelar</button>
        </div>
      </form>
      <p className="mt-4 text-xs text-slate-400">Necesitas SMTP configurado en el backend. El trabajador establece su contraseña desde el correo.</p>
    </section>}

    <section className="panel overflow-hidden">
      <div className="panel-heading">
        <h2 className="panel-title"><UserCog size={18}/> Trabajadores <span className="badge badge-neutral">{users.length}</span></h2>
        <label className="search-field w-full sm:w-72">
          <Search size={17}/>
          <input className="w-full" aria-label="Buscar trabajadores" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar nombre o correo"/>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[790px]">
          <thead>
            <tr><th className="px-5 py-4">Trabajador</th><th className="px-4 py-4">Rol</th><th className="px-4 py-4">Estado</th><th className="px-4 py-4">Invitación</th><th className="px-5 py-4 text-right">Acciones</th></tr>
          </thead>
          <tbody>
            {filtered.map(user => {
              const protectedUser = publicDemo || user.role === "admin" || user.uid === session.user.uid;
              return <tr key={user.uid}>
                <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="section-icon size-9 rounded-full text-xs font-bold">{user.name?.charAt(0)?.toUpperCase()}</span><div><p className="font-semibold">{user.name}</p><p className="mt-1 text-[11px] font-normal text-slate-400">{user.email}</p></div></div></td>
                <td className="px-4 py-4">{protectedUser ? <span className="badge badge-neutral"><Shield size={13}/>{roles[user.role] || user.role}</span> :
                  <select disabled={busy || !user.active} aria-label={`Rol de ${user.name}`} className="field min-h-9 py-2 text-xs"
                    value={user.role} onChange={e => changeRole(user, e.target.value)}>
                    <option value="cashier">Cajero</option><option value="warehouse">Almacén</option>
                  </select>}
                </td>
                <td className="px-4 py-4"><span className={`badge ${user.active ? "badge-success" : "badge-danger"}`}>{user.active ? "Activo" : "Desactivado"}</span></td>
                <td className="px-4 py-4 text-xs text-slate-400">{user.hasSignedIn ? "Ya inició sesión" : user.inviteStatus === "sent" ? "Enviada" : user.inviteStatus === "delivery_failed" ? "Error de envío" : "—"}</td>
                <td className="px-5 py-4"><div className="flex justify-end gap-2">
                  {!protectedUser && user.active && !user.hasSignedIn && ["pending", "sent", "delivery_failed"].includes(user.inviteStatus) &&
                    <button title="Reenviar invitación" aria-label={`Reenviar a ${user.name}`} disabled={busy} onClick={() => resend(user)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50"><RotateCcw size={18}/></button>}
                  {!protectedUser && <button title={user.active ? "Desactivar" : "Reactivar"} aria-label={`${user.active ? "Desactivar" : "Reactivar"} ${user.name}`}
                    disabled={busy} onClick={() => changeStatus(user)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    {user.active ? <ShieldOff size={18}/> : <UserCog size={18}/>}
                  </button>}
                </div></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {!loading && filtered.length === 0 && <EmptyState icon={UserCog} title="No se encontraron trabajadores" description="Invita a tu equipo o prueba con otro término de búsqueda."/>}
      {loading && <EmptyState loading title="Cargando usuarios..."/>}
    </section>
  </div>;
}
