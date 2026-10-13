import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { api } from "../services/api";
import Notice from "../components/ui/Notice";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";

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
    <PageHeader eyebrow="Visibilidad para tu negocio" title="Auditoría" description="Un registro claro de los últimos 100 cambios administrativos de tu equipo." />
    <Notice message={error}/>
    <section className="panel overflow-hidden">
      <div className="panel-heading">
        <h2 className="panel-title"><ClipboardList size={18}/>Historial administrativo <span className="badge badge-neutral">{filtered.length}</span></h2>
        <label className="search-field w-full sm:w-72"><Search size={17}/>
          <input aria-label="Filtrar eventos" value={query} onChange={e => setQuery(e.target.value)} placeholder="Filtrar eventos" className="w-full"/>
        </label>
      </div>
      <div className="overflow-x-auto"><table className="data-table min-w-[740px]">
        <thead><tr><th className="px-5 py-4">Fecha (Perú)</th><th className="px-4 py-4">Acción</th><th className="px-4 py-4">Responsable</th><th className="px-5 py-4">Destino / Cambios</th></tr></thead>
        <tbody>{filtered.map(e =>
          <tr key={e.id} className="align-top">
            <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{dateFmt(e.createdAt)}</td>
            <td className="px-4 py-4 font-medium">{descriptions[e.action] || e.action}</td>
            <td className="px-4 py-4 text-xs text-slate-500"><span className="badge badge-neutral">{e.actorRole}</span><p className="mt-2 font-mono text-[10px]">{e.actorId?.slice(0, 14)}...</p></td>
            <td className="px-5 py-4 text-xs text-slate-500"><p className="break-all">{e.targetType} · {e.targetId}</p>
              {Object.keys(e.details || {}).length > 0 && <p className="mt-2 break-all rounded-lg bg-slate-50 p-2 font-mono text-[10px]">{JSON.stringify(e.details)}</p>}
            </td>
          </tr>
        )}</tbody>
      </table>
      </div>
      {loading && <EmptyState loading title="Cargando auditoría..."/>}
      {!loading && filtered.length === 0 && <EmptyState icon={ClipboardList} title="No hay eventos que coincidan" description="Los cambios administrativos se mostrarán en este espacio."/>}
    </section>
    <p className="text-xs text-slate-500">Esta bitácora registra acciones de usuarios y configuración desde la fase 8. Las ventas anteriores mantienen su historial de ventas e inventario. Una auditoría resistente a manipulaciones requiere almacenamiento y controles adicionales.</p>
  </div>;
}
