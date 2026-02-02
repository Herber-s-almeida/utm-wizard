import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Plus, 
  ChevronDown,
  ChevronRight,
  Layers,
  Clock,
  Target,
  Tv,
  Radio,
  Users,
  Image,
  Filter,
  Trash2,
  LogOut,
  User,
  Library,
  Eye,
  CircleDot,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  ShieldCheck,
  Building2,
  Link2,
  Settings,
  BarChart3,
  TrendingUp,
  Wallet,
  Cog
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSystemAdmin } from '@/hooks/useSystemAdmin';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { useEnvironmentPermissions } from '@/hooks/useEnvironmentPermissions';
import { useMediaPlans, useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets, useCreativeTemplates, useBehavioralSegmentations, useMediaObjectives } from '@/hooks/useConfigData';
import { useClients } from '@/hooks/useClients';
import { useFormatsHierarchy } from '@/hooks/useFormatsHierarchy';
import { useCreativeTypes } from '@/hooks/useCreativeTypes';
import { useMenuVisibility } from '@/hooks/useMenuVisibility';
import { useStatuses } from '@/hooks/useStatuses';
import { useCustomKpis } from '@/hooks/useCustomKpis';
import { useLineDetailTypes } from '@/hooks/useLineDetailTypes';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfigItemRow } from './ConfigItemRow';
import { PlanItemRow } from './PlanItemRow';
import { SimplePlanLink } from './SimplePlanLink';
import { EnvironmentSwitcher } from './EnvironmentSwitcher';
import { cn } from '@/lib/utils';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { useSidebarSections, useSidebarSubsections } from '@/hooks/useSidebarSections';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEnvironmentLogo } from '@/hooks/useEnvironmentLogo';

