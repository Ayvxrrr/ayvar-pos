import { useAuth } from "../context/AuthContext";
import DashboardPage from "./DashboardPage";
import AdminDashboardPage from "./AdminDashboardPage";

export default function DashboardHomePage() {
  const { session } = useAuth();
  return session.user.role === "admin" ? <AdminDashboardPage /> : <DashboardPage />;
}
