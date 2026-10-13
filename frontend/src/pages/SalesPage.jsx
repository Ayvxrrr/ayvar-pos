import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, ShoppingCart, Plus, Minus, Trash2, RefreshCw,
  CreditCard, Banknote, ArrowRight, ReceiptText, Filter, Package, Smartphone, ArrowLeftRight, UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, centsFromMoney, moneyFromCents } from "../services/api";
import PageHeader from "../components/ui/PageHeader";
import Notice from "../components/ui/Notice";
import EmptyState from "../components/ui/EmptyState";

const methods = [
  { id: "cash", title: "Efectivo", icon: Banknote },
  { id: "card", title: "Tarjeta", icon: CreditCard },
  { id: "transfer", title: "Transferencia", icon: ArrowLeftRight },
  { id: "yape", title: "Yape", icon: Smartphone },
];
const inputClass = "field";
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
      <PageHeader eyebrow="Tu caja, lista para vender" title="Punto de venta" description="Encuentra un producto, agrégalo al carrito y prepara tu próxima venta.">
        <Link to="/panel/ventas/historial" className="btn btn-secondary">
          <ReceiptText size={18}/> Historial de ventas
        </Link>
      </PageHeader>
      <Notice message={error} />
      <Notice message={success} type="success" />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 space-y-4">
          <div className="panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="panel-title"><Package size={18}/> Catálogo disponible <span className="badge badge-neutral">{filtered.length}</span></h2>
              <button type="button" disabled={busy} onClick={() => reload().catch(e => setError(e.message))}
                className="flex items-center gap-1.5 rounded-lg p-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"><RefreshCw size={14}/> Actualizar</button>
            </div>
            <div className="mt-4 flex flex-col gap-3 2xl:flex-row">
              <label className="search-field flex-1">
                <Search size={18}/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o SKU" aria-label="Buscar productos"
                  className="w-full"/>
              </label>
              <label className="flex min-w-0 items-center gap-2 text-slate-400">
                <Filter size={17} className="shrink-0"/>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} aria-label="Filtrar por categoría" className={inputClass}>
                  <option value="all">Todas las categorías</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
          </div>
          {loading ? <div className="panel"><EmptyState loading title="Cargando productos..."/></div> : filtered.length === 0
            ? <div className="panel"><EmptyState icon={Package} title="No se encontraron productos" description="Prueba con otro nombre, SKU o categoría."/></div>
            : <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
              {filtered.map(product => (
                <article key={product.sku} className="product-card justify-between">
                  <div>
                    <div className="product-art" aria-hidden="true"><Package size={29} strokeWidth={1.4}/></div>
                    <p className="truncate text-[10px] font-semibold text-slate-400" title={`${product.sku} · ${categoryNames.get(product.categoryId) || "Sin categoría"}`}>{product.sku} · {categoryNames.get(product.categoryId) || "Sin categoría"}</p>
                    <h3 className="mt-2 min-h-10 text-sm leading-5 font-bold">{product.name}</h3>
                    <p className="mt-3 text-xl font-extrabold tracking-tight text-slate-800">{moneyFromCents(product.priceCents)}</p>
                    <p className={`mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold ${product.stock > 0 ? "text-brand-600" : "text-rose-600"}`}>
                      <span className="size-1.5 rounded-full bg-current"/>
                      {product.stock > 0 ? `Disponibles: ${product.stock}` : "Sin stock"}
                    </p>
                  </div>
                  <button type="button" disabled={busy || product.stock <= 0} onClick={() => addProduct(product)}
                    className="btn mt-4 w-full border-brand-100 bg-brand-50 px-2 text-xs text-brand-700 hover:border-brand-300 hover:bg-brand-100 disabled:opacity-40">
                    <Plus size={17}/> Añadir al carrito
                  </button>
                </article>
              ))}
            </div>}
        </section>

        <aside className="panel h-fit p-5 xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <h2 className="panel-title"><span className="section-icon size-9"><ShoppingCart size={18}/></span> Tu carrito <span className="badge badge-neutral">{itemCount}</span></h2>
            <button type="button" disabled={busy || cart.length === 0} onClick={() => { setCart([]); resetOperation(); }}
              className="rounded-lg p-2 text-[11px] font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40">Vaciar</button>
          </div>
          <div className="my-4 max-h-72 space-y-3 overflow-y-auto">
            {cart.length === 0 ? <EmptyState icon={ShoppingCart} title="Tu carrito está esperando" description="Agrega productos para empezar una venta."/>
              : cartLines.map(line => (
                <div key={line.sku} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="text-sm font-medium">{line.product?.name || `Producto no disponible (${line.sku})`}</p><p className="text-xs text-slate-500">{line.sku}</p></div>
                    <button type="button" disabled={busy} aria-label={`Quitar ${line.sku}`} onClick={() => updateQuantity(line.sku, 0)} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15}/></button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={busy} aria-label={`Restar unidad de ${line.sku}`} onClick={() => updateQuantity(line.sku, line.quantity - 1)} className="icon-button size-8 rounded-lg"><Minus size={14}/></button>
                      <span className="w-7 text-center text-sm">{line.quantity}</span>
                      <button type="button" disabled={busy} aria-label={`Sumar unidad de ${line.sku}`} onClick={() => updateQuantity(line.sku, line.quantity + 1)} className="icon-button size-8 rounded-lg"><Plus size={14}/></button>
                    </div>
                    <span className="text-sm font-semibold">{moneyFromCents((line.product?.priceCents || 0) * line.quantity)}</span>
                  </div>
                </div>
              ))}
          </div>
          <div className="rounded-xl bg-[#122c32] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-slate-300">Total de venta</span><span className="text-2xl font-extrabold tracking-tight text-white" aria-live="polite">{moneyFromCents(totalCents)}</span></div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">Los importes definitivos se verificarán en el servidor.</p>
          </div>
          <div className="mt-5 space-y-2">
            <label htmlFor="sale-customer" className="field-label flex items-center gap-1.5"><UserRound size={14}/> Cliente (opcional)</label>
            <select id="sale-customer" value={customerId} disabled={busy}
              onChange={event => { setCustomerId(event.target.value); resetOperation(); }}
              className={inputClass}>
              <option value="">Consumidor final (sin identificar)</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>
                {customer.name}{customer.documentNumber ? ` · ${customer.documentNumber}` : ""}
              </option>)}
            </select>
            <Link to="/panel/clientes" className="text-link inline-block text-[10px]">Gestionar clientes</Link>
          </div>
          <div className="mt-5 space-y-3">
            <p className="field-label">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {methods.map(m => <button type="button" key={m.id} disabled={busy} onClick={() => changeMethod(m.id)}
                aria-pressed={paymentMethod === m.id}
                className="payment-option">
                <m.icon size={17}/> {m.title}
              </button>)}
            </div>
            {paymentMethod === "cash" && <label className="field-label">Efectivo recibido (S/)
              <input value={cashReceived} onChange={e => changeReceived(e.target.value)} inputMode="decimal" placeholder="Ej. 100.00" className={`mt-2 ${inputClass}`}/>
              <span className="mt-2 flex justify-between text-xs text-slate-500">Vuelto estimado <strong className="text-brand-700">{moneyFromCents(changeCents)}</strong></span>
            </label>}
            {paymentMethod !== "cash" && <p className="rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-700">Este registro no verifica el cobro en el banco o pasarela.</p>}
          </div>
          <button type="button" disabled={busy || cart.length === 0 || missingProduct} onClick={checkout}
            className="btn btn-primary mt-6 min-h-12 w-full justify-between px-5">
            {busy ? "Procesando venta..." : "Confirmar venta"}<ArrowRight size={19}/>
          </button>
          <p className="mt-3 text-center text-[9px] leading-relaxed text-slate-400">Ticket interno de demostración · No es comprobante SUNAT</p>
        </aside>
      </div>
    </div>
  );
}
