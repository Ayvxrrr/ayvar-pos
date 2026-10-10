import { useEffect, useMemo, useState } from "react";
import { PackagePlus, Pencil, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, centsFromMoney, moneyFromCents } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import Notice from "../components/ui/Notice";

const emptyForm = {
  sku: "", name: "", categoryId: "", price: "", cost: "",
  minStock: "5", initialStock: "0",
};
const classes = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500";

export default function ProductsPage() {
  const { session } = useAuth();
  const canEdit = ["admin", "warehouse"].includes(session.user.role);
  const isAdmin = session.user.role === "admin";
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingSku, setEditingSku] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function reload() {
    const [productsData, categoriesData] = await Promise.all([
      api("/api/products"), api("/api/categories"),
    ]);
    setProducts(productsData.products);
    setCategories(categoriesData.categories);
  }

  useEffect(() => {
    reload().catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  function setField(key, value) { setForm(f => ({ ...f, [key]: value })); }
  function cancel() { setEditingSku(null); setForm(emptyForm); }
  function edit(product) {
    setEditingSku(product.sku);
    setForm({ sku: product.sku, name: product.name, categoryId: product.categoryId,
      price: (product.priceCents / 100).toFixed(2),
      cost: (product.costCents / 100).toFixed(2),
      minStock: String(product.minStock), initialStock: "0" });
    setError(""); setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      const body = {
        name: form.name, categoryId: form.categoryId,
        priceCents: centsFromMoney(form.price),
        costCents: centsFromMoney(form.cost),
        minStock: Number(form.minStock),
      };
      if (!editingSku) {
        body.sku = form.sku.trim().toUpperCase();
        body.initialStock = Number(form.initialStock);
      }
      const wasEditing = Boolean(editingSku);
      await api(wasEditing ? `/api/products/${encodeURIComponent(editingSku)}` : "/api/products", {
        method: wasEditing ? "PUT" : "POST", body,
      });
      await reload(); cancel();
      setSuccess(wasEditing ? "Producto actualizado." : "Producto registrado.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function toggle(product) {
    const action = product.active ? "desactivar" : "reactivar";
    if (!window.confirm(`¿Quieres ${action} «${product.name}»?`)) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await api(`/api/products/${encodeURIComponent(product.sku)}${product.active ? "" : "/restore"}`, {
        method: product.active ? "DELETE" : "PATCH",
      });
      await reload(); setSuccess(`Producto ${product.active ? "desactivado" : "reactivado"}.`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const categoryNames = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c.name])), [categories]);
  const filtered = products.filter(p => {
    const matchesStatus = status === "all" || (status === "active" ? p.active : !p.active);
    const haystack = `${p.name} ${p.sku} ${categoryNames[p.categoryId] || ""}`.toLocaleLowerCase("es");
    return matchesStatus && haystack.includes(query.toLocaleLowerCase("es"));
  });
  const activeCategories = categories.filter(c => c.active);

  return (
    <div>
      <PageHeader title="Productos" description="Registra artículos, consulta existencias y administra precios." />
      <Notice message={error} />
      <Notice message={success} type="success" />
      {canEdit && <form onSubmit={save} className="mb-7 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold">{editingSku ? `Editar ${editingSku}` : "Registrar producto"}</h2>
          {editingSku && <button type="button" onClick={cancel} className="flex items-center gap-1 text-sm text-slate-400"><X size={16}/> Cancelar</button>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm text-slate-300">Código SKU *
            <input required value={form.sku} disabled={Boolean(editingSku)} maxLength={40}
              onChange={e=>setField("sku",e.target.value.toUpperCase())} placeholder="TEC-001" className={classes+" disabled:opacity-50"}/>
          </label>
          <label className="text-sm text-slate-300">Nombre *
            <input required minLength={2} maxLength={120} value={form.name} onChange={e=>setField("name",e.target.value)}
              placeholder="Mouse inalámbrico" className={classes}/>
          </label>
          <label className="text-sm text-slate-300">Categoría *
            <select required value={form.categoryId} onChange={e=>setField("categoryId",e.target.value)} className={classes}>
              <option value="">Selecciona una categoría</option>
              {activeCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Precio de venta (S/) *
            <input type="text" inputMode="decimal" required value={form.price}
              onChange={e=>setField("price",e.target.value)} placeholder="45.00" className={classes}/>
          </label>
          <label className="text-sm text-slate-300">Costo unitario (S/) *
            <input type="text" inputMode="decimal" required value={form.cost}
              onChange={e=>setField("cost",e.target.value)} placeholder="28.00" className={classes}/>
          </label>
          <label className="text-sm text-slate-300">Stock mínimo *
            <input type="number" min="0" max="1000000" step="1" required value={form.minStock}
              onChange={e=>setField("minStock",e.target.value)} className={classes}/>
          </label>
          {!editingSku && <label className="text-sm text-slate-300">Stock inicial *
            <input type="number" min="0" max="1000000" step="1" required value={form.initialStock}
              onChange={e=>setField("initialStock",e.target.value)} className={classes}/>
          </label>}
        </div>
        <p className="mt-4 text-xs text-slate-400">Los ajustes posteriores de stock se harán desde Inventario y quedarán registrados.</p>
        <button disabled={busy || activeCategories.length === 0} className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500 disabled:opacity-50">
          <PackagePlus size={18} /> {busy ? "Guardando..." : editingSku ? "Guardar cambios" : "Registrar producto"}
        </button>
        {activeCategories.length === 0 && <p className="mt-2 text-sm text-amber-400">Antes debes crear una categoría activa.</p>}
      </form>}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
          <h2 className="font-semibold">Catálogo ({filtered.length})</h2>
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin || canEdit ? <select aria-label="Estado de productos" value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm">
              <option value="active">Activos</option><option value="inactive">Inactivos</option><option value="all">Todos</option>
            </select> : null}
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-400">
              <Search size={17}/><input aria-label="Buscar productos" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre, SKU o categoría" className="w-44 bg-transparent text-sm text-white outline-none" />
            </label>
          </div>
        </div>
        {loading ? <p className="p-6 text-slate-400">Cargando productos...</p> : filtered.length === 0
          ? <p className="p-6 text-slate-400">No hay productos para mostrar.</p>
          : <div className="overflow-x-auto"><table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-slate-800/60 text-slate-400"><tr>
              <th className="p-4">SKU / Producto</th><th className="p-4">Categoría</th>
              <th className="p-4">Precio</th><th className="p-4">Stock</th>
              <th className="p-4">Estado</th>{canEdit && <th className="p-4">Acciones</th>}
            </tr></thead>
            <tbody>{filtered.map(p=><tr key={p.id} className="border-t border-slate-800">
              <td className="p-4 font-medium">{p.name}<p className="text-xs font-normal text-slate-500">{p.sku}</p></td>
              <td className="p-4 text-slate-400">{categoryNames[p.categoryId] || p.categoryId}</td>
              <td className="p-4">{moneyFromCents(p.priceCents)}</td>
              <td className={`p-4 font-semibold ${p.stock <= p.minStock ? "text-amber-400" : "text-emerald-400"}`}>{p.stock} {p.stock <= p.minStock && <span className="text-xs">(bajo)</span>}</td>
              <td className="p-4">{p.active ? <span className="text-emerald-400">Activo</span> : <span className="text-amber-400">Inactivo</span>}</td>
              {canEdit && <td className="p-4"><div className="flex gap-3">
                {p.active && <button onClick={()=>edit(p)} aria-label={`Editar ${p.name}`} title="Editar" className="text-blue-400"><Pencil size={18}/></button>}
                {isAdmin && <button disabled={busy} onClick={()=>toggle(p)} aria-label={`${p.active ? "Desactivar" : "Reactivar"} ${p.name}`}
                  title={p.active ? "Desactivar" : "Reactivar"} className="text-slate-400 hover:text-white">
                  {p.active ? <Trash2 size={18}/> : <RotateCcw size={18}/>}</button>}
              </div></td>}
            </tr>)}</tbody>
          </table></div>}
      </section>
    </div>
  );
}
