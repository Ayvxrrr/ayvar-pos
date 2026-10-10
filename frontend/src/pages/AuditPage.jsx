import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { api } from "../services/api";
import Notice from "../components/ui/Notice";
import PageHeader from "../components/ui/PageHeader";

const descriptions = {
  "team.invited": "Invitó a un trabajador",
  "team.invite_resent": "Reenvió una invitación",
  "team.role_changed": "Cambió el rol de un trabajador",
  "team.disabled": "Desactivó una cuenta",
  "team.enabled": "Reactivó una cuenta",
  "business.settings_updated": "Actualizó datos del negocio",
};

export default function AuditPage() {
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    api("/api/audit").then(r => { if (alive) setEvents(r.events); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const filtered = useMemo(() => events.filter(e =>
    `${e.action} ${e.actorId} ${e.targetId}`.toLowerCase().includes(query.toLowerCase())
  ), [query, events]);
  const dateFmt = value => value ? new Date(value).toLocaleString("es-PE", { timeZone: "America/Lima" }) : "—";
  return <div className="space-y-6">
    <PageHeader title="Auditoría" description="Últimos 100 cambios administrativos realizados en este negocio." />
    <Notice message={error}/>
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
        <div className="flex items-center gap-2"><ClipboardList className="text-blue-400" size={20}/><h2 className="font-semibold">Historial administrativo</h2></div>
        <div className="relative w-full sm:w-72"><Search size={17} className="absolute left-3 top-3 text-slate-500"/>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filtrar eventos" className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-3 text-sm outline-none"/>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left text-sm">
        <thead className="bg-slate-950/40 text-slate-500"><tr><th className="px-5 py-4">Fecha (Perú)</th><th className="px-4 py-4">Acción</th><th className="px-4 py-4">Responsable</th><th className="px-5 py-4">Destino / Cambios</th></tr></thead>
        <tbody className="divide-y divide-slate-800">{filtered.map(e =>
          <tr key={e.id} className="align-top hover:bg-slate-800/30">
            <td className="whitespace-nowrap px-5 py-4 text-slate-400">{dateFmt(e.createdAt)}</td>
            <td className="px-4 py-4 font-medium">{descriptions[e.action] || e.action}</td>
            <td className="px-4 py-4 text-xs text-slate-400"><p>{e.actorRole}</p><p className="font-mono">{e.actorId?.slice(0, 14)}...</p></td>
            <td className="px-5 py-4 text-xs text-slate-400"><p className="break-all">{e.targetType} · {e.targetId}</p>
              {Object.keys(e.details || {}).length > 0 && <p className="mt-1 break-all">{JSON.stringify(e.details)}</p>}
            </td>
          </tr>
        )}</tbody>
      </table>
      {loading && <p className="p-8 text-center text-slate-400">Cargando auditoría...</p>}
      {!loading && filtered.length === 0 && <p className="p-8 text-center text-slate-400">No hay eventos que coincidan.</p>}
      </div>
    </section>
    <p className="text-xs text-slate-500">Esta bitácora registra acciones de usuarios y configuración desde la fase 8. Las ventas anteriores mantienen su historial de ventas e inventario. Una auditoría resistente a manipulaciones requiere almacenamiento y controles adicionales.</p>
  </div>;
}
