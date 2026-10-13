import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { X, Store, ShieldCheck, ChevronRight } from "lucide-react";
import { navigation } from "../../config/navigation";
import { useAuth } from "../../context/AuthContext";
import Logo from "../ui/Logo";

const groups = [
  { label: "Tu negocio", paths: ["/panel", "/panel/ventas", "/panel/productos", "/panel/categorias", "/panel/inventario", "/panel/clientes"] },
  { label: "Administración", paths: ["/panel/reportes", "/panel/usuarios", "/panel/auditoria", "/panel/configuracion"] },
];
const roleLabels = { admin: "Administrador", cashier: "Cajero", warehouse: "Almacén" };

export default function Sidebar({ open, onClose }) {
  const { session } = useAuth();
  const sidebar = useRef(null);
  const role = session.user.role;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector("button")?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = [...sidebar.current.querySelectorAll("a, button")].filter(el => el.getClientRects().length);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  return <>
    {open && <button type="button" aria-label="Cerrar menú lateral" onClick={onClose}
      className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden" />}
    <aside ref={sidebar} id="main-sidebar" aria-label="Menú del negocio"
      className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-[transform,visibility] duration-300 ${open ? "visible translate-x-0" : "invisible -translate-x-full"} lg:visible lg:translate-x-0`}>
      <div className="sidebar-brand flex h-20 shrink-0 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Logo size={37} />
          <div><p className="text-xl font-extrabold tracking-tight text-white">ayvar<span className="ml-1.5 text-xs font-semibold tracking-wider text-emerald-300">POS</span></p>
            <p className="mt-0.5 text-[9px] tracking-[.16em] text-slate-400">GESTIÓN COMERCIAL</p></div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar menú" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden"><X size={19} /></button>
      </div>

      <div className="mx-4 mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-emerald-200"><Store size={18} /></div>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{session.business.name}</p><p className="mt-1 text-[10px] text-slate-400">Mi espacio de trabajo</p></div>
        <ChevronRight size={14} className="shrink-0 text-slate-500" />
      </div>

      <nav aria-label="Navegación principal" className="mt-6 flex-1 space-y-6 overflow-y-auto px-4 pb-6">
        {groups.map(group => {
          const items = group.paths.map(path => navigation.find(item => item.path === path)).filter(item => item?.roles.includes(role));
          if (!items.length) return null;
          return <div key={group.label}>
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">{group.label}</p>
            <div className="space-y-1">{items.map(item => <NavLink key={item.path} to={item.path} end={item.path === "/panel"} onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
              <item.icon size={18} strokeWidth={1.7} /><span>{item.label}</span>
            </NavLink>)}</div>
          </div>;
        })}
      </nav>

      <div className="mx-4 mb-4 rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-200"><ShieldCheck size={15} /> Sesión protegida</div>
        <p className="mt-2 truncate text-xs font-medium text-slate-300">{session.user.name}</p>
        <p className="mt-1 text-[10px] text-slate-500">{roleLabels[role] || role}</p>
      </div>
      <p className="pb-5 text-center text-[9px] tracking-wider text-slate-500">AYVAR POS <span className="mx-1.5 text-slate-600">/</span> HECHO PARA TU NEGOCIO</p>
    </aside>
  </>;
}
