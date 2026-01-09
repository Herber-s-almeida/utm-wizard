import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { EnvironmentProvider } from "@/contexts/EnvironmentContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SectionProtectedRoute } from "@/components/SectionProtectedRoute";
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
import EnvironmentMembersPage from "./pages/admin/EnvironmentMembersPage";
import AccountPage from "./pages/AccountPage";
import TrashPage from "./pages/TrashPage";
import DetailTypesPage from "./pages/config/DetailTypesPage";
import ClientsPage from "./pages/config/ClientsPage";

// Finance Manager imports
import { FinanceLayout } from "./components/layout/FinanceLayout";
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import ForecastPage from "./pages/finance/ForecastPage";
import ActualsPage from "./pages/finance/ActualsPage";
import DocumentsPage from "./pages/finance/DocumentsPage";
import DocumentFormPage from "./pages/finance/DocumentFormPage";
import DocumentDetailPage from "./pages/finance/DocumentDetailPage";
import PaymentsPage from "./pages/finance/PaymentsPage";
import RevenuePage from "./pages/finance/RevenuePage";
import AuditPage from "./pages/finance/AuditPage";
import SettingsPage from "./pages/finance/SettingsPage";

// Finance Library Pages
import AccountManagersPage from "./pages/finance/library/AccountManagersPage";
import ProductsPage from "./pages/finance/library/ProductsPage";
import CampaignsPage from "./pages/finance/library/CampaignsPage";
import CostCentersPage from "./pages/finance/library/CostCentersPage";
import TeamsPage from "./pages/finance/library/TeamsPage";
import AccountsPage from "./pages/finance/library/AccountsPage";
import PackagesPage from "./pages/finance/library/PackagesPage";
import MacroClassificationsPage from "./pages/finance/library/MacroClassificationsPage";
import ExpenseClassificationsPage from "./pages/finance/library/ExpenseClassificationsPage";
import VendorsPage from "./pages/finance/library/VendorsPage";
import DocumentTypesPage from "./pages/finance/library/DocumentTypesPage";
import FinanceStatusesPage from "./pages/finance/library/StatusesPage";
import RequestTypesPage from "./pages/finance/library/RequestTypesPage";

function AppWithEnvironment() {
  const { user } = useAuth();
  
  return (
    <EnvironmentProvider currentUserId={user?.id ?? null}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/executive-dashboard" element={<ProtectedRoute><SectionProtectedRoute section="executive_dashboard"><ExecutiveDashboard /></SectionProtectedRoute></ProtectedRoute>} />
          <Route path="/media-plans" element={<ProtectedRoute><SectionProtectedRoute section="media_plans"><MediaPlans /></SectionProtectedRoute></ProtectedRoute>} />
          <Route path="/media-plans/new" element={<ProtectedRoute><SectionProtectedRoute section="media_plans" minLevel="edit"><NewMediaPlanBudget /></SectionProtectedRoute></ProtectedRoute>} />
          <Route path="/media-plans/:id" element={<ProtectedRoute><SectionProtectedRoute section="media_plans"><MediaPlanDetail /></SectionProtectedRoute></ProtectedRoute>} />
          <Route path="/media-plans/:id/edit" element={<ProtectedRoute><SectionProtectedRoute section="media_plans" minLevel="edit"><EditMediaPlan /></SectionProtectedRoute></ProtectedRoute>} />
          <Route path="/media-plans/:id/resources" element={<ProtectedRoute><SectionProtectedRoute section="media_resources"><MediaResourcesPage /></SectionProtectedRoute></ProtectedRoute>} />
          <Route path="/media-plans/:id/taxonomy" element={<ProtectedRoute><SectionProtectedRoute section="taxonomy"><TaxonomyPage /></SectionProtectedRoute></ProtectedRoute>} />
          <Route path="/media-plans/:id/reports" element={<ProtectedRoute><SectionProtectedRoute section="reports"><MediaPlanReports /></SectionProtectedRoute></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><SectionProtectedRoute section="reports"><ReportsPage /></SectionProtectedRoute></ProtectedRoute>} />
          <Route path="/reports/:id" element={<ProtectedRoute><SectionProtectedRoute section="reports"><MediaPlanReports /></SectionProtectedRoute></ProtectedRoute>} />
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
          <Route path="/config/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/trash" element={<ProtectedRoute><TrashPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/menu-visibility" element={<AdminRoute><AdminMenuVisibility /></AdminRoute>} />
          <Route path="/settings/team" element={<ProtectedRoute><EnvironmentMembersPage /></ProtectedRoute>} />
          
          {/* Finance Manager Routes */}
          <Route path="/finance" element={<ProtectedRoute><SectionProtectedRoute section="finance"><FinanceLayout /></SectionProtectedRoute></ProtectedRoute>}>
            <Route index element={<FinanceDashboard />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="forecast/:planId" element={<ForecastPage />} />
            <Route path="actuals" element={<ActualsPage />} />
            <Route path="actuals/:planId" element={<ActualsPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="documents/new" element={<DocumentFormPage />} />
            <Route path="documents/:id" element={<DocumentDetailPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="revenue" element={<RevenuePage />} />
            
            {/* Finance Library Routes */}
            <Route path="library/account-managers" element={<AccountManagersPage />} />
            <Route path="library/products" element={<ProductsPage />} />
            <Route path="library/campaigns" element={<CampaignsPage />} />
            <Route path="library/cost-centers" element={<CostCentersPage />} />
            <Route path="library/teams" element={<TeamsPage />} />
            <Route path="library/accounts" element={<AccountsPage />} />
            <Route path="library/packages" element={<PackagesPage />} />
            <Route path="library/macro-classifications" element={<MacroClassificationsPage />} />
            <Route path="library/expense-classifications" element={<ExpenseClassificationsPage />} />
            <Route path="library/vendors" element={<VendorsPage />} />
            <Route path="library/document-types" element={<DocumentTypesPage />} />
            <Route path="library/statuses" element={<FinanceStatusesPage />} />
            <Route path="library/request-types" element={<RequestTypesPage />} />
            
            <Route path="audit" element={<AuditPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          
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
