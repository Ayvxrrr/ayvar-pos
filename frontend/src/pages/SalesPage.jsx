import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, ShoppingCart, Plus, Minus, Trash2, RefreshCw,
  CreditCard, Banknote, ArrowRight, ReceiptText, Filter, Package,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, centsFromMoney, moneyFromCents } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import Notice from "../components/ui/Notice";

const methods = [
  { id: "cash", title: "Efectivo", icon: Banknote },
  { id: "card", title: "Tarjeta", icon: CreditCard },
  { id: "transfer", title: "Transferencia", icon: CreditCard },
  { id: "yape", title: "Yape", icon: CreditCard },
];
const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500";
const newKey = () => crypto.randomUUID();

function loadDraft(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (Array.isArray(saved?.cart) && typeof saved?.requestId === "string") {
      return {
        cart: saved.cart.filter(line =>
          typeof line?.sku === "string" && Number.isSafeInteger(line?.quantity) && line.quantity > 0
        ),
        requestId: saved.requestId,
        paymentMethod: methods.some(m => m.id === saved.paymentMethod) ? saved.paymentMethod : "cash",
        cashReceived: typeof saved.cashReceived === "string" ? saved.cashReceived : "",
        customerId: typeof saved.customerId === "string" ? saved.customerId : "",
      };
    }
  } catch { /* Borrador antiguo o inválido */ }
  return { cart: [], requestId: newKey(), paymentMethod: "cash", cashReceived: "", customerId: "" };
}

