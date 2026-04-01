import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DeliveriesPage from "./pages/DeliveriesPage";
import UsersPage from "./pages/UsersPage";
import RegionsPage from "./pages/RegionsPage";
import OccurrencesPage from "./pages/OccurrencesPage";
import ReviewsPage from "./pages/ReviewsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

// Driver & Business
import DriverHomePage from "./pages/driver/DriverHomePage";
import BusinessHomePage from "./pages/business/BusinessHomePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/admin" replace />} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><DashboardPage /></ProtectedRoute>} />
            <Route path="/admin/deliveries" element={<ProtectedRoute requiredRole="admin"><DeliveriesPage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
            <Route path="/admin/companies" element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
            <Route path="/admin/regions" element={<ProtectedRoute requiredRole="admin"><RegionsPage /></ProtectedRoute>} />
            <Route path="/admin/occurrences" element={<ProtectedRoute requiredRole="admin"><OccurrencesPage /></ProtectedRoute>} />
            <Route path="/admin/reviews" element={<ProtectedRoute requiredRole="admin"><ReviewsPage /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><ReportsPage /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><SettingsPage /></ProtectedRoute>} />

            {/* Driver */}
            <Route path="/driver" element={<ProtectedRoute requiredRole="driver"><DriverHomePage /></ProtectedRoute>} />

            {/* Business */}
            <Route path="/business" element={<ProtectedRoute requiredRole="company"><BusinessHomePage /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
