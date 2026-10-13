import { useEffect, useMemo, useState } from "react";
import { Package, PackagePlus, Pencil, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, centsFromMoney, moneyFromCents } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import Notice from "../components/ui/Notice";
import EmptyState from "../components/ui/EmptyState";

const emptyForm = {
  sku: "", name: "", categoryId: "", price: "", cost: "",
  minStock: "5", initialStock: "0",
};
const classes = "field mt-2";

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
      <PageHeader eyebrow="Catálogo de tu tienda" title="Productos" description="Cada artículo, en su lugar. Administra tus productos, precios y existencias." />
      <Notice message={error} />
      <Notice message={success} type="success" />
      {canEdit && <form onSubmit={save} className="panel mb-6 p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="panel-title"><span className="section-icon"><PackagePlus size={20}/></span>{editingSku ? `Editar ${editingSku}` : "Registrar producto"}</h2>
          {editingSku && <button type="button" onClick={cancel} className="btn btn-ghost"><X size={16}/> Cancelar</button>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="field-label">Código SKU *
            <input required value={form.sku} disabled={Boolean(editingSku)} maxLength={40}
              onChange={e=>setField("sku",e.target.value.toUpperCase())} placeholder="TEC-001" className={classes+" disabled:opacity-50"}/>
          </label>
          <label className="field-label">Nombre *
            <input required minLength={2} maxLength={120} value={form.name} onChange={e=>setField("name",e.target.value)}
              placeholder="Mouse inalámbrico" className={classes}/>
          </label>
          <label className="field-label">Categoría *
            <select required value={form.categoryId} onChange={e=>setField("categoryId",e.target.value)} className={classes}>
              <option value="">Selecciona una categoría</option>
              {activeCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="field-label">Precio de venta (S/) *
            <input type="text" inputMode="decimal" required value={form.price}
              onChange={e=>setField("price",e.target.value)} placeholder="45.00" className={classes}/>
          </label>
          <label className="field-label">Costo unitario (S/) *
            <input type="text" inputMode="decimal" required value={form.cost}
              onChange={e=>setField("cost",e.target.value)} placeholder="28.00" className={classes}/>
          </label>
          <label className="field-label">Stock mínimo *
            <input type="number" min="0" max="1000000" step="1" required value={form.minStock}
              onChange={e=>setField("minStock",e.target.value)} className={classes}/>
          </label>
          {!editingSku && <label className="field-label">Stock inicial *
            <input type="number" min="0" max="1000000" step="1" required value={form.initialStock}
              onChange={e=>setField("initialStock",e.target.value)} className={classes}/>
          </label>}
        </div>
        <p className="mt-4 text-xs text-slate-400">Los ajustes posteriores de stock se harán desde Inventario y quedarán registrados.</p>
        <button disabled={busy || activeCategories.length === 0} className="btn btn-primary mt-4">
          <PackagePlus size={18} /> {busy ? "Guardando..." : editingSku ? "Guardar cambios" : "Registrar producto"}
        </button>
        {activeCategories.length === 0 && <p className="mt-3 text-xs text-amber-700">Antes debes crear una categoría activa.</p>}
      </form>}

      <section className="panel overflow-hidden">
        <div className="panel-heading">
          <h2 className="panel-title"><Package size={18}/> Catálogo <span className="badge badge-neutral">{filtered.length}</span></h2>
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin || canEdit ? <select aria-label="Estado de productos" value={status} onChange={e=>setStatus(e.target.value)} className="field w-auto">
              <option value="active">Activos</option><option value="inactive">Inactivos</option><option value="all">Todos</option>
            </select> : null}
            <label className="search-field">
              <Search size={17}/><input aria-label="Buscar productos" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre, SKU o categoría" className="w-44" />
            </label>
          </div>
        </div>
        {loading ? <EmptyState loading title="Cargando productos..."/> : filtered.length === 0
          ? <EmptyState icon={Package} title="No hay productos para mostrar" description="Tu catálogo aparecerá aquí. Prueba con otro filtro o registra un producto."/>
          : <div className="overflow-x-auto"><table className="data-table min-w-[840px]">
            <thead><tr>
              <th className="p-4">SKU / Producto</th><th className="p-4">Categoría</th>
              <th className="p-4">Precio</th><th className="p-4">Stock</th>
              <th className="p-4">Estado</th>{canEdit && <th className="p-4">Acciones</th>}
            </tr></thead>
            <tbody>{filtered.map(p=><tr key={p.id}>
              <td className="p-4"><div className="flex items-center gap-3"><span className="section-icon size-9 rounded-lg"><Package size={17}/></span><div>{p.name}<p className="mt-1 text-[10px] font-medium text-slate-400">{p.sku}</p></div></div></td>
              <td className="p-4 text-slate-500">{categoryNames[p.categoryId] || p.categoryId}</td>
              <td className="p-4">{moneyFromCents(p.priceCents)}</td>
              <td className={`p-4 font-semibold ${p.stock <= p.minStock ? "text-amber-700" : "text-brand-700"}`}>{p.stock} {p.stock <= p.minStock && <span className="badge badge-warning ml-1">Bajo</span>}</td>
              <td className="p-4"><span className={`badge ${p.active ? "badge-success" : "badge-warning"}`}><span className="size-1.5 rounded-full bg-current"/>{p.active ? "Activo" : "Inactivo"}</span></td>
              {canEdit && <td className="p-4"><div className="flex gap-3">
                {p.active && <button onClick={()=>edit(p)} aria-label={`Editar ${p.name}`} title="Editar" className="text-brand-600"><Pencil size={17}/></button>}
                {isAdmin && <button disabled={busy} onClick={()=>toggle(p)} aria-label={`${p.active ? "Desactivar" : "Reactivar"} ${p.name}`}
                  title={p.active ? "Desactivar" : "Reactivar"} className="text-slate-400 hover:text-rose-600">
                  {p.active ? <Trash2 size={18}/> : <RotateCcw size={18}/>}</button>}
              </div></td>}
            </tr>)}</tbody>
          </table></div>}
      </section>
    </div>
  );
}
