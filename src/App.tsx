import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardPage from "./pages/DashboardPage";
import DeliveriesPage from "./pages/DeliveriesPage";
import UsersPage from "./pages/UsersPage";
import RegionsPage from "./pages/RegionsPage";
import OccurrencesPage from "./pages/OccurrencesPage";
import ReviewsPage from "./pages/ReviewsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/deliveries" element={<DeliveriesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/companies" element={<UsersPage />} />
          <Route path="/regions" element={<RegionsPage />} />
          <Route path="/occurrences" element={<OccurrencesPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
