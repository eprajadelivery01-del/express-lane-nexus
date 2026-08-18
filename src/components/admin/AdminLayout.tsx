import { useAdminRealtime } from "@/services/realtime";
import { ReactNode, useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { cn } from "@/lib/utils";
import { useScreenSize } from "@/hooks/useScreenSize";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  fullHeight?: boolean;
}

export function AdminLayout({ children, title, subtitle, fullHeight }: AdminLayoutProps) {
  // Activate global realtime listeners (Deliveries and Drivers)
  useAdminRealtime();
  
  // Calculate dynamic screen size and CSS --vh custom property
  useScreenSize();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("epj_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden min-w-0 min-h-0">
      <AdminSidebar onCollapsedChange={setSidebarCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 transition-all duration-300">
        <AdminHeader title={title} subtitle={subtitle} />
        <main className={cn(
          "flex-1 min-w-0 min-h-0 animate-fade-in",
          fullHeight ? "p-0 overflow-hidden" : "p-4 md:p-6 overflow-y-scroll"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
