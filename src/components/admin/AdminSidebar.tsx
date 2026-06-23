import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Truck, Map, Building2, Bike, ShoppingBag,
  MapPin, DollarSign, AlertTriangle, Settings, Menu, X, LogOut, User, MessageSquare, ChevronRight, ExternalLink, Ticket, Globe, Calculator, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBadges } from "@/hooks/useAdminBadges";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  external?: boolean;
  badgeKey?: keyof import("@/hooks/useAdminBadges").AdminBadges;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Rastreio", icon: Map, href: "/admin/tracking" },
  { label: "Corridas (OS)", icon: Truck, href: "/admin/deliveries", badgeKey: "openRides" },
  { label: "Chat", icon: MessageSquare, href: "/admin/chat", badgeKey: "unreadChats" },
  { label: "Empresas", icon: Building2, href: "/admin/companies" },
  { label: "Vendas (Lojas)", icon: ShoppingBag, href: "/admin/sales" },
  { label: "Entregadores", icon: Bike, href: "/admin/drivers" },
  { label: "Bases", icon: Globe, href: "/admin/bases" },
  { label: "Regiões", icon: MapPin, href: "/admin/regions" },
  { label: "Faturas", icon: FileText, href: "/admin/invoices" },
  { label: "Cupons", icon: Ticket, href: "/admin/coupons" },
  { label: "Financeiro", icon: DollarSign, href: "/admin/reports" },
  { label: "Meu Perfil", icon: User, href: "/admin/profile" },
];

interface AdminSidebarProps {
  onCollapsedChange?: (collapsed: boolean) => void;
}

function BadgeDot({ count, collapsed }: { count: number; collapsed: boolean }) {
  if (count === 0) return null;
  return collapsed ? (
    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-card" />
  ) : (
    <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function AdminSidebar({ onCollapsedChange }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("epj_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut, user } = useAuth();
  const { badges } = useAdminBadges(user?.id);

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("epj_sidebar_collapsed", String(newState));
    onCollapsedChange?.(newState);
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card shadow-card"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-card border-r border-border flex flex-col transition-all duration-300 lg:translate-x-0 lg:static lg:z-auto",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        collapsed ? "w-[68px]" : "w-64"
      )}>
        {/* Brand */}
        <div className={cn("flex-none flex items-center px-5 py-5 border-b border-sidebar-border transition-all relative", collapsed ? "justify-center px-0" : "justify-between")}>
          <div className="flex items-center gap-3 overflow-hidden">
            <img src="/logo.png" alt="É Pra Já" className="h-10 w-auto rounded-lg" />
            {!collapsed && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-base font-bold text-sidebar-foreground whitespace-nowrap">Central de Comando</span>
                <span className="block text-xs text-sidebar-accent-foreground">Operacional</span>
              </div>
            )}
          </div>
          <button onClick={() => setMobileOpen(false)} className={cn("lg:hidden", collapsed && "hidden")}>
            <X className="h-5 w-5" />
          </button>
          

        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== "/admin" && location.pathname.startsWith(item.href));
            const badgeCount = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0;
            
            return item.external ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : ""}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="animate-in fade-in slide-in-from-left-2 duration-300 flex-1">{item.label}</span>}
                {!collapsed && <ExternalLink className="h-3 w-3 opacity-30" />}
              </a>
            ) : (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : ""}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
                <BadgeDot count={badgeCount} collapsed={collapsed} />
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="flex-none border-t border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
              {!collapsed && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <p className="text-sm font-medium text-foreground truncate max-w-[120px]">{profile?.full_name || "Admin"}</p>
                  <p className="text-xs text-muted-foreground">Administrador</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button onClick={signOut} className="p-1.5 rounded-lg hover:bg-muted transition-colors animate-in fade-in duration-300">
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>


        </div>
      </aside>

      {/* Toggle button — rendered OUTSIDE aside so it's never clipped by overflow */}
      <button
        onClick={toggleSidebar}
        style={{ left: collapsed ? '52px' : '248px' }}
        className="hidden lg:flex fixed top-[72px] w-8 h-8 rounded-full bg-primary border-2 border-primary items-center justify-center text-primary-foreground shadow-lg hover:bg-primary/90 hover:scale-110 transition-all duration-300 z-[9999]"
        title={collapsed ? "Expandir Menu" : "Recolher Menu"}
      >
        <ChevronRight className={cn("h-4 w-4 transition-transform duration-300", collapsed ? "rotate-0" : "rotate-180")} />
      </button>
    </>
  );
}
