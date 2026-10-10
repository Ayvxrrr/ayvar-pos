
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import {Menu,Bell,LogOut,Store,} from "lucide-react";

import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const { user, business } = session;

  async function handleLogout() {
    try {
      setLogoutError("");
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("No se pudo cerrar la sesión.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-h-screen lg:ml-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2 text-slate-300 hover:bg-slate-800 lg:hidden"
            >
              <Menu size={24} />
            </button>

            <Store
              size={22}
              className="hidden shrink-0 text-blue-400 sm:block"
            />

            <div className="min-w-0">
              <p className="truncate font-semibold">
                {business.name}
              </p>
              <p className="text-xs text-slate-500">
                Panel administrativo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <span
              title="Las notificaciones estarán disponibles próximamente"
              className="hidden text-slate-500 sm:block"
            >
              <Bell size={20} />
            </span>

            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-600/20 font-bold text-blue-400">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div className="hidden md:block">
                <p className="text-sm font-semibold">
                  {user.name}
                </p>
                <p className="text-xs capitalize text-slate-500">
                  {user.role}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="rounded-xl border border-slate-800 p-2.5 text-slate-400 transition hover:bg-slate-800 hover:text-red-400"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {logoutError && (
          <p role="alert" className="px-8 pt-3 text-sm text-red-400">
            {logoutError}
          </p>
        )}

        <main className="mx-auto w-full max-w-7xl p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
