import { LayoutDashboard, ShoppingCart, Package, Boxes, Tags, Users, BarChart3, UserCog, Settings, ClipboardList } from "lucide-react";
export const navigation = [
  { label: "Dashboard", path: "/panel", icon: LayoutDashboard, roles: ["admin", "cashier", "warehouse"] },
  { label: "Ventas", path: "/panel/ventas", icon: ShoppingCart, roles: ["admin", "cashier"] },
  { label: "Productos", path: "/panel/productos", icon: Package, roles: ["admin", "cashier", "warehouse"] },
  { label: "Categorías", path: "/panel/categorias", icon: Tags, roles: ["admin"] },
  { label: "Inventario", path: "/panel/inventario", icon: Boxes, roles: ["admin", "warehouse"] },
  { label: "Clientes", path: "/panel/clientes", icon: Users, roles: ["admin", "cashier"] },
  { label: "Reportes", path: "/panel/reportes", icon: BarChart3, roles: ["admin"] },
  { label: "Usuarios", path: "/panel/usuarios", icon: UserCog, roles: ["admin"] },
  { label: "Configuración", path: "/panel/configuracion", icon: Settings, roles: ["admin"] },
  { label: "Auditoría", path: "/panel/auditoria", icon: ClipboardList, roles: ["admin"] },
];
export function canAccess(role, path) {
  return navigation.find(item => item.path === path)?.roles.includes(role) ?? false;
}
