import { useEffect, useState } from "react";
import { FolderPlus, Pencil, RotateCcw, Search, Trash2, X, Tags } from "lucide-react";
import { api } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import Notice from "../components/ui/Notice";
import EmptyState from "../components/ui/EmptyState";

const empty = { name: "", description: "" };

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function reload() {
    const data = await api("/api/categories");
    setCategories(data.categories);
  }
  useEffect(() => {
    reload().catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  function cancel() { setEditingId(null); setForm(empty); }
  function edit(category) {
    setEditingId(category.id);
    setForm({ name: category.name, description: category.description || "" });
    setError(""); setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      const wasEditing = Boolean(editingId);
      await api(wasEditing ? `/api/categories/${encodeURIComponent(editingId)}` : "/api/categories", {
        method: wasEditing ? "PUT" : "POST", body: form,
      });
      await reload(); cancel();
      setSuccess(wasEditing ? "Categoría actualizada." : "Categoría creada.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function toggle(category) {
    const action = category.active ? "desactivar" : "reactivar";
    if (!window.confirm(`¿Quieres ${action} «${category.name}»?`)) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await api(`/api/categories/${encodeURIComponent(category.id)}${category.active ? "" : "/restore"}`, {
        method: category.active ? "DELETE" : "PATCH",
      });
      await reload(); setSuccess(`Categoría ${category.active ? "desactivada" : "reactivada"}.`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const visible = categories.filter(c =>
    `${c.name} ${c.description}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"))
  );

  return (
    <div>
      <PageHeader eyebrow="Un catálogo bien organizado" title="Categorías" description="Dale orden a tu tienda. Agrupa tus artículos y encuéntralos más fácilmente." />
      <Notice message={error} />
      <Notice message={success} type="success" />
      <form onSubmit={save} className="panel mb-6 p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="panel-title"><span className="section-icon"><FolderPlus size={20}/></span>{editingId ? "Editar categoría" : "Nueva categoría"}</h2>
          {editingId && <button type="button" onClick={cancel} className="btn btn-ghost"><X size={16}/> Cancelar</button>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="field-label">Nombre *
            <input required minLength={2} maxLength={60} value={form.name}
              onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
              placeholder="Ej. Electrónica" className="field mt-2" />
          </label>
          <label className="field-label">Descripción
            <input maxLength={200} value={form.description}
              onChange={e => setForm(s => ({ ...s, description: e.target.value }))}
              placeholder="Artículos y accesorios" className="field mt-2" />
          </label>
        </div>
        <button disabled={busy} className="btn btn-primary mt-5">
          <FolderPlus size={18} /> {busy ? "Guardando..." : editingId ? "Guardar cambios" : "Crear categoría"}
        </button>
      </form>

      <section className="panel overflow-hidden">
        <div className="panel-heading">
          <h2 className="panel-title"><Tags size={18}/> Categorías registradas <span className="badge badge-neutral">{categories.length}</span></h2>
          <label className="search-field">
            <Search size={17}/><input aria-label="Buscar categorías" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar categoría..." className="w-40" />
          </label>
        </div>
        {loading ? <EmptyState loading title="Cargando categorías..."/> : visible.length === 0
          ? <EmptyState icon={Tags} title="No hay categorías para mostrar" description="Crea una categoría para empezar a organizar tus productos."/>
          : <div className="overflow-x-auto"><table className="data-table min-w-[620px]">
              <thead><tr><th>Categoría</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>{visible.map(c => <tr key={c.id}>
                <td><div className="flex items-center gap-3"><span className="section-icon size-9 rounded-lg"><Tags size={16}/></span><div>{c.name}<p className="mt-1 text-[10px] font-normal text-slate-400">{c.id}</p></div></div></td>
                <td className="text-slate-500">{c.description || "—"}</td>
                <td><span className={`badge ${c.active ? "badge-success" : "badge-warning"}`}>{c.active ? "Activa" : "Inactiva"}</span></td>
                <td className="p-4"><div className="flex gap-3">
                  {c.active && <button disabled={busy} title="Editar" aria-label={`Editar ${c.name}`} onClick={()=>edit(c)} className="text-brand-600"><Pencil size={17}/></button>}
                  <button disabled={busy} title={c.active ? "Desactivar" : "Reactivar"} aria-label={`${c.active ? "Desactivar" : "Reactivar"} ${c.name}`} onClick={()=>toggle(c)} className="text-slate-400 hover:text-rose-600">
                    {c.active ? <Trash2 size={18}/> : <RotateCcw size={18}/>}</button>
                </div></td>
              </tr>)}</tbody>
            </table></div>}
      </section>
    </div>
  );
}
