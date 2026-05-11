import { useAdminRealtime } from "@/services/realtime";
import { ReactNode, useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  fullHeight?: boolean;
}

export function AdminLayout({ children, title, subtitle, fullHeight }: AdminLayoutProps) {
  // Activate global realtime listeners (Deliveries and Drivers)
  useAdminRealtime();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("epj_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar onCollapsedChange={setSidebarCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <AdminHeader title={title} subtitle={subtitle} />
        <main className={cn(
          "flex-1 animate-fade-in flex flex-col",
          fullHeight ? "p-0 overflow-hidden" : "p-4 md:p-6 overflow-y-auto custom-scrollbar"
        )}>
          <div className="flex-1 relative flex flex-col min-h-0">
            {children}
          </div>
          
          {/* Global Branding Footer */}
          {!fullHeight && (
            <div className="w-full py-10 flex justify-center opacity-10 pointer-events-none select-none mt-auto">
              <p className="text-[10px] font-black tracking-[0.4em] text-muted-foreground uppercase">
                BONASOFT
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
