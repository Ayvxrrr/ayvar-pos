import { useCallback, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut, ChevronRight, CalendarDays, Store } from "lucide-react";
import Sidebar from "./Sidebar";
import Notice from "../ui/Notice";
import { useAuth } from "../../context/AuthContext";
import { navigation } from "../../config/navigation";

const roleLabels = { admin: "Administrador", cashier: "Cajero", warehouse: "Almacén" };

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, business } = session;
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const currentPage = navigation.find(item => item.path !== "/panel" && pathname.startsWith(item.path)) || navigation[0];
  const date = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" }).format(new Date());

  async function handleLogout() {
    try {
      setLogoutError("");
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("No se pudo cerrar la sesión.");
    }
  }

  return <div className="min-h-screen">
    <a href="#main-content" className="skip-link">Ir al contenido</a>
    <Sidebar open={sidebarOpen} onClose={closeSidebar} />
    <div className="flex min-h-screen min-w-0 flex-col lg:ml-64">
      <header className="app-topbar sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" aria-label="Abrir menú" aria-expanded={sidebarOpen} aria-controls="main-sidebar" onClick={() => setSidebarOpen(true)} className="icon-button lg:hidden"><Menu size={20} /></button>
          <nav aria-label="Ruta actual" className="flex min-w-0 items-center gap-2 text-xs">
            <Link to="/panel" title={business.name} className="hidden items-center gap-2 text-slate-400 hover:text-brand-700 sm:flex"><Store size={16} /><span className="max-w-36 truncate">Mi negocio</span></Link>
            <ChevronRight size={13} className="hidden text-slate-300 sm:block" />
            <span className="truncate font-bold text-slate-700">{currentPage.label}</span>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-3 md:gap-5">
          <div className="hidden items-center gap-2 text-[11px] text-slate-400 xl:flex"><CalendarDays size={15} /><span>{date}</span></div>
          <div className="flex items-center gap-2.5 md:border-l md:border-slate-200 md:pl-5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-brand-200/60 bg-brand-50 text-sm font-extrabold text-brand-700">{user.name?.charAt(0)?.toUpperCase() || "U"}</div>
            <div className="hidden sm:block"><p className="max-w-40 truncate text-xs font-bold text-slate-700">{user.name}</p><p className="mt-1 text-[10px] text-slate-400">{roleLabels[user.role] || user.role}</p></div>
          </div>
          <button type="button" onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión" className="icon-button border-transparent bg-transparent hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"><LogOut size={17} /></button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1536px] flex-1 p-4 outline-none sm:p-6 xl:p-8">
        <Notice message={logoutError} />
        <div key={pathname} className="page-enter"><Outlet /></div>
      </main>
      <footer className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 py-5 text-[10px] text-slate-400 sm:mx-6 xl:mx-8">
        <p><span className="font-bold text-slate-500">Ayvar POS</span><span className="mx-2">·</span>Tu negocio, en un solo lugar.</p>
        <p className="max-w-full truncate">{business.name} <span className="mx-1.5">/</span> {business.currency || "PEN"}</p>
      </footer>
    </div>
  </div>;
}
