
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
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";

export default function DashboardPage() {
  const { session } = useAuth();
  const { user, business } = session;

  const metrics = [
    {
      title: "Ventas de hoy",
      value: "—",
      description: "Sin indicadores en este resumen",
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
      description: "Consulta el catálogo de tu tienda",
      icon: Package,
      color: "purple",
    },
    {
      title: "Alertas de stock",
      value: "—",
      description: "Sin indicadores en este resumen",
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
      <PageHeader eyebrow="Un nuevo día para hacer crecer tu negocio" title={`Bienvenido, ${user.name}`} description="Tu espacio de trabajo está listo. ¿Por dónde empezamos?" />

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard
            key={metric.title}
            {...metric}
          />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="panel p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="panel-title">
              Resumen de ventas
            </h2>

            <span className="badge badge-neutral">
              Próximamente
            </span>
          </div>

          <div className="mt-5 flex min-h-60 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50"><EmptyState icon={ShoppingCart} title="Aún no hay estadísticas disponibles" description="Utiliza los accesos rápidos para continuar con las operaciones de tu tienda."/></div>
        </section>

        <section className="panel p-6">
          <h2 className="panel-title">
            Información del negocio
          </h2>

          <div className="mt-6 flex items-center gap-3">
            <div className="section-icon size-12">
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

          <div className="mt-6 space-y-4 border-t border-slate-100 pt-5 text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Moneda</span>
              <span>{business.currency}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Rol</span>
              <span className="font-semibold">{{ admin: "Administrador", cashier: "Cajero", warehouse: "Almacén" }[user.role] || user.role}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Sistema</span>
              <span className="badge badge-success">
                Conectado
              </span>
            </div>
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-bold">
          Accesos rápidos
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.slice(0, 4).map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className="quick-link group"
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={20}
                    className="text-brand-600"
                  />

                  <span className="text-sm font-medium">
                    {item.label}
                  </span>
                </div>

                <ArrowUpRight
                  size={18}
                  className="text-slate-400 transition group-hover:text-brand-600"
                />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
