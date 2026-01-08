import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { EnvironmentProvider } from "@/contexts/EnvironmentContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import MediaPlans from "./pages/MediaPlans";
import NewMediaPlan from "./pages/NewMediaPlan";
import NewMediaPlanBudget from "./pages/NewMediaPlanBudget";
import NewMediaPlanManual from "./pages/NewMediaPlanManual";
import MediaPlanDetail from "./pages/MediaPlanDetail";
import EditMediaPlan from "./pages/EditMediaPlan";
import MediaResourcesPage from "./pages/MediaResourcesPage";
import TaxonomyPage from "./pages/TaxonomyPage";
import MediaPlanReports from "./pages/MediaPlanReports";
import ReportsPage from "./pages/ReportsPage";
import NotFound from "./pages/NotFound";
import SubdivisionsPage from "./pages/config/SubdivisionsPage";
import MomentsPage from "./pages/config/MomentsPage";
import FunnelStagesPage from "./pages/config/FunnelStagesPage";
import MediumsPage from "./pages/config/MediumsPage";
import VehiclesPage from "./pages/config/VehiclesPage";
import TargetsPage from "./pages/config/TargetsPage";
import FormatsPage from "./pages/config/FormatsPage";
import CreativeTypesPage from "./pages/config/CreativeTypesPage";
import StatusesPage from "./pages/config/StatusesPage";
import KpisPage from "./pages/config/KpisPage";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminMenuVisibility from "./pages/admin/AdminMenuVisibility";
import AccountPage from "./pages/AccountPage";
import TrashPage from "./pages/TrashPage";
import DetailTypesPage from "./pages/config/DetailTypesPage";
function AppWithEnvironment() {
  const { user } = useAuth();
  
  return (
    <EnvironmentProvider currentUserId={user?.id ?? null}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/executive-dashboard" element={<ProtectedRoute><ExecutiveDashboard /></ProtectedRoute>} />
          <Route path="/media-plans" element={<ProtectedRoute><MediaPlans /></ProtectedRoute>} />
          <Route path="/media-plans/new" element={<ProtectedRoute><NewMediaPlanBudget /></ProtectedRoute>} />
          <Route path="/media-plans/:id" element={<ProtectedRoute><MediaPlanDetail /></ProtectedRoute>} />
          <Route path="/media-plans/:id/edit" element={<ProtectedRoute><EditMediaPlan /></ProtectedRoute>} />
          <Route path="/media-plans/:id/resources" element={<ProtectedRoute><MediaResourcesPage /></ProtectedRoute>} />
          <Route path="/media-plans/:id/taxonomy" element={<ProtectedRoute><TaxonomyPage /></ProtectedRoute>} />
          <Route path="/media-plans/:id/reports" element={<ProtectedRoute><MediaPlanReports /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/reports/:id" element={<ProtectedRoute><MediaPlanReports /></ProtectedRoute>} />
          <Route path="/config/subdivisions" element={<ProtectedRoute><SubdivisionsPage /></ProtectedRoute>} />
          <Route path="/config/moments" element={<ProtectedRoute><MomentsPage /></ProtectedRoute>} />
          <Route path="/config/funnel-stages" element={<ProtectedRoute><FunnelStagesPage /></ProtectedRoute>} />
          <Route path="/config/mediums" element={<ProtectedRoute><MediumsPage /></ProtectedRoute>} />
          <Route path="/config/vehicles" element={<ProtectedRoute><VehiclesPage /></ProtectedRoute>} />
          <Route path="/config/targets" element={<ProtectedRoute><TargetsPage /></ProtectedRoute>} />
          <Route path="/config/formats" element={<ProtectedRoute><FormatsPage /></ProtectedRoute>} />
          <Route path="/config/creative-types" element={<ProtectedRoute><CreativeTypesPage /></ProtectedRoute>} />
          <Route path="/config/statuses" element={<ProtectedRoute><StatusesPage /></ProtectedRoute>} />
          <Route path="/config/kpis" element={<ProtectedRoute><KpisPage /></ProtectedRoute>} />
          <Route path="/config/detail-types" element={<ProtectedRoute><DetailTypesPage /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/trash" element={<ProtectedRoute><TrashPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/menu-visibility" element={<AdminRoute><AdminMenuVisibility /></AdminRoute>} />
          <Route path="/admin/menu-visibility" element={<AdminRoute><AdminMenuVisibility /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </EnvironmentProvider>
  );
}

function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  }));
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppWithEnvironment />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
