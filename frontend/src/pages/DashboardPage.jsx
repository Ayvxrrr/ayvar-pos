
import { Link } from "react-router-dom";

import {
  ShoppingCart,
  Wallet,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Store,
} from "lucide-react";

import StatCard from "../components/dashboard/StatCard";
import { navigation } from "../config/navigation";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { session } = useAuth();
  const { user, business } = session;

  const metrics = [
    {
      title: "Ventas de hoy",
      value: "—",
      description: "Pendiente de conectar ventas",
      icon: ShoppingCart,
      color: "blue",
    },
    {
      title: "Ingresos del día",
      value: "—",
      description: `Moneda configurada: ${business.currency}`,
      icon: Wallet,
      color: "green",
    },
    {
      title: "Productos registrados",
      value: "—",
      description: "Pendiente del módulo de productos",
      icon: Package,
      color: "purple",
    },
    {
      title: "Alertas de stock",
      value: "—",
      description: "Pendiente de conectar inventario",
      icon: AlertTriangle,
      color: "orange",
    },
  ];

  const quickLinks = navigation.filter(
    (item) =>
      item.path !== "/panel" &&
      item.roles.includes(user.role)
  );

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-blue-400">
          PANEL GENERAL
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Bienvenido, {user.name}
        </h1>

        <p className="mt-2 text-slate-400">
          Aquí podrás consultar y administrar la actividad de tu negocio.
        </p>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard
            key={metric.title}
            {...metric}
          />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Resumen de ventas
            </h2>

            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
              Próximamente
            </span>
          </div>

          <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 text-center">
            <ShoppingCart
              size={36}
              className="mb-4 text-slate-600"
            />

            <p className="font-medium text-slate-300">
              Aún no hay estadísticas disponibles
            </p>

            <p className="mt-2 max-w-sm px-4 text-sm text-slate-500">
              Los gráficos aparecerán cuando implementemos el registro de ventas.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">
            Información del negocio
          </h2>

          <div className="mt-6 flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
              <Store size={24} />
            </div>

            <div className="min-w-0">
              <p className="truncate font-semibold">
                {business.name}
              </p>
              <p className="text-xs text-slate-500">
                Negocio activo
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4 border-t border-slate-800 pt-5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Moneda</span>
              <span>{business.currency}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Rol</span>
              <span className="capitalize">{user.role}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Sistema</span>
              <span className="text-emerald-400">
                Conectado
              </span>
            </div>
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-5 text-lg font-semibold">
          Accesos rápidos
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.slice(0, 4).map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-500/40 hover:bg-slate-800"
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={20}
                    className="text-blue-400"
                  />

                  <span className="text-sm font-medium">
                    {item.label}
                  </span>
                </div>

                <ArrowUpRight
                  size={18}
                  className="text-slate-500 transition group-hover:text-blue-400"
                />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
