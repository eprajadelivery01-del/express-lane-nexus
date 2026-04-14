import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CityProvider } from "@/contexts/CityContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import InvitePage from "./pages/InvitePage";
import ProfilePage from "./pages/ProfilePage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import IndexPage from "./pages/Index";
import DashboardPage from "./pages/DashboardPage";
import DeliveriesPage from "./pages/DeliveriesPage";
import DriversPage from "./pages/DriversPage";
import RegionsPage from "./pages/RegionsPage";
import ReportsPage from "./pages/ReportsPage";
import NotFound from "./pages/NotFound";
import ScrollToTop from "@/components/shared/ScrollToTop";
import { PageTransition } from "@/components/shared/PageTransition";
import BusinessChatPage from "./pages/business/BusinessChatPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CityProvider>
          <AuthProvider>
              <Routes>
                 <Route path="/" element={<Navigate to="/admin" replace />} />
                 <Route path="/login" element={<LoginPage />} />
                 
                 <Route path="/admin" element={<PageTransition><ProtectedRoute requiredRole="admin"><DashboardPage /></ProtectedRoute></PageTransition>} />
                 <Route path="/admin/deliveries" element={<PageTransition><ProtectedRoute requiredRole="admin"><DeliveriesPage /></ProtectedRoute></PageTransition>} />
                 <Route path="/admin/map" element={<Navigate to="/admin/regions" replace />} />
                 <Route path="/admin/companies" element={<PageTransition><ProtectedRoute requiredRole="admin"><CompaniesPage /></ProtectedRoute></PageTransition>} />
                 <Route path="/admin/drivers" element={<PageTransition><ProtectedRoute requiredRole="admin"><DriversPage /></ProtectedRoute></PageTransition>} />
                 <Route path="/admin/regions" element={<PageTransition><ProtectedRoute requiredRole="admin"><RegionsPage /></ProtectedRoute></PageTransition>} />
                 <Route path="/admin/reviews" element={<PageTransition><ProtectedRoute requiredRole="admin"><ReviewsPage /></ProtectedRoute></PageTransition>} />
                 <Route path="/admin/reports" element={<PageTransition><ProtectedRoute requiredRole="admin"><ReportsPage /></ProtectedRoute></PageTransition>} />
                 <Route path="/admin/profile" element={<PageTransition><ProtectedRoute requiredRole="admin"><ProfilePage /></ProtectedRoute></PageTransition>} />
                 
                 <Route path="/admin/chat" element={<PageTransition><BusinessChatPage /></PageTransition>} />
                 <Route path="/chat" element={<PageTransition><BusinessChatPage /></PageTransition>} />

                 <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
            </Routes>
          </AuthProvider>
        </CityProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
