import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Truck, Map, Users, Building2, Bike,
  MapPin, DollarSign, AlertTriangle, Settings, Menu, X,
  Package, LogOut, User, ChevronLeft, ChevronRight,
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

const SIDEBAR_COLLAPSED_KEY = "epj_sidebar_collapsed";

interface AdminSidebarProps {
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AdminSidebar({ onCollapsedChange }: AdminSidebarProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const { profile, signOut } = useAuth();

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)); } catch {}
    onCollapsedChange?.(next);
  };

  useEffect(() => {
    onCollapsedChange?.(collapsed);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card shadow-card"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-sidebar flex flex-col transition-all duration-300 border-r border-sidebar-border",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {/* Brand */}
        <div className={cn(
          "flex items-center border-b border-sidebar-border shrink-0",
          collapsed ? "justify-center p-3" : "justify-between p-5"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md shrink-0">
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
          )}

          {collapsed && (
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
          )}

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden",
          collapsed ? "p-2 space-y-1" : "p-3 space-y-0.5"
        )}>
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/admin" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className={cn(
          "border-t border-sidebar-border shrink-0",
          collapsed ? "p-2" : "p-4"
        )}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                to="/admin/profile"
                title="Meu perfil"
                className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </Link>
              <button
                onClick={signOut}
                title="Sair"
                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Link to="/admin/profile" className="flex items-center gap-3 group min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground group-hover:text-primary transition-colors truncate">
                    {profile?.full_name || "Admin"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Administrador</p>
                </div>
              </Link>
              <button
                onClick={signOut}
                className="p-2 rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
                title="Sair"
              >
                <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle button (desktop only) */}
        <button
          onClick={toggleCollapsed}
          className={cn(
            "hidden lg:flex absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-card border border-border shadow-sm items-center justify-center hover:bg-muted transition-colors z-10"
          )}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </aside>
    </>
  );
}