// Dialogs
import { SubdivisionDialog } from '@/components/config/SubdivisionDialog';
import { SimpleConfigDialog } from '@/components/config/SimpleConfigDialog';
import { VehicleDialog } from '@/components/config/VehicleDialog';
import { ChannelDialog } from '@/components/config/ChannelDialog';
import { TargetDialog } from '@/components/config/TargetDialog';
import { FormatWizardDialog } from '@/components/config/FormatWizardDialog';
import { SegmentDialog } from '@/components/config/SegmentDialog';
import { ClientDialog } from '@/components/config/ClientDialog';

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useSystemAdmin();
  const { isViewingOtherEnvironment, userEnvironments, currentEnvironmentId } = useEnvironment();
  const { data: currentProfile } = useCurrentProfile();
  const { canView, isEnvironmentAdmin } = useEnvironmentPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Try to use collapse context, fallback to local state if not in provider
  let isCollapsed = false;
  let toggleCollapse = () => {};
  try {
    const collapseContext = useSidebarCollapse();
    isCollapsed = collapseContext.isCollapsed;
    toggleCollapse = collapseContext.toggleCollapse;
  } catch {
    // Not in provider, use default values
  }
  
  const { draftPlans, activePlans, finishedPlans, trashedPlans, softDelete, restore, permanentDelete } = useMediaPlans();
  const subdivisions = useSubdivisions();
  const moments = useMoments();
  const funnelStages = useFunnelStages();
  const mediums = useMediums();
  const vehicles = useVehicles();
  const channels = useChannels();
  const targets = useTargets();
  const creativeTemplates = useCreativeTemplates();
  const behavioralSegmentations = useBehavioralSegmentations();
  const statuses = useStatuses();
  const clients = useClients();
  const formatsHierarchy = useFormatsHierarchy();
  const creativeTypesGlobal = useCreativeTypes();
  const { isMenuHidden } = useMenuVisibility();
  const mediaObjectives = useMediaObjectives();
  const { customKpis } = useCustomKpis();
  const { types: lineDetailTypes } = useLineDetailTypes();
  const { logoUrl } = useEnvironmentLogo();

  // Get current environment details for display
  const currentEnv = userEnvironments.find(env => env.environment_id === currentEnvironmentId);

  // Section open states - persisted in localStorage
  const { openSections, toggleSection } = useSidebarSections();

  // Vehicle/Subdivision/Format subsections - persisted in localStorage
  const { 
    openVehicles, 
    setOpenVehicles, 
    openSubdivisions, 
    setOpenSubdivisions, 
    openFormats, 
    setOpenFormats 
  } = useSidebarSubsections();

  // Dialog states
  const [subdivisionDialogOpen, setSubdivisionDialogOpen] = useState(false);
  const [momentDialogOpen, setMomentDialogOpen] = useState(false);
  const [funnelStageDialogOpen, setFunnelStageDialogOpen] = useState(false);
  const [mediumDialogOpen, setMediumDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [creativeDialogOpen, setCreativeDialogOpen] = useState(false);
  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);

  // Editing states - track which item is being edited
  const [editingSubdivision, setEditingSubdivision] = useState<any>(null);
  const [editingMoment, setEditingMoment] = useState<any>(null);
  const [editingFunnelStage, setEditingFunnelStage] = useState<any>(null);
  const [editingMedium, setEditingMedium] = useState<any>(null);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [editingTarget, setEditingTarget] = useState<any>(null);
  const [editingCreative, setEditingCreative] = useState<any>(null);
  const [editingSegment, setEditingSegment] = useState<any>(null);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [editingClient, setEditingClient] = useState<any>(null);

  // Track which vehicle is selected for creating a new channel
  const [selectedVehicleForChannel, setSelectedVehicleForChannel] = useState<{ id: string; name: string } | null>(null);


  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  // Get parent subdivisions (only active items)
  const parentSubdivisions = subdivisions.activeItems?.filter(s => !s.parent_id) || [];
  const getChildSubdivisions = (parentId: string) => 
    subdivisions.activeItems?.filter(s => s.parent_id === parentId) || [];

  // Get channels for a vehicle (only active items)
  const getVehicleChannels = (vehicleId: string) => 
    channels.activeItems?.filter(c => c.vehicle_id === vehicleId) || [];

  const MAX_ITEMS = 3;

  // Helper to get existing names for validation (use activeItems to exclude archived)
  const getSubdivisionNames = () => parentSubdivisions.map(s => s.name);
  const getMomentNames = () => moments.activeItems?.map(m => m.name) || [];
  const getFunnelStageNames = () => funnelStages.activeItems?.map(s => s.name) || [];
  const getMediumNames = () => mediums.activeItems?.map(m => m.name) || [];
  const getVehicleNames = () => vehicles.activeItems?.map(v => v.name) || [];
  const getTargetNames = () => targets.activeItems?.map(t => t.name) || [];
  const getCreativeNames = () => creativeTemplates.activeItems?.map(c => c.name) || [];
  const getSegmentNames = () => behavioralSegmentations.activeItems?.map(s => s.name) || [];
  const getStatusNames = () => statuses.activeItems?.map(s => s.name) || [];
  const getClientNames = () => clients.activeItems?.map(c => c.name) || [];

  return (
    <div className={cn(
      "flex flex-col h-full border-r border-sidebar-border bg-sidebar overflow-x-hidden transition-all duration-300",
      isCollapsed ? "w-[72px]" : "w-80"
    )}>
      {/* Header - Fixed at top */}
      <div className={cn(
        "shrink-0 border-b border-sidebar-border",
        isCollapsed ? "p-2" : "p-3"
      )}>
        <div className={cn(
          "flex items-center gap-3",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <Link to="/media-plan-dashboard" className="flex items-center gap-3 min-w-0 flex-1">
              {/* Logo Circle */}
              <Avatar className="h-10 w-10 shrink-0 border-2 border-primary/30">
                {logoUrl ? (
                  <AvatarImage src={logoUrl} alt="Logo" className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  Logo
                </AvatarFallback>
              </Avatar>
              
              {/* Title & Subtitle */}
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-sm text-primary truncate">
                  MediaPlanning
                </span>
                <span className="text-[10px] font-medium text-muted-foreground tracking-wider">
                  Gerenciador de Planos de Mídia
                </span>
              </div>
            </Link>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 shrink-0"
                onClick={toggleCollapse}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? "Expandir menu" : "Recolher menu"}
            </TooltipContent>
          </Tooltip>
        </div>
        
        {/* Environment Switcher */}
        {!isCollapsed && <EnvironmentSwitcher className="mt-2" />}
      </div>

      {/* Collapsed state - show only icons */}
      {isCollapsed ? (
        <div className="flex-1 overflow-y-auto py-3 px-2 flex flex-col items-center gap-1 bg-background">
          {/* Visão Gerencial */}
          {canView('executive_dashboard') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/executive-dashboard">
                  <Button 
                    variant={isActive('/executive-dashboard') ? 'secondary' : 'ghost'} 
                    size="icon"
                    className="h-9 w-9"
                  >
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Visão Gerencial</TooltipContent>
            </Tooltip>
          )}

          {/* Relatórios */}
          {canView('reports') && !isMenuHidden('reports') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/reports">
                  <Button 
                    variant={location.pathname.startsWith('/reports') ? 'secondary' : 'ghost'} 
                    size="icon"
                    className="h-9 w-9"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Relatórios</TooltipContent>
            </Tooltip>
          )}

          {/* Financeiro */}
          {canView('finance') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/finance">
                  <Button 
                    variant={location.pathname.startsWith('/finance') ? 'secondary' : 'ghost'} 
                    size="icon"
                    className="h-9 w-9 text-emerald-600"
                  >
                    <Wallet className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Financeiro</TooltipContent>
            </Tooltip>
          )}

          <div className="w-8 h-px bg-border my-2" />

          {/* Planos de Mídia (antigo Dashboard) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/media-plan-dashboard">
                <Button 
                  variant={isActive('/media-plan-dashboard') || location.pathname.startsWith('/media-plans') || location.pathname.startsWith('/plan/') ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Planos de Mídia</TooltipContent>
          </Tooltip>

          {/* Recursos de Mídia */}
          {canView('media_resources') && !isMenuHidden('media_resources') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/media-resources">
                  <Button 
                    variant={location.pathname.startsWith('/media-resources') || location.pathname.startsWith('/resources') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-9 w-9"
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Recursos de Mídia</TooltipContent>
            </Tooltip>
          )}

          {/* Taxonomia */}
          {canView('taxonomy') && !isMenuHidden('taxonomy') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/taxonomy">
                  <Button 
                    variant={location.pathname.startsWith('/taxonomy') ? 'secondary' : 'ghost'} 
                    size="icon"
                    className="h-9 w-9"
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Taxonomia</TooltipContent>
            </Tooltip>
          )}

          <div className="w-8 h-px bg-border my-2" />

          {/* Biblioteca */}
          {canView('library') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/config/subdivisions">
                  <Button 
                    variant={location.pathname.startsWith('/config') ? 'secondary' : 'ghost'} 
                    size="icon"
                    className="h-9 w-9"
                  >
                    <Library className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Biblioteca</TooltipContent>
            </Tooltip>
          )}

          {/* Lixeira */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/trash">
                <Button 
                  variant={isActive('/trash') ? 'secondary' : 'ghost'} 
                  size="icon"
                  className="h-9 w-9"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Lixeira</TooltipContent>
          </Tooltip>
        </div>
      ) : (
      <ScrollArea className="flex-1 py-3 px-2 overflow-x-hidden bg-background">
        {/* DASHBOARD GERENCIAL */}
        {canView('executive_dashboard') && (
        <div className="mb-4">
          <h3 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Visão Gerencial
          </h3>

          <div className="flex items-center">
            <Link to="/executive-dashboard" className="flex-1">
              <Button 
                variant={isActive('/executive-dashboard') ? 'secondary' : 'ghost'} 
                size="sm" 
                className="w-full justify-start gap-2 h-8 text-xs"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Dashboard Gerencial</span>
              </Button>
            </Link>
          </div>
        </div>
        )}

        {/* RELATÓRIOS */}
        {canView('reports') && !isMenuHidden('reports') && (
          <div className="mb-4">
            <Collapsible open={openSections.reportsSection} onOpenChange={() => toggleSection('reportsSection')}>
              <CollapsibleTrigger asChild>
                <button className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-muted/50 rounded-md transition-colors">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Relatórios
                  </span>
                  {openSections.reportsSection ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex items-center">
                  <Link to="/reports" className="flex-1">
                    <Button 
                      variant={location.pathname.startsWith('/reports') ? 'secondary' : 'ghost'} 
                      size="sm" 
                      className="w-full justify-start gap-2 h-8 text-xs"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>Dashboard de Performance</span>
                    </Button>
                  </Link>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to="/reports">
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">Ver todos os relatórios</TooltipContent>
                  </Tooltip>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* FINANCE MANAGER */}
        {canView('finance') && (
        <div className="mb-4">
          <Collapsible open={openSections.financeSection} onOpenChange={() => toggleSection('financeSection')}>
            <CollapsibleTrigger asChild>
              <button className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-muted/50 rounded-md transition-colors">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Financeiro
                </span>
                {openSections.financeSection ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex items-center">
                <Link to="/finance" className="flex-1">
                  <Button 
                    variant={location.pathname.startsWith('/finance') ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="w-full justify-start gap-2 h-8 text-xs text-emerald-600 hover:text-emerald-700"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    <span>Finance Manager</span>
                  </Button>
                </Link>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        )}

        {/* PLANOS DE MÍDIA */}
        {canView('media_plans') && (
        <div className="mb-4">
          <Collapsible open={openSections.mediaPlansSection} onOpenChange={() => toggleSection('mediaPlansSection')}>
            <CollapsibleTrigger asChild>
              <button className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-muted/50 rounded-md transition-colors">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Gerenciar Planos de Mídia
                </span>
                {openSections.mediaPlansSection ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
          {/* Planos de Mídia - Expansível */}
          <Collapsible open={openSections.mediaPlans} onOpenChange={() => toggleSection('mediaPlans')}>
            <div className="flex items-center">
              <CollapsibleTrigger asChild>
                <Button 
                  variant={isActive('/media-plan-dashboard') || isActive('/media-plans') ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="flex-1 justify-start gap-2 h-8 text-xs"
                >
                  {openSections.mediaPlans ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Planos de Mídia</span>
                </Button>
              </CollapsibleTrigger>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/media-plan-dashboard">
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Ver todos os planos</TooltipContent>
              </Tooltip>
            </div>
            <CollapsibleContent className="pl-4">
              {/* Rascunhos */}
              <Collapsible open={openSections.draftPlans} onOpenChange={() => toggleSection('draftPlans')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs">
                    {openSections.draftPlans ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-medium">Rascunhos</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{draftPlans.data?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {draftPlans.data?.slice(0, MAX_ITEMS).map(plan => (
                    <PlanItemRow
                      key={plan.id}
                      id={plan.id}
                      slug={plan.slug}
                      name={plan.name}
                      onDelete={() => softDelete.mutate(plan.id)}
                    />
                  ))}
                  {(draftPlans.data?.length || 0) > MAX_ITEMS && (
                    <Link to="/media-plans?status=draft">
                      <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                        Ver todos ({draftPlans.data?.length})
                      </Button>
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Ativos */}
              <Collapsible open={openSections.activePlans} onOpenChange={() => toggleSection('activePlans')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs">
                    {openSections.activePlans ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-medium">Ativos</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{activePlans.data?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {activePlans.data?.slice(0, MAX_ITEMS).map(plan => (
                    <PlanItemRow
                      key={plan.id}
                      id={plan.id}
                      slug={plan.slug}
                      name={plan.name}
                      onDelete={() => softDelete.mutate(plan.id)}
                    />
                  ))}
                  {(activePlans.data?.length || 0) > MAX_ITEMS && (
                    <Link to="/media-plans?status=active">
                      <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                        Ver todos ({activePlans.data?.length})
                      </Button>
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Finalizados */}
              <Collapsible open={openSections.finishedPlans} onOpenChange={() => toggleSection('finishedPlans')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs">
                    {openSections.finishedPlans ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-medium">Finalizados</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{finishedPlans.data?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {finishedPlans.data?.slice(0, MAX_ITEMS).map(plan => (
                    <PlanItemRow
                      key={plan.id}
                      id={plan.id}
                      slug={plan.slug}
                      name={plan.name}
                      onDelete={() => softDelete.mutate(plan.id)}
                    />
                  ))}
                  {(finishedPlans.data?.length || 0) > MAX_ITEMS && (
                    <Link to="/media-plans?status=completed">
                      <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                        Ver todos ({finishedPlans.data?.length})
                      </Button>
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Criar novo plano */}
              <Link to="/media-plans/new">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  Novo plano
                </Button>
              </Link>
            </CollapsibleContent>
          </Collapsible>
            </CollapsibleContent>
          </Collapsible>
        </div>
        )}

        {/* RECURSOS DE MÍDIA */}
        {canView('media_resources') && !isMenuHidden('media_resources') && (
        <div className="mb-4">
          <Collapsible open={openSections.mediaResourcesSection} onOpenChange={() => toggleSection('mediaResourcesSection')}>
            <CollapsibleTrigger asChild>
              <button className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-muted/50 rounded-md transition-colors">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  Recursos de Mídia
                </span>
                {openSections.mediaResourcesSection ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>

          {/* Planos de Mídia para recursos */}
          <Collapsible open={openSections.mediaResources} onOpenChange={() => toggleSection('mediaResources')}>
            <div className="flex items-center">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 justify-start gap-2 h-8 text-xs"
                >
                  {openSections.mediaResources ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <FileText className="h-3.5 w-3.5" />
                  <span>Recursos por Plano</span>
                </Button>
              </CollapsibleTrigger>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/media-resources">
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Ver todos os Recursos</TooltipContent>
              </Tooltip>
            </div>
            <CollapsibleContent className="pl-4">
              {/* Rascunhos */}
              <Collapsible open={openSections.resourcesDraftPlans} onOpenChange={() => toggleSection('resourcesDraftPlans')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs">
                    {openSections.resourcesDraftPlans ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-medium">Rascunhos</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{draftPlans.data?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {draftPlans.data?.slice(0, MAX_ITEMS).map(plan => (
                    <SimplePlanLink
                      key={plan.id}
                      id={plan.id}
                      slug={plan.slug}
                      name={plan.name}
                      section="resources"
                    />
                  ))}
                  {(draftPlans.data?.length || 0) > MAX_ITEMS && (
                    <Link to="/resources?status=draft">
                      <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                        Ver todos ({draftPlans.data?.length})
                      </Button>
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Ativos */}
              <Collapsible open={openSections.resourcesActivePlans} onOpenChange={() => toggleSection('resourcesActivePlans')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs">
                    {openSections.resourcesActivePlans ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-medium">Ativos</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{activePlans.data?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {activePlans.data?.slice(0, MAX_ITEMS).map(plan => (
                    <SimplePlanLink
                      key={plan.id}
                      id={plan.id}
                      slug={plan.slug}
                      name={plan.name}
                      section="resources"
                    />
                  ))}
                  {(activePlans.data?.length || 0) > MAX_ITEMS && (
                    <Link to="/resources?status=active">
                      <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                        Ver todos ({activePlans.data?.length})
                      </Button>
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Finalizados */}
              <Collapsible open={openSections.resourcesFinishedPlans} onOpenChange={() => toggleSection('resourcesFinishedPlans')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs">
                    {openSections.resourcesFinishedPlans ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-medium">Finalizados</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{finishedPlans.data?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {finishedPlans.data?.slice(0, MAX_ITEMS).map(plan => (
                    <SimplePlanLink
                      key={plan.id}
                      id={plan.id}
                      slug={plan.slug}
                      name={plan.name}
                      section="resources"
                    />
                  ))}
                  {(finishedPlans.data?.length || 0) > MAX_ITEMS && (
                    <Link to="/resources?status=finished">
                      <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                        Ver todos ({finishedPlans.data?.length})
                      </Button>
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CollapsibleContent>
          </Collapsible>
            </CollapsibleContent>
          </Collapsible>
        </div>
        )}

        {/* TAXONOMIA */}
        {canView('taxonomy') && !isMenuHidden('taxonomy') && (
        <div className="mb-4">
          <Collapsible open={openSections.taxonomySection} onOpenChange={() => toggleSection('taxonomySection')}>
            <CollapsibleTrigger asChild>
              <button className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-muted/50 rounded-md transition-colors">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Taxonomia
                </span>
                {openSections.taxonomySection ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
          <Collapsible open={openSections.taxonomy} onOpenChange={() => toggleSection('taxonomy')}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start gap-2 h-8 text-xs"
              >
                {openSections.taxonomy ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Link2 className="h-3.5 w-3.5" />
                <span>UTMs por Plano</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4">
              {/* Rascunhos */}
              <Collapsible open={openSections.taxonomyDraftPlans} onOpenChange={() => toggleSection('taxonomyDraftPlans')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs">
                    {openSections.taxonomyDraftPlans ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-medium">Rascunhos</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{draftPlans.data?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {draftPlans.data?.slice(0, MAX_ITEMS).map(plan => (
                    <SimplePlanLink
                      key={plan.id}
                      id={plan.id}
                      slug={plan.slug}
                      name={plan.name}
                      section="taxonomy"
                    />
                  ))}
                  {(draftPlans.data?.length || 0) > MAX_ITEMS && (
                    <Link to="/taxonomy?status=draft">
                      <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                        Ver todos ({draftPlans.data?.length})
                      </Button>
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Ativos */}
              <Collapsible open={openSections.taxonomyActivePlans} onOpenChange={() => toggleSection('taxonomyActivePlans')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs">
                    {openSections.taxonomyActivePlans ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-medium">Ativos</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{activePlans.data?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {activePlans.data?.slice(0, MAX_ITEMS).map(plan => (
                    <SimplePlanLink
                      key={plan.id}
                      id={plan.id}
                      slug={plan.slug}
                      name={plan.name}
                      section="taxonomy"
                    />
                  ))}
                  {(activePlans.data?.length || 0) > MAX_ITEMS && (
                    <Link to="/taxonomy?status=active">
                      <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                        Ver todos ({activePlans.data?.length})
                      </Button>
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Finalizados */}
              <Collapsible open={openSections.taxonomyFinishedPlans} onOpenChange={() => toggleSection('taxonomyFinishedPlans')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs">
                    {openSections.taxonomyFinishedPlans ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-medium">Finalizados</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{finishedPlans.data?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {finishedPlans.data?.slice(0, MAX_ITEMS).map(plan => (
                    <SimplePlanLink
                      key={plan.id}
                      id={plan.id}
                      slug={plan.slug}
                      name={plan.name}
                      section="taxonomy"
                    />
                  ))}
                  {(finishedPlans.data?.length || 0) > MAX_ITEMS && (
                    <Link to="/taxonomy?status=finished">
                      <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                        Ver todos ({finishedPlans.data?.length})
                      </Button>
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CollapsibleContent>
          </Collapsible>
            </CollapsibleContent>
          </Collapsible>
        </div>
        )}

        {canView('library') && (
        <div className="mb-4">
          <Collapsible open={openSections.library} onOpenChange={() => toggleSection('library')}>
            <CollapsibleTrigger asChild>
              <button className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-muted/50 rounded-md transition-colors">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Library className="h-3 w-3" />
                  Biblioteca
                </span>
                {openSections.library ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
          {/* Clientes */}
          <Collapsible open={openSections.clients} onOpenChange={() => toggleSection('clients')}>
            <div className="group flex items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs min-w-0 overflow-hidden">
                  {openSections.clients ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Clientes</span>
                </Button>
              </CollapsibleTrigger>
              <Link to="/config/clients" className="shrink-0 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent className="pl-4">
              {clients.activeItems?.slice(0, MAX_ITEMS).map(client => (
                <ConfigItemRow
                  key={client.id}
                  name={client.name}
                  onEdit={() => {
                    setEditingClient(client);
                    setClientDialogOpen(true);
                  }}
                  onDelete={() => clients.remove.mutate(client.id)}
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary"
                onClick={() => { setEditingClient(null); setClientDialogOpen(true); }}
              >
                <Plus className="h-3 w-3" />
                Novo
              </Button>
              {(clients.activeItems?.length || 0) > MAX_ITEMS && (
                <Link to="/config/clients">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({clients.activeItems?.length})
                  </Button>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Subdivisões de Plano */}
          <Collapsible open={openSections.subdivisions} onOpenChange={() => toggleSection('subdivisions')}>
            <div className="group flex items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs min-w-0 overflow-hidden">
                  {openSections.subdivisions ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Layers className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Subdivisões de Plano</span>
                </Button>
              </CollapsibleTrigger>
              <Link to="/config/subdivisions" className="shrink-0 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100"> 
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent className="pl-4">
              {parentSubdivisions.slice(0, MAX_ITEMS).map(sub => (
                <Collapsible 
                  key={sub.id} 
                  open={openSubdivisions[sub.id]} 
                  onOpenChange={() => setOpenSubdivisions(prev => ({ ...prev, [sub.id]: !prev[sub.id] }))}
                >
                  <div className="flex items-center min-w-0">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 mr-1">
                        {openSubdivisions[sub.id] ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                      </Button>
                    </CollapsibleTrigger>
                    <ConfigItemRow
                      name={sub.name}
                      onEdit={() => {
                        setEditingSubdivision(sub);
                        setSubdivisionDialogOpen(true);
                      }}
                      onDelete={() => subdivisions.remove.mutate(sub.id)}
                      className="flex-1 min-w-0"
                    />
                  </div>
                  <CollapsibleContent className="pl-6">
                    {getChildSubdivisions(sub.id).map(child => (
                      <ConfigItemRow
                        key={child.id}
                        name={child.name}
                        onEdit={() => {
                          setEditingSubdivision(child);
                          setSubdivisionDialogOpen(true);
                        }}
                        onDelete={() => subdivisions.remove.mutate(child.id)}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary"
                onClick={() => setSubdivisionDialogOpen(true)}
              >
                <Plus className="h-3 w-3" />
                Novo
              </Button>
              {parentSubdivisions.length > MAX_ITEMS && (
                <Link to="/config/subdivisions">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({parentSubdivisions.length})
                  </Button>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Momentos de Campanha */}
          <Collapsible open={openSections.moments} onOpenChange={() => toggleSection('moments')}>
            <div className="group flex items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs min-w-0 overflow-hidden">
                  {openSections.moments ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Momentos de Campanha</span>
                </Button>
              </CollapsibleTrigger>
              <Link to="/config/moments" className="shrink-0 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent className="pl-4">
              {moments.activeItems?.slice(0, MAX_ITEMS).map(moment => (
                <ConfigItemRow
                  key={moment.id}
                  name={moment.name}
                  onEdit={() => {
                    setEditingMoment(moment);
                    setMomentDialogOpen(true);
                  }}
                  onDelete={() => moments.remove.mutate(moment.id)}
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary"
                onClick={() => setMomentDialogOpen(true)}
              >
                <Plus className="h-3 w-3" />
                Novo
              </Button>
              {(moments.activeItems?.length || 0) > MAX_ITEMS && (
                <Link to="/config/moments">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({moments.activeItems?.length})
                  </Button>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Fases do Funil */}
          <Collapsible open={openSections.funnelStages} onOpenChange={() => toggleSection('funnelStages')}>
            <div className="group flex items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs min-w-0 overflow-hidden">
                  {openSections.funnelStages ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Filter className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Fases do Funil</span>
                </Button>
              </CollapsibleTrigger>
              <Link to="/config/funnel-stages" className="shrink-0 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent className="pl-4">
              {funnelStages.activeItems?.slice(0, MAX_ITEMS).map(stage => (
                <ConfigItemRow
                  key={stage.id}
                  name={stage.name}
                  onEdit={() => {
                    setEditingFunnelStage(stage);
                    setFunnelStageDialogOpen(true);
                  }}
                  onDelete={() => funnelStages.remove.mutate(stage.id)}
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary"
                onClick={() => setFunnelStageDialogOpen(true)}
              >
                <Plus className="h-3 w-3" />
                Novo
              </Button>
              {(funnelStages.activeItems?.length || 0) > MAX_ITEMS && (
                <Link to="/config/funnel-stages">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({funnelStages.activeItems?.length})
                  </Button>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Meio */}
          <Collapsible open={openSections.mediums} onOpenChange={() => toggleSection('mediums')}>
            <div className="group flex items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs min-w-0 overflow-hidden">
                  {openSections.mediums ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Radio className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Meio</span>
                </Button>
              </CollapsibleTrigger>
              <Link to="/config/mediums" className="shrink-0 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent className="pl-4">
              {mediums.activeItems?.slice(0, MAX_ITEMS).map(medium => (
                <ConfigItemRow
                  key={medium.id}
                  name={medium.name}
                  onEdit={() => {
                    setEditingMedium(medium);
                    setMediumDialogOpen(true);
                  }}
                  onDelete={() => mediums.remove.mutate(medium.id)}
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary"
                onClick={() => setMediumDialogOpen(true)}
              >
                <Plus className="h-3 w-3" />
                Novo
              </Button>
              {(mediums.activeItems?.length || 0) > MAX_ITEMS && (
                <Link to="/config/mediums">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({mediums.activeItems?.length})
                  </Button>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Veículos e Canais */}
          <Collapsible open={openSections.vehicles} onOpenChange={() => toggleSection('vehicles')}>
            <div className="group flex items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs min-w-0 overflow-hidden">
                  {openSections.vehicles ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Tv className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Veículos e Canais</span>
                </Button>
              </CollapsibleTrigger>
              <Link to="/config/vehicles" className="shrink-0 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent className="pl-4">
              {vehicles.activeItems?.slice(0, MAX_ITEMS).map(vehicle => (
                <Collapsible 
                  key={vehicle.id} 
                  open={openVehicles[vehicle.id]} 
                  onOpenChange={() => setOpenVehicles(prev => ({ ...prev, [vehicle.id]: !prev[vehicle.id] }))}
                >
                  <div className="flex items-center min-w-0">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 mr-1">
                        {openVehicles[vehicle.id] ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                      </Button>
                    </CollapsibleTrigger>
                    <ConfigItemRow
                      name={vehicle.name}
                      onEdit={() => {
                        setEditingVehicle(vehicle);
                        setVehicleDialogOpen(true);
                      }}
                      onDelete={() => vehicles.remove.mutate(vehicle.id)}
                      className="flex-1 min-w-0"
                    />
                  </div>
                  <CollapsibleContent className="pl-6">
                    {getVehicleChannels(vehicle.id).map(channel => (
                      <ConfigItemRow
                        key={channel.id}
                        name={channel.name}
                        onEdit={() => {
                          setEditingChannel(channel);
                          setSelectedVehicleForChannel({ id: vehicle.id, name: vehicle.name });
                          setChannelDialogOpen(true);
                        }}
                        onDelete={() => channels.remove.mutate(channel.id)}
                      />
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 h-6 text-[10px] text-primary hover:text-primary"
                      onClick={() => {
                        setEditingChannel(null);
                        setSelectedVehicleForChannel({ id: vehicle.id, name: vehicle.name });
                        setChannelDialogOpen(true);
                      }}
                    >
                      <Plus className="h-2.5 w-2.5" />
                      Novo
                    </Button>
                  </CollapsibleContent>
                </Collapsible>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary"
                onClick={() => setVehicleDialogOpen(true)}
              >
                <Plus className="h-3 w-3" />
                Novo
              </Button>
              {(vehicles.activeItems?.length || 0) > MAX_ITEMS && (
                <Link to="/config/vehicles">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({vehicles.activeItems?.length})
                  </Button>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Segmentação e Target */}
          <Collapsible open={openSections.targets} onOpenChange={() => toggleSection('targets')}>
            <div className="group flex items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs min-w-0 overflow-hidden">
                  {openSections.targets ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Segmentação e Target</span>
                </Button>
              </CollapsibleTrigger>
              <Link to="/config/targets" className="shrink-0 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent className="pl-4">
              {/* Segmentos subsection */}
              <Collapsible open={openSections.segments} onOpenChange={() => toggleSection('segments')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs">
                    {openSections.segments ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                    <span className="font-medium">Segmentos</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{behavioralSegmentations.activeItems?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {behavioralSegmentations.activeItems?.slice(0, MAX_ITEMS).map(segment => (
                    <ConfigItemRow
                      key={segment.id}
                      name={segment.name}
                      onEdit={() => {
                        setEditingSegment(segment);
                        setSegmentDialogOpen(true);
                      }}
                      onDelete={() => behavioralSegmentations.remove.mutate(segment.id)}
                    />
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-6 text-[10px] text-primary hover:text-primary"
                    onClick={() => {
                      setEditingSegment(null);
                      setSegmentDialogOpen(true);
                    }}
                  >
                    <Plus className="h-2.5 w-2.5" />
                    Novo
                  </Button>
                  {(behavioralSegmentations.activeItems?.length || 0) > MAX_ITEMS && (
                    <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                      ... ver todos ({behavioralSegmentations.activeItems?.length})
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Target subsection */}
              <Collapsible open={openSections.targetsList} onOpenChange={() => toggleSection('targetsList')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs">
                    {openSections.targetsList ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                    <span className="font-medium">Target</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{targets.activeItems?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {targets.activeItems?.slice(0, MAX_ITEMS).map(target => (
                    <ConfigItemRow
                      key={target.id}
                      name={target.name}
                      onEdit={() => {
                        setEditingTarget(target);
                        setTargetDialogOpen(true);
                      }}
                      onDelete={() => targets.remove.mutate(target.id)}
                    />
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-6 text-[10px] text-primary hover:text-primary"
                    onClick={() => {
                      setEditingTarget(null);
                      setTargetDialogOpen(true);
                    }}
                  >
                    <Plus className="h-2.5 w-2.5" />
                    Novo
                  </Button>
                  {(targets.activeItems?.length || 0) > MAX_ITEMS && (
                    <Link to="/config/targets">
                      <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                        ... ver todos ({targets.activeItems?.length})
                      </Button>
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CollapsibleContent>
          </Collapsible>

          {/* Formatos e Especificações */}
          <Collapsible open={openSections.creatives} onOpenChange={() => toggleSection('creatives')}>
            <div className="group flex items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs min-w-0 overflow-hidden">
                  {openSections.creatives ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Image className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Formatos e Especificações</span>
                </Button>
              </CollapsibleTrigger>
              <Link to="/config/formats" className="shrink-0 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent className="pl-4">
              {/* Formatos (hierarchy) */}
              <Collapsible open={openSections.formatsList} onOpenChange={() => toggleSection('formatsList')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs">
                    {openSections.formatsList ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                    <span className="font-medium">Formatos</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{formatsHierarchy.data?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {formatsHierarchy.data?.slice(0, MAX_ITEMS).map(format => (
                    <Collapsible 
                      key={format.id}
                      open={openFormats[format.id]} 
                      onOpenChange={() => setOpenFormats(prev => ({ ...prev, [format.id]: !prev[format.id] }))}
                    >
                      <div className="flex items-center min-w-0">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="flex-1 justify-start gap-1 h-6 text-[11px] min-w-0">
                            {format.creative_types.length > 0 ? (
                              openFormats[format.id] ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />
                            ) : (
                              <span className="w-2.5" />
                            )}
                            <span className="truncate">{format.name}</span>
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      {format.creative_types.length > 0 && (
                        <CollapsibleContent className="pl-4">
                          {format.creative_types.slice(0, 3).map(ct => (
                            <div key={ct.id} className="flex items-center px-2 py-0.5 text-[10px] text-muted-foreground truncate">
                              <span className="truncate">{ct.name}</span>
                              <span className="ml-1 text-[9px]">({ct.specifications?.length || 0})</span>
                            </div>
                          ))}
                          {format.creative_types.length > 3 && (
                            <div className="px-2 py-0.5 text-[9px] text-muted-foreground">
                              +{format.creative_types.length - 3} mais
                            </div>
                          )}
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-6 text-[10px] text-primary hover:text-primary"
                    onClick={() => setCreativeDialogOpen(true)}
                  >
                    <Plus className="h-2.5 w-2.5" />
                    Novo
                  </Button>
                  {(formatsHierarchy.data?.length || 0) > MAX_ITEMS && (
                    <Link to="/config/formats">
                      <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                        ... ver todos ({formatsHierarchy.data?.length})
                      </Button>
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Tipos de Criativo (global) */}
              <Collapsible open={openSections.creativeTypesList} onOpenChange={() => toggleSection('creativeTypesList')}>
                <div className="flex items-center min-w-0">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-7 text-xs">
                      {openSections.creativeTypesList ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                      <span className="font-medium">Tipos de Criativo</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{creativeTypesGlobal.data?.length || 0}</span>
                    </Button>
                  </CollapsibleTrigger>
                  <Link to="/config/creative-types" className="shrink-0 opacity-70 transition-opacity hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
                <CollapsibleContent className="pl-4">
                  {creativeTypesGlobal.data?.slice(0, MAX_ITEMS).map(ct => (
                    <div key={ct.id} className="flex items-center px-3 py-1 text-xs text-muted-foreground">
                      <span className="truncate">{ct.name}</span>
                    </div>
                  ))}
                  <Link to="/config/creative-types">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 h-6 text-[10px] text-primary hover:text-primary"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      Novo
                    </Button>
                  </Link>
                  {(creativeTypesGlobal.data?.length || 0) > MAX_ITEMS && (
                    <Link to="/config/creative-types">
                      <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                        ... ver todos ({creativeTypesGlobal.data?.length})
                      </Button>
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CollapsibleContent>
          </Collapsible>

          {/* Objetivos de Mídia */}
          <Collapsible open={openSections.objectives} onOpenChange={() => toggleSection('objectives')}>
            <div className="group flex items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs min-w-0 overflow-hidden">
                  {openSections.objectives ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Target className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Objetivos de Mídia</span>
                </Button>
              </CollapsibleTrigger>
              <Link to="/config/objectives" className="shrink-0 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent className="pl-4">
              {mediaObjectives.activeItems?.slice(0, MAX_ITEMS).map(objective => (
                <div key={objective.id} className="flex items-center px-3 py-1 text-xs text-muted-foreground">
                  <span className="truncate">{objective.name}</span>
                </div>
              ))}
              <Link to="/config/objectives">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  Novo
                </Button>
              </Link>
              {(mediaObjectives.activeItems?.length || 0) > MAX_ITEMS && (
                <Link to="/config/objectives">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({mediaObjectives.activeItems?.length})
                  </Button>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Status */}
          <Collapsible open={openSections.statuses} onOpenChange={() => toggleSection('statuses')}>
            <div className="group flex items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs min-w-0 overflow-hidden">
                  {openSections.statuses ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <CircleDot className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Status</span>
                </Button>
              </CollapsibleTrigger>
              <Link to="/config/statuses" className="shrink-0 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent className="pl-4">
              {statuses.activeItems?.filter(s => !s.is_system).slice(0, MAX_ITEMS).map(status => (
                <ConfigItemRow
                  key={status.id}
                  name={status.name}
                  onEdit={() => setEditingStatus(status)}
                  onDelete={() => statuses.remove.mutate(status.id)}
                />
              ))}
              {statuses.activeItems?.filter(s => s.is_system).slice(0, MAX_ITEMS).map(status => (
                <div key={status.id} className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground">
                  <span className="truncate">{status.name}</span>
                  <span className="text-[10px]">(padrão)</span>
                </div>
              ))}
              <Link to="/config/statuses">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  Novo
                </Button>
              </Link>
            </CollapsibleContent>
          </Collapsible>

          {/* KPIs Personalizados */}
          <Collapsible open={openSections.kpis} onOpenChange={() => toggleSection('kpis')}>
            <div className="group flex items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs min-w-0 overflow-hidden">
                  {openSections.kpis ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">KPIs Personalizados</span>
                </Button>
              </CollapsibleTrigger>
              <Link to="/config/kpis" className="shrink-0 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent className="pl-4">
              {customKpis?.slice(0, MAX_ITEMS).map(kpi => (
                <div key={kpi.id} className="flex items-center px-3 py-1 text-xs text-muted-foreground">
                  <span className="truncate">{kpi.name}</span>
                  <span className="ml-1 text-[10px]">({kpi.unit})</span>
                </div>
              ))}
              <Link to="/config/kpis">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  Novo
                </Button>
              </Link>
              {(customKpis?.length || 0) > MAX_ITEMS && (
                <Link to="/config/kpis">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({customKpis?.length})
                  </Button>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Detalhamentos de Mídia */}
          <Collapsible open={openSections.detailTypes} onOpenChange={() => toggleSection('detailTypes')}>
            <div className="group flex items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs min-w-0 overflow-hidden">
                  {openSections.detailTypes ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Layers className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Detalhamentos de Mídia</span>
                </Button>
              </CollapsibleTrigger>
              <Link to="/config/detail-types" className="shrink-0 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent className="pl-4">
              {lineDetailTypes?.slice(0, MAX_ITEMS).map(detailType => (
                <div key={detailType.id} className="flex items-center px-3 py-1 text-xs text-muted-foreground">
                  <span className="truncate">{detailType.name}</span>
                </div>
              ))}
              <Link to="/config/detail-types">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  Novo
                </Button>
              </Link>
              {(lineDetailTypes?.length || 0) > MAX_ITEMS && (
                <Link to="/config/detail-types">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({lineDetailTypes?.length})
                  </Button>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>
            </CollapsibleContent>
          </Collapsible>
        </div>
        )}

        {/* LIXEIRA */}
        <div className="mb-4">
          <div className="flex items-center">
            <Link to="/trash" className="flex-1">
              <Button 
                variant={location.pathname === '/trash' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="w-full justify-start gap-2 h-8 text-xs text-muted-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Lixeira
                {(trashedPlans.data?.length || 0) > 0 && (
                  <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
                    {trashedPlans.data?.length}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </ScrollArea>
      )}

      {/* Footer with user info - Fixed at bottom */}
      <div className={cn(
        "shrink-0 border-t border-sidebar-border",
        isCollapsed ? "p-2 flex flex-col items-center gap-1" : "p-3"
      )}>
        {isCollapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={() => {
                    toggleCollapse();
                    // Expand settings section when opening sidebar via settings button
                    if (isCollapsed) {
                      toggleSection('settingsFooter');
                    }
                  }}
                >
                  <Cog className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Configurações</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="h-9 w-9 text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            {/* Email do usuário */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <User className="h-3.5 w-3.5" />
              <span className="truncate flex-1">{user?.email}</span>
            </div>

            {/* Seção Configurações - Colapsável */}
            <Collapsible 
              open={openSections.settingsFooter} 
              onOpenChange={() => toggleSection('settingsFooter')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between gap-2 h-8 text-xs mb-1"
                >
                  <span className="flex items-center gap-2">
                    <Cog className="h-3.5 w-3.5" />
                    Configurações
                  </span>
                  {openSections.settingsFooter ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="pl-2 space-y-0.5">
                {/* Administração - só para admins, expansível */}
                {isAdmin && (
                  <Collapsible
                    open={openSections.adminSubmenu}
                    onOpenChange={() => toggleSection('adminSubmenu')}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between gap-2 h-7 text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="h-3 w-3" />
                          Administração
                        </span>
                        {openSections.adminSubmenu ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="pl-4 space-y-0.5">
                      <Link to="/admin/system-settings">
                        <Button
                          variant={location.pathname === '/admin/system-settings' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="w-full justify-start gap-2 h-7 text-xs"
                        >
                          <Settings className="h-3 w-3" />
                          Configurações do Sistema
                        </Button>
                      </Link>
                      <Link to="/admin/environments">
                        <Button
                          variant={location.pathname === '/admin/environments' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="w-full justify-start gap-2 h-7 text-xs"
                        >
                          <Building2 className="h-3 w-3" />
                          Ambientes do Sistema
                        </Button>
                      </Link>
                      <Link to="/admin/menu-visibility">
                        <Button
                          variant={location.pathname === '/admin/menu-visibility' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="w-full justify-start gap-2 h-7 text-xs"
                        >
                          <Eye className="h-3 w-3" />
                          Visibilidade do Menu
                        </Button>
                      </Link>
                      <Link to="/admin/documentation">
                        <Button
                          variant={location.pathname === '/admin/documentation' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="w-full justify-start gap-2 h-7 text-xs"
                        >
                          <Library className="h-3 w-3" />
                          Documentação
                        </Button>
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Equipe do Ambiente - gerenciar membros */}
                <Link to="/settings/team">
                  <Button
                    variant={location.pathname === '/settings/team' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start gap-2 h-7 text-xs"
                  >
                    <Users className="h-3 w-3" />
                    Equipe do Ambiente
                  </Button>
                </Link>

                {/* Informações do Ambiente - dados da empresa (apenas admins) */}
                {isEnvironmentAdmin && (
                  <Link to="/settings/environment">
                    <Button
                      variant={location.pathname === '/settings/environment' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start gap-2 h-7 text-xs"
                    >
                      <Building2 className="h-3 w-3" />
                      Informações do Ambiente
                    </Button>
                  </Link>
                )}

                {/* Minha Conta - com ícone de pessoa */}
                <Link to="/account">
                  <Button
                    variant={location.pathname === '/account' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start gap-2 h-7 text-xs"
                  >
                    <User className="h-3 w-3" />
                    Minha Conta
                  </Button>
                </Link>
              </CollapsibleContent>
            </Collapsible>

            {/* Botão Sair - sempre visível fora do colapsável */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start gap-2 h-8 text-xs text-destructive hover:text-destructive mt-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          </>
        )}
      </div>

      {/* Dialogs */}
      <SubdivisionDialog
        open={subdivisionDialogOpen}
        onOpenChange={setSubdivisionDialogOpen}
        onSave={(data) => {
          subdivisions.create.mutate({ name: data.name, description: data.description });
        }}
        existingNames={getSubdivisionNames()}
        mode="create"
      />

      {/* Moment Dialog - Create or Edit */}
      <SimpleConfigDialog
        open={momentDialogOpen || !!editingMoment}
        onOpenChange={(open) => {
          if (!open) {
            setMomentDialogOpen(false);
            setEditingMoment(null);
          }
        }}
        onSave={(data) => {
          if (editingMoment) {
            moments.update.mutate({ id: editingMoment.id, name: data.name, description: data.description });
          } else {
            moments.create.mutate({ name: data.name, description: data.description });
          }
        }}
        existingNames={getMomentNames().filter(n => n !== editingMoment?.name)}
        title={editingMoment ? "Editar momento de campanha" : "Criar novo momento de campanha"}
        nameLabel="Nome do momento"
        namePlaceholder="Ex: Black Friday"
        initialData={editingMoment ? { name: editingMoment.name, description: editingMoment.description || '' } : undefined}
        mode={editingMoment ? 'edit' : 'create'}
      />

      {/* Funnel Stage Dialog - Create or Edit */}
      <SimpleConfigDialog
        open={funnelStageDialogOpen || !!editingFunnelStage}
        onOpenChange={(open) => {
          if (!open) {
            setFunnelStageDialogOpen(false);
            setEditingFunnelStage(null);
          }
        }}
        onSave={(data) => {
          if (editingFunnelStage) {
            funnelStages.update.mutate({ id: editingFunnelStage.id, name: data.name, description: data.description });
          } else {
            funnelStages.create.mutate({ name: data.name, description: data.description });
          }
        }}
        existingNames={getFunnelStageNames().filter(n => n !== editingFunnelStage?.name)}
        title={editingFunnelStage ? "Editar fase de funil" : "Criar nova fase de funil"}
        nameLabel="Nome da fase"
        namePlaceholder="Ex: Awareness"
        initialData={editingFunnelStage ? { name: editingFunnelStage.name, description: editingFunnelStage.description || '' } : undefined}
        mode={editingFunnelStage ? 'edit' : 'create'}
      />

      {/* Medium Dialog - Create or Edit */}
      <SimpleConfigDialog
        open={mediumDialogOpen || !!editingMedium}
        onOpenChange={(open) => {
          if (!open) {
            setMediumDialogOpen(false);
            setEditingMedium(null);
          }
        }}
        onSave={(data) => {
          if (editingMedium) {
            mediums.update.mutate({ id: editingMedium.id, name: data.name, description: data.description });
          } else {
            mediums.create.mutate({ name: data.name, description: data.description });
          }
        }}
        existingNames={getMediumNames().filter(n => n !== editingMedium?.name)}
        title={editingMedium ? "Editar meio" : "Criar novo meio"}
        nameLabel="Nome do meio"
        namePlaceholder="Ex: Digital"
        initialData={editingMedium ? { name: editingMedium.name, description: editingMedium.description || '' } : undefined}
        mode={editingMedium ? 'edit' : 'create'}
        helpText="Meio é a categoria geral de comunicação utilizada (ex: Digital, TV, Rádio, OOH). Define o tipo de canal onde os anúncios serão veiculados. Cada meio pode ter vários veículos associados."
      />

      {/* Status Dialog - Edit only (create goes to dedicated page) */}
      {editingStatus && (
        <SimpleConfigDialog
          open={!!editingStatus}
          onOpenChange={(open) => {
            if (!open) setEditingStatus(null);
          }}
          onSave={(data) => {
            statuses.update.mutate({ id: editingStatus.id, name: data.name, description: data.description });
          }}
          existingNames={getStatusNames().filter(n => n !== editingStatus.name)}
          title="Editar status"
          nameLabel="Nome do status"
          namePlaceholder="Ex: Em revisão"
          initialData={{ name: editingStatus.name, description: editingStatus.description || '' }}
          mode="edit"
        />
      )}

      {/* Vehicle Dialog - Create or Edit */}
      <VehicleDialog
        open={vehicleDialogOpen || !!editingVehicle}
        onOpenChange={(open) => {
          if (!open) {
            setVehicleDialogOpen(false);
            setEditingVehicle(null);
          }
        }}
        onSave={(data) => {
          if (editingVehicle) {
            vehicles.update.mutate({ id: editingVehicle.id, name: data.name, description: data.description, medium_id: data.medium_id });
          } else {
            vehicles.create.mutate({ name: data.name, description: data.description, medium_id: data.medium_id }, {
              onSuccess: (newVehicle: any) => {
                data.channels.forEach(channel => {
                  if (channel.name.trim()) {
                    channels.create.mutate({ name: channel.name, description: channel.description, vehicle_id: newVehicle.id });
                  }
                });
              }
            });
          }
        }}
        existingNames={getVehicleNames().filter(n => n !== editingVehicle?.name)}
        mode={editingVehicle ? 'edit' : 'create'}
        mediums={mediums.activeItems || []}
        initialData={editingVehicle ? { 
          name: editingVehicle.name, 
          description: editingVehicle.description || '', 
          medium_id: editingVehicle.medium_id,
          channels: []
        } : undefined}
        onCreateMedium={async (data) => {
          return new Promise((resolve) => {
            mediums.create.mutate(data, {
              onSuccess: (newMedium) => resolve(newMedium as any),
              onError: () => resolve(undefined)
            });
          });
        }}
      />

      {selectedVehicleForChannel && (
        <ChannelDialog
          open={channelDialogOpen}
          onOpenChange={(open) => {
            setChannelDialogOpen(open);
            if (!open) {
              setSelectedVehicleForChannel(null);
              setEditingChannel(null);
            }
          }}
          onSave={(data) => channels.create.mutate(data)}
          onUpdate={(data) => channels.update.mutate(data)}
          editingChannel={editingChannel}
          vehicleId={selectedVehicleForChannel.id}
          vehicleName={selectedVehicleForChannel.name}
          existingNames={getVehicleChannels(selectedVehicleForChannel.id).map(c => c.name)}
        />
      )}

      {/* Target Dialog - Create or Edit */}
      <TargetDialog
        open={targetDialogOpen || !!editingTarget}
        onOpenChange={(open) => {
          if (!open) {
            setTargetDialogOpen(false);
            setEditingTarget(null);
          }
        }}
        onSave={(data) => {
          if (editingTarget) {
            targets.update.mutate({ id: editingTarget.id, ...data });
          } else {
            targets.create.mutate(data);
          }
        }}
        existingNames={getTargetNames().filter(n => n !== editingTarget?.name)}
        mode={editingTarget ? 'edit' : 'create'}
        initialData={editingTarget || undefined}
      />

      <FormatWizardDialog
        open={creativeDialogOpen}
        onOpenChange={setCreativeDialogOpen}
        onComplete={() => {
          // Refresh will happen automatically via query invalidation
        }}
      />

      <SegmentDialog
        open={segmentDialogOpen}
        onOpenChange={(open) => {
          setSegmentDialogOpen(open);
          if (!open) setEditingSegment(null);
        }}
        onSave={(data) => {
          if (editingSegment) {
            behavioralSegmentations.update.mutate({ id: editingSegment.id, ...data });
          } else {
            behavioralSegmentations.create.mutate(data);
          }
        }}
        existingNames={getSegmentNames()}
        initialData={editingSegment || undefined}
        mode={editingSegment ? 'edit' : 'create'}
      />

      {/* Client Dialog - Create or Edit */}
      <ClientDialog
        open={clientDialogOpen || !!editingClient}
        onOpenChange={(open) => {
          if (!open) {
            setClientDialogOpen(false);
            setEditingClient(null);
          }
        }}
        onSave={(data) => {
          if (editingClient) {
            clients.update.mutate({ id: editingClient.id, ...data });
          } else {
            clients.create.mutate(data);
          }
        }}
        existingNames={getClientNames().filter(n => n !== editingClient?.name)}
        initialData={editingClient || undefined}
        mode={editingClient ? 'edit' : 'create'}
      />
    </div>
  );
}
