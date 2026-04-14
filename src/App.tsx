import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CityProvider } from "@/contexts/CityContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import LoginPage from "./pages/cliente/LoginPage";
import InvitePage from "./pages/cliente/InvitePage";
import BusinessProfilePage from "./pages/lojista/BusinessProfilePage";
import BusinessHomePage from "./pages/lojista/BusinessHomePage";
import BusinessMapPage from "./pages/lojista/BusinessMapPage";
import BusinessCustomersPage from "./pages/lojista/BusinessCustomersPage";
import CompaniesPage from "./pages/CompaniesPage";
import DriversPage from "./pages/DriversPage";
import BusinessHistoryPage from "./pages/lojista/BusinessHistoryPage";
import BusinessFinancePage from "./pages/lojista/BusinessFinancePage";
import NotFound from "./pages/NotFound";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import DriverHomePage from "./pages/entregador/DriverHomePage";
import BusinessProductsPage from "./pages/lojista/BusinessProductsPage";

import ClienteIndex from "./pages/cliente/Index";

import ScrollToTop from "@/components/shared/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <CityProvider>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/invite/:token" element={<InvitePage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/business" element={<ProtectedRoute requiredRole="company"><BusinessHomePage /></ProtectedRoute>} />
                <Route path="/business/deliveries" element={<ProtectedRoute requiredRole="company"><CompaniesPage /></ProtectedRoute>} />
                <Route path="/business/map" element={<ProtectedRoute requiredRole="company"><BusinessMapPage /></ProtectedRoute>} />
                <Route path="/business/customers" element={<ProtectedRoute requiredRole="company"><BusinessCustomersPage /></ProtectedRoute>} />
                <Route path="/business/companies" element={<ProtectedRoute requiredRole="company"><CompaniesPage /></ProtectedRoute>} />
                <Route path="/business/drivers" element={<ProtectedRoute requiredRole="company"><DriversPage /></ProtectedRoute>} />
                <Route path="/business/regions" element={<ProtectedRoute requiredRole="company"><BusinessMapPage /></ProtectedRoute>} />
                <Route path="/business/occurrences" element={<ProtectedRoute requiredRole="company"><BusinessHistoryPage /></ProtectedRoute>} />
                <Route path="/business/reviews" element={<ProtectedRoute requiredRole="company"><BusinessHistoryPage /></ProtectedRoute>} />
                <Route path="/business/finance" element={<ProtectedRoute requiredRole="company"><BusinessFinancePage /></ProtectedRoute>} />
                <Route path="/business/settings" element={<ProtectedRoute requiredRole="company"><BusinessProfilePage /></ProtectedRoute>} />
                <Route path="/business/products" element={<ProtectedRoute requiredRole="company"><BusinessProductsPage /></ProtectedRoute>} />

                <Route path="/business/history" element={<ProtectedRoute requiredRole="company"><BusinessHistoryPage /></ProtectedRoute>} />
                <Route path="/business/profile" element={<ProtectedRoute requiredRole="company"><BusinessProfilePage /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/business" replace />} />
              </Routes>
            </AuthProvider>
          </CityProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;
