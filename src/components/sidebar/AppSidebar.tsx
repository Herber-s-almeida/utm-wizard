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
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSystemAdmin } from '@/hooks/useSystemAdmin';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { useMediaPlans, useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets, useCreativeTemplates, useBehavioralSegmentations } from '@/hooks/useConfigData';
import { useFormatsHierarchy } from '@/hooks/useFormatsHierarchy';
import { useCreativeTypes } from '@/hooks/useCreativeTypes';
import { useMenuVisibility } from '@/hooks/useMenuVisibility';
import { useStatuses } from '@/hooks/useStatuses';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfigItemRow } from './ConfigItemRow';
import { PlanItemRow } from './PlanItemRow';
import { cn } from '@/lib/utils';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { useSidebarSections, useSidebarSubsections } from '@/hooks/useSidebarSections';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

// Dialogs
import { SubdivisionDialog } from '@/components/config/SubdivisionDialog';
import { SimpleConfigDialog } from '@/components/config/SimpleConfigDialog';
import { VehicleDialog } from '@/components/config/VehicleDialog';
import { ChannelDialog } from '@/components/config/ChannelDialog';
import { TargetDialog } from '@/components/config/TargetDialog';
import { FormatWizardDialog } from '@/components/config/FormatWizardDialog';
import { SegmentDialog } from '@/components/config/SegmentDialog';

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useSystemAdmin();
  const { isViewingOtherEnvironment, viewingUser } = useEnvironment();
  const { data: currentProfile } = useCurrentProfile();
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
  const formatsHierarchy = useFormatsHierarchy();
  const creativeTypesGlobal = useCreativeTypes();
  const { isMenuHidden } = useMenuVisibility();

  // Get environment display name - show for all users, not just when viewing other environments
  const environmentName = isViewingOtherEnvironment 
    ? (viewingUser?.company || viewingUser?.full_name || viewingUser?.email)
    : (currentProfile?.company || currentProfile?.full_name || user?.email);

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

  return (
    <div className={cn(
      "flex flex-col h-full border-r border-sidebar-border bg-sidebar overflow-x-hidden transition-all duration-300",
      isCollapsed ? "w-16" : "w-80"
    )}>
      {/* Header - Fixed at top */}
      <div className={cn(
        "shrink-0 border-b border-sidebar-border",
        isCollapsed ? "p-2" : "p-3"
      )}>
        <div className={cn(
          "flex items-center gap-2",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
              <img src="/logo.png" alt="AdsPlanning Pro" className="h-8 w-auto shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-sm text-primary truncate">AdsPlanning</span>
                <span className="text-[10px] font-semibold text-accent tracking-wider">PRO</span>
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
        
        {/* Environment name display */}
        {!isCollapsed && environmentName && (
          <div className="mt-2 px-2 py-1.5 bg-muted/50 rounded-md border border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate font-medium">{environmentName}</span>
            </div>
          </div>
        )}
      </div>

      {/* Collapsed state - show only icons */}
      {isCollapsed ? (
        <div className="flex-1 overflow-y-auto py-3 px-2 flex flex-col items-center gap-1 bg-background">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/dashboard">
                <Button 
                  variant={isActive('/dashboard') ? 'secondary' : 'ghost'} 
                  size="icon"
                  className="h-9 w-9"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Dashboard</TooltipContent>
          </Tooltip>

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
            <TooltipContent side="right">Dashboard Gerencial</TooltipContent>
          </Tooltip>

          {!isMenuHidden('reports') && (
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

          <div className="w-8 h-px bg-border my-2" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/media-plans">
                <Button 
                  variant={isActive('/media-plans') ? 'secondary' : 'ghost'} 
                  size="icon"
                  className="h-9 w-9"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Planos de mídia</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/media-plans/new">
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-primary"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Novo plano</TooltipContent>
          </Tooltip>

          <div className="w-8 h-px bg-border my-2" />

          {!isMenuHidden('media_resources') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Palette className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Recursos de Mídia</TooltipContent>
            </Tooltip>
          )}

          {!isMenuHidden('taxonomy') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Link2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Taxonomia UTM</TooltipContent>
            </Tooltip>
          )}

          <div className="w-8 h-px bg-border my-2" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/config/subdivisions">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Layers className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Subdivisões de Plano</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/config/moments">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Clock className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Momentos de Campanha</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/config/funnel-stages">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Filter className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Fases do Funil</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/config/mediums">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Radio className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Meios</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/config/vehicles">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Tv className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Veículos e Canais</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/config/targets">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Users className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Segmentação e Target</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/config/formats">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Image className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Formatos e Especificações</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/config/statuses">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <CircleDot className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Status</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/config/kpis">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">KPIs Personalizados</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/config/detail-types">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Layers className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Tipos de Detalhamento</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/trash">
                <Button 
                  variant="ghost" 
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

        {/* RELATÓRIOS */}
        {!isMenuHidden('reports') && (
          <div className="mb-4">
            <h3 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Relatórios
            </h3>

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
          </div>
        )}

        {/* PLANOS DE MÍDIA */}
        <div className="mb-4">
          <h3 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Gerenciar Planos de Mídia
          </h3>

          {/* Planos de Mídia - Expansível */}
          <Collapsible open={openSections.mediaPlans} onOpenChange={() => toggleSection('mediaPlans')}>
            <div className="flex items-center">
              <CollapsibleTrigger asChild>
                <Button 
                  variant={isActive('/dashboard') || isActive('/media-plans') ? 'secondary' : 'ghost'} 
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
                  <Link to="/dashboard">
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
        </div>

        {/* RECURSOS DE MÍDIA */}
        {!isMenuHidden('media_resources') && (
        <div className="mb-4">
          <h3 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Palette className="h-3 w-3" />
            Recursos de Mídia
          </h3>

          {/* Planos de Mídia para recursos */}
          <Collapsible open={openSections.mediaResources} onOpenChange={() => toggleSection('mediaResources')}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start gap-2 h-8 text-xs"
              >
                {openSections.mediaResources ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <FileText className="h-3.5 w-3.5" />
                <span>Recursos por Plano</span>
              </Button>
            </CollapsibleTrigger>
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
                    <Link key={plan.id} to={`/media-plans/${plan.slug || plan.id}/resources`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-7 text-xs font-normal truncate"
                      >
                        <Image className="h-3 w-3 mr-2 shrink-0" />
                        <span className="truncate">{plan.name}</span>
                      </Button>
                    </Link>
                  ))}
                  {(draftPlans.data?.length || 0) > MAX_ITEMS && (
                    <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                      Ver todos ({draftPlans.data?.length})
                    </Button>
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
                    <Link key={plan.id} to={`/media-plans/${plan.slug || plan.id}/resources`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-7 text-xs font-normal truncate"
                      >
                        <Image className="h-3 w-3 mr-2 shrink-0" />
                        <span className="truncate">{plan.name}</span>
                      </Button>
                    </Link>
                  ))}
                  {(activePlans.data?.length || 0) > MAX_ITEMS && (
                    <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                      Ver todos ({activePlans.data?.length})
                    </Button>
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
                    <Link key={plan.id} to={`/media-plans/${plan.slug || plan.id}/resources`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-7 text-xs font-normal truncate"
                      >
                        <Image className="h-3 w-3 mr-2 shrink-0" />
                        <span className="truncate">{plan.name}</span>
                      </Button>
                    </Link>
                  ))}
                  {(finishedPlans.data?.length || 0) > MAX_ITEMS && (
                    <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                      Ver todos ({finishedPlans.data?.length})
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CollapsibleContent>
          </Collapsible>
        </div>
        )}

        {/* TAXONOMIA */}
        {!isMenuHidden('taxonomy') && (
        <div className="mb-4">
          <h3 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            Taxonomia
          </h3>

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
                    <Link key={plan.id} to={`/media-plans/${plan.slug || plan.id}/taxonomy`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-7 text-xs font-normal truncate"
                      >
                        <Link2 className="h-3 w-3 mr-2 shrink-0" />
                        <span className="truncate">{plan.name}</span>
                      </Button>
                    </Link>
                  ))}
                  {(draftPlans.data?.length || 0) > MAX_ITEMS && (
                    <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                      Ver todos ({draftPlans.data?.length})
                    </Button>
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
                    <Link key={plan.id} to={`/media-plans/${plan.slug || plan.id}/taxonomy`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-7 text-xs font-normal truncate"
                      >
                        <Link2 className="h-3 w-3 mr-2 shrink-0" />
                        <span className="truncate">{plan.name}</span>
                      </Button>
                    </Link>
                  ))}
                  {(activePlans.data?.length || 0) > MAX_ITEMS && (
                    <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                      Ver todos ({activePlans.data?.length})
                    </Button>
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
                    <Link key={plan.id} to={`/media-plans/${plan.slug || plan.id}/taxonomy`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-7 text-xs font-normal truncate"
                      >
                        <Link2 className="h-3 w-3 mr-2 shrink-0" />
                        <span className="truncate">{plan.name}</span>
                      </Button>
                    </Link>
                  ))}
                  {(finishedPlans.data?.length || 0) > MAX_ITEMS && (
                    <Button variant="link" size="sm" className="w-full justify-start h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground">
                      Ver todos ({finishedPlans.data?.length})
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CollapsibleContent>
          </Collapsible>
        </div>
        )}

        <div className="mb-4">
          <h3 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Library className="h-3 w-3" />
            Biblioteca
          </h3>

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
          <Link to="/config/kpis">
            <Button 
              variant={location.pathname === '/config/kpis' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="w-full justify-start gap-2 h-8 text-xs"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>KPIs Personalizados</span>
            </Button>
          </Link>

          {/* Tipos de Detalhamento */}
          <Link to="/config/detail-types">
            <Button 
              variant={location.pathname === '/config/detail-types' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="w-full justify-start gap-2 h-8 text-xs"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Tipos de Detalhamento</span>
            </Button>
          </Link>
        </div>

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
        "shrink-0 p-3 border-t border-sidebar-border",
        isCollapsed && "flex flex-col items-center"
      )}>
        {isCollapsed ? (
          <>
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/admin/users">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <ShieldCheck className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Administração</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/account">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Minha Conta</TooltipContent>
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <User className="h-3.5 w-3.5" />
              <span className="truncate flex-1">{user?.email}</span>
            </div>
            {isAdmin && (
              <div className="mb-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 px-2">
                  <ShieldCheck className="h-3 w-3" />
                  <span className="font-medium">Administração</span>
                </div>
                <Link to="/admin/users">
                  <Button
                    variant={location.pathname === '/admin/users' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start gap-2 h-7 text-xs pl-6"
                  >
                    <Users className="h-3 w-3" />
                    Usuários
                  </Button>
                </Link>
                <Link to="/admin/menu-visibility">
                  <Button
                    variant={location.pathname === '/admin/menu-visibility' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start gap-2 h-7 text-xs pl-6"
                  >
                    <Eye className="h-3 w-3" />
                    Visibilidade do Menu
                  </Button>
                </Link>
              </div>
            )}
            <Link to="/account">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8 text-xs mb-1"
              >
                <Settings className="h-3.5 w-3.5" />
                Minha Conta
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start gap-2 h-8 text-xs text-destructive hover:text-destructive"
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
          subdivisions.create.mutate({ name: data.name, description: data.description }, {
            onSuccess: (newSub: any) => {
              data.details.forEach(detail => {
                subdivisions.create.mutate({ name: detail.name, description: detail.description, parent_id: newSub.id });
              });
            }
          });
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
    </div>
  );
}
