import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus, Search, RotateCcw, Shield, ShieldOff, Send, UserCog } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Notice from "../components/ui/Notice";
import PageHeader from "../components/ui/PageHeader";

const input = "w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500";
const roles = { admin: "Administrador", cashier: "Cajero", warehouse: "Almacén" };
const initial = { name: "", email: "", role: "cashier" };

export default function UsersPage() {
  const { session } = useAuth();
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
    <div className="flex flex-wrap items-end justify-between gap-4">
      <PageHeader title="Equipo y permisos" description="Invita trabajadores y administra sus permisos sin compartir contraseñas." />
      <button onClick={() => { setOpen(v => !v); setError(""); }} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500">
        <UserPlus size={18}/> Invitar trabajador
      </button>
    </div>
    <Notice message={error}/><Notice message={success} type="success"/>

    {open && <section className="rounded-2xl border border-blue-500/30 bg-slate-900 p-5 md:p-7">
      <h2 className="mb-4 text-lg font-semibold">Enviar invitación por correo</h2>
      <form onSubmit={invite} className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm text-slate-300">Nombre
          <input required minLength={2} maxLength={100} className={input} value={form.name}
            onChange={e => setForm(v => ({ ...v, name: e.target.value }))}/>
        </label>
        <label className="space-y-2 text-sm text-slate-300">Correo electrónico
          <input required type="email" maxLength={254} className={input} value={form.email}
            onChange={e => setForm(v => ({ ...v, email: e.target.value }))}/>
        </label>
        <label className="space-y-2 text-sm text-slate-300">Rol
          <select className={input} value={form.role} onChange={e => setForm(v => ({ ...v, role: e.target.value }))}>
            <option value="cashier">Cajero</option><option value="warehouse">Almacén</option>
          </select>
        </label>
        <div className="md:col-span-3 flex flex-wrap gap-3">
          <button disabled={busy} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60">
            <Send size={17}/> {busy ? "Enviando..." : "Crear y enviar invitación"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-700 px-5 py-3 text-slate-300 hover:bg-slate-800">Cancelar</button>
        </div>
      </form>
      <p className="mt-4 text-xs text-slate-400">Necesitas SMTP configurado en el backend. El trabajador establece su contraseña desde el correo.</p>
    </section>}

    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
        <h2 className="font-semibold">Trabajadores ({users.length})</h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 text-slate-500" size={17}/>
          <input className={`${input} pl-10`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar nombre o correo"/>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[790px] text-left text-sm">
          <thead className="bg-slate-950/40 text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="px-5 py-4">Trabajador</th><th className="px-4 py-4">Rol</th><th className="px-4 py-4">Estado</th><th className="px-4 py-4">Invitación</th><th className="px-5 py-4 text-right">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map(user => {
              const protectedUser = user.role === "admin" || user.uid === session.user.uid;
              return <tr key={user.uid} className="hover:bg-slate-800/30">
                <td className="px-5 py-4"><p className="font-medium">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td>
                <td className="px-4 py-4">{protectedUser ? <span className="inline-flex items-center gap-1"><Shield size={14}/>{roles[user.role] || user.role}</span> :
                  <select disabled={busy || !user.active} aria-label={`Rol de ${user.name}`} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2"
                    value={user.role} onChange={e => changeRole(user, e.target.value)}>
                    <option value="cashier">Cajero</option><option value="warehouse">Almacén</option>
                  </select>}
                </td>
                <td className="px-4 py-4"><span className={user.active ? "text-emerald-400" : "text-red-400"}>{user.active ? "Activo" : "Desactivado"}</span></td>
                <td className="px-4 py-4 text-xs text-slate-400">{user.hasSignedIn ? "Ya inició sesión" : user.inviteStatus === "sent" ? "Enviada" : user.inviteStatus === "delivery_failed" ? "Error de envío" : "—"}</td>
                <td className="px-5 py-4"><div className="flex justify-end gap-2">
                  {!protectedUser && user.active && !user.hasSignedIn && ["pending", "sent", "delivery_failed"].includes(user.inviteStatus) &&
                    <button title="Reenviar invitación" aria-label={`Reenviar a ${user.name}`} disabled={busy} onClick={() => resend(user)} className="rounded-lg p-2 text-blue-400 hover:bg-blue-500/10"><RotateCcw size={18}/></button>}
                  {!protectedUser && <button title={user.active ? "Desactivar" : "Reactivar"} aria-label={`${user.active ? "Desactivar" : "Reactivar"} ${user.name}`}
                    disabled={busy} onClick={() => changeStatus(user)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800">
                    {user.active ? <ShieldOff size={18}/> : <UserCog size={18}/>}
                  </button>}
                </div></td>
              </tr>;
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <p className="p-8 text-center text-slate-400">No se encontraron trabajadores.</p>}
        {loading && <p className="p-8 text-center text-slate-400">Cargando usuarios...</p>}
      </div>
    </section>
  </div>;
}
