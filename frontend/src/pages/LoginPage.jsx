
import { useState } from "react";
import { ArrowRight, LockKeyhole, Mail, Eye, EyeOff, LoaderCircle, ShoppingBag, Package, BarChart3, Check, ShieldCheck } from "lucide-react";
import Logo from "../components/ui/Logo";
import Notice from "../components/ui/Notice";

import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, logout, error: sessionError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      await login(email, password);
    } catch (err) {
      if (
        [
          "auth/invalid-credential",
          "auth/wrong-password",
          "auth/user-not-found",
        ].includes(err.code)
      ) {
        setFormError("Correo o contraseña incorrectos.");
      } else {
        setFormError(
          "No se pudo iniciar sesión. Inténtalo nuevamente."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Gestión comercial Ayvar POS">
        <div className="flex items-center gap-3"><Logo size={40} /><span className="text-2xl font-extrabold tracking-tight">ayvar<span className="ml-2 text-sm font-medium text-emerald-200">POS</span></span></div>
        <div className="my-auto pt-14">
          <p className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-emerald-200"><span className="size-1.5 rounded-full bg-emerald-300" /> El siguiente paso para tu negocio</p>
          <h2>Tu tienda, en su<br /><span>mejor versión.</span></h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">Ventas, inventario y clientes. Todo conectado en un espacio diseñado para hacer más simple tu día.</p>

          <div className="login-illustration" aria-hidden="true">
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4"><span className="text-xs font-bold">Tu negocio, bajo control</span><span className="flex gap-1"><i className="size-1.5 rounded-full bg-white/20"/><i className="size-1.5 rounded-full bg-white/20"/><i className="size-1.5 rounded-full bg-emerald-300"/></span></div>
            <div className="grid grid-cols-[1fr_1.2fr] gap-4">
              <div className="space-y-2">{[[ShoppingBag, "Ventas"], [Package, "Inventario"], [BarChart3, "Reportes"]].map(([Icon, label]) => <div key={label} className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/5 p-3"><Icon size={15} className="text-emerald-200"/><span className="text-[11px] text-slate-200">{label}</span></div>)}</div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="mb-4 flex items-center gap-1.5 text-[10px] text-slate-300"><BarChart3 size={12}/> Una visión más clara</div><div className="flex h-24 items-end gap-2">{[30, 46, 38, 66, 56, 80, 100].map((height, i) => <div key={i} className="illustration-bar" style={{ height: `${height}%`, opacity: .5 + i * .08 }} />)}</div><div className="mt-3 h-px bg-white/10" /></div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-300/10 px-3 py-2.5 text-[10px] text-emerald-200"><Check size={14} /> Menos complicaciones. Más tiempo para crecer.</div>
          </div>
        </div>
        <p className="mt-6 text-[10px] tracking-wide text-slate-400">TECNOLOGÍA QUE ACOMPAÑA A TU NEGOCIO.</p>
      </section>

      <section className="login-form-side">
        <div className="login-form-inner page-enter">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden"><Logo size={38}/><span className="text-xl font-extrabold tracking-tight text-slate-800">ayvar <span className="text-brand-600">POS</span></span></div>
          <div className="mb-7 flex size-12 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-600"><LockKeyhole size={22} strokeWidth={1.7}/></div>
          <p className="eyebrow">Qué bueno tenerte de vuelta</p>
          <h1 className="mt-3 text-[30px] leading-tight font-extrabold tracking-tight sm:text-[34px]">Bienvenido a Ayvar POS</h1>
          <p className="mt-3 mb-8 text-sm leading-relaxed text-slate-500">Ingresa a tu cuenta y sigue haciendo crecer tu negocio.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="field-label mb-2">
              Correo electrónico
            </label>

            <div className="login-field"><Mail size={19}/><input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="correo@ejemplo.com"
              className="field"
            /></div>
          </div>

          <div>
            <label htmlFor="password" className="field-label mb-2">
              Contraseña
            </label>

            <div className="login-field"><LockKeyhole size={19}/><input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Tu contraseña"
              className="field pr-12"
            /><button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="absolute top-1.5 right-1.5 flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-600">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
          </div>

          <Notice message={formError || sessionError} />

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary mt-2 min-h-[52px] w-full justify-between px-5"
          >
            {submitting ? "Ingresando..." : "Iniciar sesión"}
            {submitting ? <LoaderCircle size={18} className="animate-spin"/> : <ArrowRight size={18}/>}
          </button>

          {auth.currentUser && sessionError && (
            <button
              type="button"
              onClick={() => logout()}
              className="btn btn-ghost w-full"
            >
              Cerrar sesión actual
            </button>
          )}
        </form>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400"><ShieldCheck size={15} className="text-brand-600"/>Acceso protegido por Firebase Authentication</div>
            <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">¿Necesitas acceso? Contacta al administrador de tu negocio.</p>
          </div>
        </div>
        <p className="login-footer">© {new Date().getFullYear()} Ayvar POS · Gestión comercial, simplificada.</p>
      </section>
    </main>
  );
}
