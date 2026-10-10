import { useEffect, useState } from "react";
import { FolderPlus, Pencil, RotateCcw, Search, Trash2, X } from "lucide-react";
import { api } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import Notice from "../components/ui/Notice";

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
      <PageHeader title="Categorías" description="Organiza los artículos de tu negocio por tipo." />
      <Notice message={error} />
      <Notice message={success} type="success" />
      <form onSubmit={save} className="mb-7 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-semibold">{editingId ? "Editar categoría" : "Nueva categoría"}</h2>
          {editingId && <button type="button" onClick={cancel} className="flex items-center gap-1 text-sm text-slate-400"><X size={16}/> Cancelar</button>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-300">Nombre *
            <input required minLength={2} maxLength={60} value={form.name}
              onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
              placeholder="Ej. Electrónica" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none focus:border-blue-500" />
          </label>
          <label className="text-sm text-slate-300">Descripción
            <input maxLength={200} value={form.description}
              onChange={e => setForm(s => ({ ...s, description: e.target.value }))}
              placeholder="Artículos y accesorios" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none focus:border-blue-500" />
          </label>
        </div>
        <button disabled={busy} className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500 disabled:opacity-50">
          <FolderPlus size={18} /> {busy ? "Guardando..." : editingId ? "Guardar cambios" : "Crear categoría"}
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-5">
          <h2 className="font-semibold">Categorías registradas ({categories.length})</h2>
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-400">
            <Search size={17}/><input aria-label="Buscar categorías" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar..." className="w-40 bg-transparent text-sm text-white outline-none" />
          </label>
        </div>
        {loading ? <p className="p-6 text-slate-400">Cargando categorías...</p> : visible.length === 0
          ? <p className="p-6 text-slate-400">No hay categorías para mostrar.</p>
          : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-slate-400"><tr><th className="p-4">Categoría</th><th className="p-4">Descripción</th><th className="p-4">Estado</th><th className="p-4">Acciones</th></tr></thead>
              <tbody>{visible.map(c => <tr key={c.id} className="border-t border-slate-800">
                <td className="p-4 font-medium">{c.name}<p className="text-xs font-normal text-slate-500">{c.id}</p></td>
                <td className="p-4 text-slate-400">{c.description || "—"}</td>
                <td className="p-4">{c.active ? <span className="text-emerald-400">Activa</span> : <span className="text-amber-400">Inactiva</span>}</td>
                <td className="p-4"><div className="flex gap-3">
                  {c.active && <button disabled={busy} title="Editar" onClick={()=>edit(c)} className="text-blue-400"><Pencil size={18}/></button>}
                  <button disabled={busy} title={c.active ? "Desactivar" : "Reactivar"} onClick={()=>toggle(c)} className="text-slate-400 hover:text-white">
                    {c.active ? <Trash2 size={18}/> : <RotateCcw size={18}/>}</button>
                </div></td>
              </tr>)}</tbody>
            </table></div>}
      </section>
    </div>
  );
}
