import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CityProvider } from "@/contexts/CityContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeProvider } from "@/contexts/ThemeContext";

import LoginPage from "./pages/LoginPage";
import InvitePage from "./pages/InvitePage";
import ProfilePage from "./pages/ProfilePage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import IndexPage from "./pages/Index";
import TrustPage from "./pages/TrustPage";
import DashboardPage from "./pages/DashboardPage";
import DeliveriesPage from "./pages/DeliveriesPage";
import DriversPage from "./pages/DriversPage";
import RegionsPage from "./pages/RegionsPage";
import BasesPage from "./pages/BasesPage";
import TrackingPage from "./pages/TrackingPage";
import ReportsPage from "./pages/ReportsPage";
import NotFound from "./pages/NotFound";
import ScrollToTop from "@/components/shared/ScrollToTop";
import { PageTransition } from "@/components/shared/PageTransition";
import AdminChatPage from "./pages/admin/AdminChatPage";
import CouponsPage from "./pages/admin/CouponsPage";
import CompaniesPage from "./pages/CompaniesPage";
import StoreSalesPage from "./pages/StoreSalesPage";
import PricingTablesPage from "./pages/admin/PricingTablesPage";
import AdminInvoicesPage from "./pages/admin/AdminInvoicesPage";
import { AdminReportsPage } from "./pages/admin/AdminReportsPage";
import { AdminProfilePage } from "./pages/admin/AdminProfilePage";
import { AdminNotificationsPage } from "./pages/admin/AdminNotificationsPage";

// Driver (Entregador) pages
import DriverHomePage from "./pages/driver/DriverHomePage";
import DriverDeliveriesPage from "./pages/driver/DriverDeliveriesPage";
import DriverOccurrencesPage from "./pages/driver/DriverOccurrencesPage";
import DriverChatPage from "./pages/driver/DriverChatPage";

// Lojista (business) pages
import BusinessHomePage from "./pages/business/BusinessHomePage";
import BusinessProductsPage from "./pages/business/BusinessProductsPage";
import BusinessProfilePage from "./pages/business/BusinessProfilePage";
import BusinessChatPage from "./pages/business/BusinessChatPage";

// Lojista legacy pages (sidebar-linked)
import LojistaCustPage from "./pages/lojista/BusinessCustomersPage";
import LojistaFinancePage from "./pages/lojista/BusinessFinancePage";
import LojistaHistoryPage from "./pages/lojista/BusinessHistoryPage";
import LojistaOrdersPage from "./pages/lojista/BusinessHomePage";
import MerchantInvoicesPage from "./pages/lojista/MerchantInvoicesPage";
import { GlobalChatListener } from "@/hooks/useGlobalChatNotifications";
import { GlobalAttackMonitor } from "@/hooks/GlobalAttackMonitor";
import { MarketingReceiptListener } from "@/components/admin/MarketingReceiptListener";

const ReviewsPage = () => <div>Reviews - Em construção</div>;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CityProvider>
            <AuthProvider>
              <GlobalChatListener />
              <GlobalAttackMonitor />
              <MarketingReceiptListener />
              <Routes>
                   <Route path="/" element={<Navigate to="/admin" replace />} />
                   <Route path="/login" element={<LoginPage />} />
                   <Route path="/terms" element={<TermsPage />} />
                   <Route path="/privacy" element={<PrivacyPage />} />
                   <Route path="/trust" element={<TrustPage />} />
                   <Route path="/invite/:token" element={<InvitePage />} />
                   
                   {/* Admin Routes */}
                   <Route path="/admin" element={<PageTransition><ProtectedRoute requiredRole="admin"><DashboardPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/deliveries" element={<PageTransition><ProtectedRoute requiredRole="admin"><DeliveriesPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/corridas" element={<Navigate to="/admin/deliveries" replace />} />
                   <Route path="/admin/tracking" element={<PageTransition><ProtectedRoute requiredRole="admin"><TrackingPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/map" element={<Navigate to="/admin/tracking" replace />} />
                   <Route path="/admin/companies" element={<PageTransition><ProtectedRoute requiredRole="admin"><CompaniesPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/sales" element={<PageTransition><ProtectedRoute requiredRole="admin"><StoreSalesPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/drivers" element={<PageTransition><ProtectedRoute requiredRole="admin"><DriversPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/bases" element={<PageTransition><ProtectedRoute requiredRole="admin"><BasesPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/regions" element={<PageTransition><ProtectedRoute requiredRole="admin"><RegionsPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/pricing-tables" element={<PageTransition><ProtectedRoute requiredRole="admin"><PricingTablesPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/coupons" element={<PageTransition><ProtectedRoute requiredRole="admin"><CouponsPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/invoices" element={<PageTransition><ProtectedRoute requiredRole="admin"><AdminInvoicesPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/reviews" element={<PageTransition><ProtectedRoute requiredRole="admin"><ReviewsPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/reports" element={<PageTransition><ProtectedRoute requiredRole="admin"><ReportsPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/profile" element={<PageTransition><ProtectedRoute requiredRole="admin"><ProfilePage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/notifications" element={<PageTransition><ProtectedRoute requiredRole="admin"><AdminNotificationsPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/admin/chat" element={<PageTransition><ProtectedRoute requiredRole="admin"><AdminChatPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/chat" element={<PageTransition><ProtectedRoute requiredRole="admin"><AdminChatPage /></ProtectedRoute></PageTransition>} />

                   {/* Lojista (Business) Routes */}
                   <Route path="/business" element={<PageTransition><ProtectedRoute requiredRole="company"><BusinessHomePage /></ProtectedRoute></PageTransition>} />
                   <Route path="/business/orders" element={<PageTransition><ProtectedRoute requiredRole="company"><LojistaOrdersPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/business/products" element={<PageTransition><ProtectedRoute requiredRole="company"><BusinessProductsPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/business/profile" element={<PageTransition><ProtectedRoute requiredRole="company"><BusinessProfilePage /></ProtectedRoute></PageTransition>} />
                   <Route path="/business/chat" element={<PageTransition><ProtectedRoute requiredRole="company"><BusinessChatPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/business/customers" element={<PageTransition><ProtectedRoute requiredRole="company"><LojistaCustPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/business/finance" element={<PageTransition><ProtectedRoute requiredRole="company"><LojistaFinancePage /></ProtectedRoute></PageTransition>} />
                   <Route path="/business/invoices" element={<PageTransition><ProtectedRoute requiredRole="company"><MerchantInvoicesPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/business/history" element={<PageTransition><ProtectedRoute requiredRole="company"><LojistaHistoryPage /></ProtectedRoute></PageTransition>} />

                   {/* Driver (Entregador) Routes */}
                   <Route path="/driver" element={<PageTransition><ProtectedRoute requiredRole="driver"><DriverHomePage /></ProtectedRoute></PageTransition>} />
                   <Route path="/driver/deliveries" element={<PageTransition><ProtectedRoute requiredRole="driver"><DriverDeliveriesPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/driver/occurrences" element={<PageTransition><ProtectedRoute requiredRole="driver"><DriverOccurrencesPage /></ProtectedRoute></PageTransition>} />
                   <Route path="/driver/chat" element={<PageTransition><ProtectedRoute requiredRole="driver"><DriverChatPage /></ProtectedRoute></PageTransition>} />

                   <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
              </Routes>
            </AuthProvider>
          </CityProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
