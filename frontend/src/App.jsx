import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import DashboardLayout from "./components/layout/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ModulePage from "./pages/ModulePage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import CategoriesPage from "./pages/CategoriesPage";
import ProductsPage from "./pages/ProductsPage";
import InventoryPage from "./pages/InventoryPage";
import SalesPage from "./pages/SalesPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import SaleDetailPage from "./pages/SaleDetailPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerHistoryPage from "./pages/CustomerHistoryPage";
import DashboardHomePage from "./pages/DashboardHomePage";
import ReportsPage from "./pages/ReportsPage";

function Loading() {
  return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">Verificando sesión...</div>;
}
function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}
function RoleRoute({ allowed, children }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return allowed.includes(session.user.role) ? children : <Navigate to="/panel/sin-acceso" replace />;
}
function PublicRoute() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  return session ? <Navigate to="/panel" replace /> : <LoginPage />;
}
const admin = ["admin"];
const sales = ["admin", "cashier"];
const inventory = ["admin", "warehouse"];
const all = ["admin", "cashier", "warehouse"];

export default function App() {
  return <Routes>
    <Route path="/login" element={<PublicRoute />} />
    <Route element={<RequireAuth />}>
      <Route path="/panel" element={<DashboardLayout />}>
        <Route index element={<DashboardHomePage />} />
        <Route path="ventas" element={<RoleRoute allowed={sales}><SalesPage /></RoleRoute>} />
        <Route path="ventas/historial" element={<RoleRoute allowed={sales}><SalesHistoryPage /></RoleRoute>} />
        <Route path="ventas/:id" element={<RoleRoute allowed={sales}><SaleDetailPage /></RoleRoute>} />
        <Route path="productos" element={<RoleRoute allowed={all}><ProductsPage /></RoleRoute>} />
        <Route path="categorias" element={<RoleRoute allowed={admin}><CategoriesPage /></RoleRoute>} />
        <Route path="inventario" element={<RoleRoute allowed={inventory}><InventoryPage /></RoleRoute>} />
        <Route path="clientes" element={<RoleRoute allowed={sales}><CustomersPage /></RoleRoute>} />
        <Route path="clientes/:id" element={<RoleRoute allowed={sales}><CustomerHistoryPage /></RoleRoute>} />
        <Route path="reportes" element={<RoleRoute allowed={admin}><ReportsPage /></RoleRoute>} />

        <Route path="usuarios" element={<RoleRoute allowed={admin}><ModulePage title="Usuarios" description="Próximamente: administración de trabajadores." /></RoleRoute>} />
        <Route path="configuracion" element={<RoleRoute allowed={admin}><ModulePage title="Configuración" description="Próximamente: ajustes del negocio." /></RoleRoute>} />
        <Route path="sin-acceso" element={<AccessDeniedPage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/panel" replace />} />
  </Routes>;
}
