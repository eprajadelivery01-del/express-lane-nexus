import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Truck, Map, Users, Building2, Bike,
  MapPin, DollarSign, AlertTriangle, Settings, Menu, X, Package, LogOut, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Corridas (OS)", icon: Truck, href: "/admin/deliveries" },
  { label: "Mapa", icon: Map, href: "/admin/map" },
  { label: "Usuários", icon: Users, href: "/admin/users" },
  { label: "Empresas", icon: Building2, href: "/admin/companies" },
  { label: "Entregadores", icon: Bike, href: "/admin/drivers" },
  { label: "Regiões", icon: MapPin, href: "/admin/regions" },
  { label: "Financeiro", icon: DollarSign, href: "/admin/reports" },
  { label: "Ocorrências", icon: AlertTriangle, href: "/admin/occurrences" },
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
          "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar flex flex-col transition-transform duration-300 border-r border-sidebar-border",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-base font-extrabold text-sidebar-foreground tracking-tight">
                É Pra Já
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                Delivery
              </p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== "/admin" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <Link to="/admin/profile" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-sidebar-foreground group-hover:text-primary transition-colors">
                  {profile?.full_name || "Admin"}
                </p>
                <p className="text-[11px] text-muted-foreground">Administrador</p>
              </div>
            </Link>
            <button onClick={signOut} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors" title="Sair">
              <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
