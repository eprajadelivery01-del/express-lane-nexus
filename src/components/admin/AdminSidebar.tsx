import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Truck, Users, MapPin, Building2, Star,
  AlertTriangle, BarChart3, Settings, Menu, X, Package, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Entregas", icon: Truck, href: "/admin/deliveries" },
  { label: "Usuários", icon: Users, href: "/admin/users" },
  { label: "Empresas", icon: Building2, href: "/admin/companies" },
  { label: "Regiões", icon: MapPin, href: "/admin/regions" },
  { label: "Ocorrências", icon: AlertTriangle, href: "/admin/occurrences" },
  { label: "Avaliações", icon: Star, href: "/admin/reviews" },
  { label: "Relatórios", icon: BarChart3, href: "/admin/reports" },
  { label: "Configurações", icon: Settings, href: "/admin/settings" },
];

export function AdminSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card shadow-card"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-sidebar-border flex flex-col transition-transform duration-300",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold text-foreground">FleetDash</h1>
              <p className="text-[11px] text-muted-foreground">Gestão de Entregas</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== "/admin" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {(profile?.full_name || "AD").substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{profile?.full_name || "Admin"}</p>
                <p className="text-[11px] text-muted-foreground">Administrador</p>
              </div>
            </div>
            <button onClick={signOut} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Sair">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
