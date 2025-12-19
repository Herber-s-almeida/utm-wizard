import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MediaPlans from "./pages/MediaPlans";
import NewMediaPlan from "./pages/NewMediaPlan";
import MediaPlanDetail from "./pages/MediaPlanDetail";
import NotFound from "./pages/NotFound";
import SubdivisionsPage from "./pages/config/SubdivisionsPage";
import MomentsPage from "./pages/config/MomentsPage";
import FunnelStagesPage from "./pages/config/FunnelStagesPage";
import MediumsPage from "./pages/config/MediumsPage";
import VehiclesPage from "./pages/config/VehiclesPage";
import TargetsPage from "./pages/config/TargetsPage";
import CreativesPage from "./pages/config/CreativesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/media-plans" element={<ProtectedRoute><MediaPlans /></ProtectedRoute>} />
            <Route path="/media-plans/new" element={<ProtectedRoute><NewMediaPlan /></ProtectedRoute>} />
            <Route path="/media-plans/:id" element={<ProtectedRoute><MediaPlanDetail /></ProtectedRoute>} />
            <Route path="/config/subdivisions" element={<ProtectedRoute><SubdivisionsPage /></ProtectedRoute>} />
            <Route path="/config/moments" element={<ProtectedRoute><MomentsPage /></ProtectedRoute>} />
            <Route path="/config/funnel-stages" element={<ProtectedRoute><FunnelStagesPage /></ProtectedRoute>} />
            <Route path="/config/mediums" element={<ProtectedRoute><MediumsPage /></ProtectedRoute>} />
            <Route path="/config/vehicles" element={<ProtectedRoute><VehiclesPage /></ProtectedRoute>} />
            <Route path="/config/targets" element={<ProtectedRoute><TargetsPage /></ProtectedRoute>} />
            <Route path="/config/creatives" element={<ProtectedRoute><CreativesPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
