
import { NavLink } from "react-router-dom";
import { ShoppingCart, X } from "lucide-react";

import { navigation } from "../../config/navigation";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({ open, onClose }) {
  const { session } = useAuth();

  const role = session.user.role;

  const availableItems = navigation.filter(
    (item) => item.roles.includes(role)
  );

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú lateral"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2.5">
              <ShoppingCart size={22} className="text-white" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Ayvar <span className="text-blue-400">POS</span>
              </h2>
              <p className="text-xs text-slate-500">
                Gestión comercial
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="text-slate-400 lg:hidden"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-5 pt-7 pb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Menú principal
          </p>
        </div>

        <nav
          aria-label="Navegación principal"
          className="flex-1 space-y-1 overflow-y-auto px-3"
        >
          {availableItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/panel"}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600/15 text-blue-400 ring-1 ring-blue-500/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-5">
          <div className="rounded-xl bg-slate-900 p-4">
            <p className="text-xs text-slate-500">
              Sesión activa
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-white">
              {session.user.name}
            </p>

            <p className="mt-1 text-xs capitalize text-blue-400">
              Rol: {role}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
