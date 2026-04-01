import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Plus, Truck, Star, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { label: "Início", icon: Home, href: "/business" },
  { label: "Nova Entrega", icon: Plus, href: "/business/new-delivery" },
  { label: "Entregas", icon: Truck, href: "/business/deliveries" },
  { label: "Avaliações", icon: Star, href: "/business/reviews" },
];

interface BusinessLayoutProps {
  children: ReactNode;
  title?: string;
}

export function BusinessLayout({ children, title }: BusinessLayoutProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-display font-bold text-foreground">{title || "FleetDash Business"}</h1>
        <button onClick={signOut} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <LogOut className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

      <main className="flex-1 p-4 pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex items-center justify-around py-2 px-4">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