export default function SalesPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const storageKey = `ayvar-pos:checkout:${session.business.id}:${session.user.uid}`;
  const [initialDraft] = useState(() => loadDraft(storageKey));
  const [cart, setCart] = useState(initialDraft.cart);
  const [requestId, setRequestId] = useState(initialDraft.requestId);
  const [paymentMethod, setPaymentMethod] = useState(initialDraft.paymentMethod);
  const [cashReceived, setCashReceived] = useState(initialDraft.cashReceived);
  const [customerId, setCustomerId] = useState(initialDraft.customerId);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inFlight = useRef(false);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({
      cart, requestId, paymentMethod, cashReceived, customerId,
    }));
  }, [cart, requestId, paymentMethod, cashReceived, customerId, storageKey]);

  async function reload() {
    const [productsResult, categoriesResult, customersResult] = await Promise.all([
      api("/api/products"), api("/api/categories"), api("/api/customers"),
    ]);
    setProducts(productsResult.products.filter(p => p.active));
    setCategories(categoriesResult.categories.filter(c => c.active));
    setCustomers(customersResult.customers.filter(c => c.active));
  }
  useEffect(() => {
    reload().catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const bySku = useMemo(() => new Map(products.map(p => [p.sku, p])), [products]);
  const categoryNames = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);
  const filtered = useMemo(() => products.filter(p => {
    const matchesSearch = `${p.name} ${p.sku} ${categoryNames.get(p.categoryId) || ""}`
      .toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"));
    return matchesSearch && (categoryId === "all" || p.categoryId === categoryId);
  }), [products, categoryNames, search, categoryId]);
  const cartLines = cart.map(line => ({ ...line, product: bySku.get(line.sku) }));
  const missingProduct = cartLines.some(line => !line.product);
  const totalCents = cartLines.reduce((sum, line) =>
    sum + (line.product?.priceCents || 0) * line.quantity, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const parsedReceived = (() => {
    try { return centsFromMoney(cashReceived); } catch { return null; }
  })();
  const changeCents = paymentMethod === "cash" && parsedReceived != null
    ? Math.max(0, parsedReceived - totalCents) : 0;

  function resetOperation() {
    setRequestId(newKey());
    setError("");
    setSuccess("");
  }
  function addProduct(product) {
    if (busy || product.stock <= 0) return;
    const current = cart.find(line => line.sku === product.sku)?.quantity || 0;
    if (current >= product.stock || current >= 1000) {
      setError(`No hay más unidades disponibles de ${product.name}.`);
      return;
    }
    setCart(prev => current
      ? prev.map(line => line.sku === product.sku ? { ...line, quantity: line.quantity + 1 } : line)
      : [...prev, { sku: product.sku, quantity: 1 }]);
    resetOperation();
  }
  function updateQuantity(sku, quantity) {
    if (busy || !Number.isSafeInteger(quantity)) return;
    const product = bySku.get(sku);
    if (quantity > Math.min(product?.stock || 0, 1000)) {
      setError("La cantidad supera el stock disponible.");
      return;
    }
    setCart(prev => quantity <= 0
      ? prev.filter(line => line.sku !== sku)
      : prev.map(line => line.sku === sku ? { ...line, quantity } : line));
    resetOperation();
  }
  function changeMethod(method) {
    if (busy || paymentMethod === method) return;
    setPaymentMethod(method);
    resetOperation();
  }
  function changeReceived(value) {
    if (busy) return;
    setCashReceived(value);
    resetOperation();
  }

  async function checkout() {
    if (inFlight.current || busy) return;
    setError(""); setSuccess("");
    if (customerId && !customers.some(c => c.id === customerId)) {
      setError("El cliente seleccionado no está disponible. Actualiza el listado."); return;
    }
    if (cart.length === 0 || missingProduct) {
      setError("Agrega productos válidos antes de cobrar."); return;
    }
    if (cart.length > 20) {
      setError("Cada venta permite un máximo de 20 productos diferentes."); return;
    }
    let amount = null;
    if (paymentMethod === "cash") {
      try { amount = centsFromMoney(cashReceived); }
      catch (err) { setError(err.message); return; }
      if (amount < totalCents) {
        setError("El efectivo recibido es menor que el total."); return;
      }
    }
    if (!window.confirm(`¿Confirmar venta por ${moneyFromCents(totalCents)}?`)) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await api("/api/sales", {
        method: "POST",
        body: {
          requestId,
          items: cart.map(({ sku, quantity }) => ({ sku, quantity })),
          expectedTotalCents: totalCents,
          paymentMethod,
          receivedCents: paymentMethod === "cash" ? amount : null,
          customerId: customerId || null,
        },
      });
      setCart([]);
      setCashReceived("");
      setPaymentMethod("cash");
      setCustomerId("");
      setRequestId(newKey());
      localStorage.removeItem(storageKey);
      setSuccess(result.repeated
        ? "Esta venta ya estaba registrada; no se descontó el stock otra vez."
        : "Venta registrada y stock actualizado correctamente.");
      try { await reload(); }
      catch { setSuccess("Venta registrada. Actualiza el catálogo cuando se restablezca la conexión."); }
      navigate(`/panel/ventas/${result.sale.id}`);
    } catch (err) {
      // El requestId no se cambia en un error de red: puede reintentarse sin duplicar ventas.
      setError(`${err.message} Si la conexión falló, comprueba el historial antes de volver a intentar.`);
      try { await reload(); } catch { /* Mantener la causa original */ }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Punto de venta" description="Selecciona productos, prepara el carrito y registra pagos declarados." />
        <Link to="/panel/ventas/historial" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800">
          <ReceiptText size={18}/> Historial de ventas
        </Link>
      </div>
      <Notice message={error} />
      <Notice message={success} type="success" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Catálogo disponible</h2>
              <button type="button" disabled={busy} onClick={() => reload().catch(e => setError(e.message))}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"><RefreshCw size={16}/> Actualizar</button>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-400">
                <Search size={18}/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o SKU" aria-label="Buscar productos"
                  className="w-full bg-transparent py-3 text-sm text-white outline-none"/>
              </label>
              <label className="flex items-center gap-2 text-slate-400">
                <Filter size={17}/>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} aria-label="Filtrar por categoría" className={inputClass}>
                  <option value="all">Todas las categorías</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
          </div>
          {loading ? <p className="p-8 text-slate-400">Cargando productos...</p> : filtered.length === 0
            ? <p className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-400">No se encontraron productos.</p>
            : <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {filtered.map(product => (
                <article key={product.sku} className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-500/40">
                  <div>
                    <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"><Package size={22}/></div>
                    <p className="text-xs text-slate-500">{product.sku} · {categoryNames.get(product.categoryId) || "Sin categoría"}</p>
                    <h3 className="mt-1 min-h-12 font-semibold text-white">{product.name}</h3>
                    <p className="mt-2 text-xl font-bold text-blue-400">{moneyFromCents(product.priceCents)}</p>
                    <p className={`mt-2 text-xs ${product.stock > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {product.stock > 0 ? `Disponibles: ${product.stock}` : "Sin stock"}
                    </p>
                  </div>
                  <button type="button" disabled={busy || product.stock <= 0} onClick={() => addProduct(product)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-40">
                    <Plus size={17}/> Añadir al carrito
                  </button>
                </article>
              ))}
            </div>}
        </section>

        <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><ShoppingCart size={20} className="text-blue-400"/> Carrito <span className="text-sm text-slate-500">({itemCount})</span></h2>
            <button type="button" disabled={busy || cart.length === 0} onClick={() => { setCart([]); resetOperation(); }}
              className="text-xs text-slate-400 hover:text-rose-400 disabled:opacity-40">Vaciar</button>
          </div>
          <div className="my-4 max-h-72 space-y-3 overflow-y-auto">
            {cart.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Agrega productos para empezar una venta.</p>
              : cartLines.map(line => (
                <div key={line.sku} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="text-sm font-medium">{line.product?.name || `Producto no disponible (${line.sku})`}</p><p className="text-xs text-slate-500">{line.sku}</p></div>
                    <button type="button" disabled={busy} aria-label={`Quitar ${line.sku}`} onClick={() => updateQuantity(line.sku, 0)} className="text-slate-500 hover:text-rose-400"><Trash2 size={17}/></button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={busy} aria-label={`Restar unidad de ${line.sku}`} onClick={() => updateQuantity(line.sku, line.quantity - 1)} className="rounded-lg bg-slate-800 p-2"><Minus size={14}/></button>
                      <span className="w-7 text-center text-sm">{line.quantity}</span>
                      <button type="button" disabled={busy} aria-label={`Sumar unidad de ${line.sku}`} onClick={() => updateQuantity(line.sku, line.quantity + 1)} className="rounded-lg bg-slate-800 p-2"><Plus size={14}/></button>
                    </div>
                    <span className="text-sm font-semibold">{moneyFromCents((line.product?.priceCents || 0) * line.quantity)}</span>
                  </div>
                </div>
              ))}
          </div>
          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between"><span className="text-slate-400">Total de venta</span><span className="text-2xl font-bold text-emerald-400">{moneyFromCents(totalCents)}</span></div>
            <p className="mt-1 text-xs text-slate-500">Los importes definitivos se verificarán en el servidor.</p>
          </div>
          <div className="mt-5 space-y-2">
            <label htmlFor="sale-customer" className="text-sm font-medium">Cliente (opcional)</label>
            <select id="sale-customer" value={customerId} disabled={busy}
              onChange={event => { setCustomerId(event.target.value); resetOperation(); }}
              className={inputClass}>
              <option value="">Consumidor final (sin identificar)</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>
                {customer.name}{customer.documentNumber ? ` · ${customer.documentNumber}` : ""}
              </option>)}
            </select>
            <Link to="/panel/clientes" className="inline-block text-xs text-blue-400 hover:text-blue-300">Gestionar clientes</Link>
          </div>
          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {methods.map(m => <button type="button" key={m.id} disabled={busy} onClick={() => changeMethod(m.id)}
                aria-pressed={paymentMethod === m.id}
                className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-3 text-sm transition ${paymentMethod === m.id ? "border-blue-500 bg-blue-600/15 text-blue-300" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}>
                <m.icon size={17}/> {m.title}
              </button>)}
            </div>
            {paymentMethod === "cash" && <label className="block text-sm text-slate-300">Efectivo recibido (S/)
              <input value={cashReceived} onChange={e => changeReceived(e.target.value)} inputMode="decimal" placeholder="Ej. 100.00" className={`mt-2 ${inputClass}`}/>
              <span className="mt-2 flex justify-between text-xs text-slate-400">Vuelto estimado <strong className="text-emerald-400">{moneyFromCents(changeCents)}</strong></span>
            </label>}
            {paymentMethod !== "cash" && <p className="text-xs text-amber-300">Este registro no verifica el cobro en el banco o pasarela.</p>}
          </div>
          <button type="button" disabled={busy || cart.length === 0 || missingProduct} onClick={checkout}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold hover:bg-emerald-500 disabled:opacity-50">
            {busy ? "Procesando venta..." : "Confirmar venta"}<ArrowRight size={19}/>
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">Ticket interno de demostración · No es comprobante SUNAT</p>
        </aside>
      </div>
    </div>
  );
}
