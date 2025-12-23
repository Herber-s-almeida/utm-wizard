import { useState, createContext, useContext } from 'react';
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
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMediaPlans, useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets, useCreativeTemplates, useBehavioralSegmentations } from '@/hooks/useConfigData';
import { useStatuses } from '@/hooks/useStatuses';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfigItemRow } from './ConfigItemRow';
import { PlanItemRow } from './PlanItemRow';
import { cn } from '@/lib/utils';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Dialogs
import { SubdivisionDialog } from '@/components/config/SubdivisionDialog';
import { SimpleConfigDialog } from '@/components/config/SimpleConfigDialog';
import { VehicleDialog } from '@/components/config/VehicleDialog';
import { ChannelDialog } from '@/components/config/ChannelDialog';
import { TargetDialog } from '@/components/config/TargetDialog';
import { FormatDialog } from '@/components/config/FormatDialog';
import { SegmentDialog } from '@/components/config/SegmentDialog';

export function AppSidebar() {
  const { user, signOut } = useAuth();
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
  
  const { activePlans, finishedPlans, trashedPlans, softDelete, restore, permanentDelete } = useMediaPlans();
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

  // Section open states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    activePlans: true,
    finishedPlans: false,
    subdivisions: false,
    moments: false,
    funnelStages: false,
    mediums: false,
    vehicles: false,
    targets: false,
    segments: false,
    targetsList: false,
    creatives: false,
    statuses: false,
    trash: false,
  });

  // Vehicle subsections
  const [openVehicles, setOpenVehicles] = useState<Record<string, boolean>>({});
  // Subdivisions subsections
  const [openSubdivisions, setOpenSubdivisions] = useState<Record<string, boolean>>({});

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

  // Track which vehicle is selected for creating a new channel
  const [selectedVehicleForChannel, setSelectedVehicleForChannel] = useState<{ id: string; name: string } | null>(null);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  // Get parent subdivisions
  const parentSubdivisions = subdivisions.data?.filter(s => !s.parent_id) || [];
  const getChildSubdivisions = (parentId: string) => 
    subdivisions.data?.filter(s => s.parent_id === parentId) || [];

  // Get channels for a vehicle
  const getVehicleChannels = (vehicleId: string) => 
    channels.data?.filter(c => c.vehicle_id === vehicleId) || [];

  const MAX_ITEMS = 3;

  // Helper to get existing names for validation
  const getSubdivisionNames = () => parentSubdivisions.map(s => s.name);
  const getMomentNames = () => moments.data?.map(m => m.name) || [];
  const getFunnelStageNames = () => funnelStages.data?.map(s => s.name) || [];
  const getMediumNames = () => mediums.data?.map(m => m.name) || [];
  const getVehicleNames = () => vehicles.data?.map(v => v.name) || [];
  const getTargetNames = () => targets.data?.map(t => t.name) || [];
  const getCreativeNames = () => creativeTemplates.data?.map(c => c.name) || [];
  const getSegmentNames = () => behavioralSegmentations.data?.map(s => s.name) || [];
  const getStatusNames = () => statuses.data?.map(s => s.name) || [];

  return (
    <div className={cn(
      "flex flex-col h-full border-r border-sidebar-border bg-sidebar overflow-x-hidden transition-all duration-300",
      isCollapsed ? "w-16" : "w-80"
    )}>
      {/* Header */}
      <div className={cn(
        "border-b border-sidebar-border",
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
      </div>

      {/* Collapsed state - show only icons */}
      {isCollapsed ? (
        <div className="flex-1 py-3 px-2 flex flex-col items-center gap-1">
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
        </div>
      ) : (
      <ScrollArea className="flex-1 py-3 px-2 overflow-x-hidden">
        {/* PLANOS DE MÍDIA */}
        <div className="mb-4">
          <h3 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Planos de Mídia
          </h3>

          {/* Dashboard */}
          <Link to="/dashboard">
            <Button 
              variant={isActive('/dashboard') ? 'secondary' : 'ghost'} 
              size="sm" 
              className="w-full justify-start gap-2 h-8 text-xs mb-1"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Button>
          </Link>

          {/* Lista de planos */}
          <Link to="/media-plans">
            <Button 
              variant={isActive('/media-plans') ? 'secondary' : 'ghost'} 
              size="sm" 
              className="w-full justify-start gap-2 h-8 text-xs mb-1"
            >
              <FileText className="h-3.5 w-3.5" />
              Planos de mídia
            </Button>
          </Link>

          {/* Criar novo plano */}
          <Link to="/media-plans/new">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2 h-8 text-xs text-primary hover:text-primary mb-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo plano
            </Button>
          </Link>

          {/* Ativos */}
          <Collapsible open={openSections.activePlans} onOpenChange={() => toggleSection('activePlans')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
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
                  name={plan.name}
                  onDelete={() => softDelete.mutate(plan.id)}
                />
              ))}
              {(activePlans.data?.length || 0) > MAX_ITEMS && (
                <Link to="/media-plans?status=active">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({activePlans.data?.length})
                  </Button>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Finalizados */}
          <Collapsible open={openSections.finishedPlans} onOpenChange={() => toggleSection('finishedPlans')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
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
                  name={plan.name}
                  onDelete={() => softDelete.mutate(plan.id)}
                />
              ))}
              {(finishedPlans.data?.length || 0) > MAX_ITEMS && (
                <Link to="/media-plans?status=completed">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({finishedPlans.data?.length})
                  </Button>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* BIBLIOTECA */}
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
              {moments.data?.slice(0, MAX_ITEMS).map(moment => (
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
              {(moments.data?.length || 0) > MAX_ITEMS && (
                <Link to="/config/moments">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({moments.data?.length})
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
              {funnelStages.data?.slice(0, MAX_ITEMS).map(stage => (
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
              {(funnelStages.data?.length || 0) > MAX_ITEMS && (
                <Link to="/config/funnel-stages">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({funnelStages.data?.length})
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
              {mediums.data?.slice(0, MAX_ITEMS).map(medium => (
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
              {(mediums.data?.length || 0) > MAX_ITEMS && (
                <Link to="/config/mediums">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({mediums.data?.length})
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
              {vehicles.data?.slice(0, MAX_ITEMS).map(vehicle => (
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
              {(vehicles.data?.length || 0) > MAX_ITEMS && (
                <Link to="/config/vehicles">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({vehicles.data?.length})
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
                    <span className="ml-auto text-[10px] text-muted-foreground">{behavioralSegmentations.data?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {behavioralSegmentations.data?.slice(0, MAX_ITEMS).map(segment => (
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
                  {(behavioralSegmentations.data?.length || 0) > MAX_ITEMS && (
                    <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                      ... ver todos ({behavioralSegmentations.data?.length})
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
                    <span className="ml-auto text-[10px] text-muted-foreground">{targets.data?.length || 0}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4">
                  {targets.data?.slice(0, MAX_ITEMS).map(target => (
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
                  {(targets.data?.length || 0) > MAX_ITEMS && (
                    <Link to="/config/targets">
                      <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                        ... ver todos ({targets.data?.length})
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
              {creativeTemplates.data?.slice(0, MAX_ITEMS).map(template => (
                <ConfigItemRow
                  key={template.id}
                  name={template.name}
                  onEdit={() => {
                    setEditingCreative(template);
                    setCreativeDialogOpen(true);
                  }}
                  onDelete={() => creativeTemplates.remove.mutate(template.id)}
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary"
                onClick={() => setCreativeDialogOpen(true)}
              >
                <Plus className="h-3 w-3" />
                Novo
              </Button>
              {(creativeTemplates.data?.length || 0) > MAX_ITEMS && (
                <Link to="/config/formats">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                    ... ver todos ({creativeTemplates.data?.length})
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
              {statuses.data?.filter(s => !s.is_system).slice(0, MAX_ITEMS).map(status => (
                <ConfigItemRow
                  key={status.id}
                  name={status.name}
                  onEdit={() => {}}
                  onDelete={() => statuses.remove.mutate(status.id)}
                />
              ))}
              {statuses.data?.filter(s => s.is_system).slice(0, MAX_ITEMS).map(status => (
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
        </div>

        {/* LIXEIRA */}
        <div className="mb-4">
          <Collapsible open={openSections.trash} onOpenChange={() => toggleSection('trash')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs text-muted-foreground">
                {openSections.trash ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Trash2 className="h-3.5 w-3.5" />
                Lixeira
                <span className="ml-auto text-[10px]">{trashedPlans.data?.length || 0}</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4">
              {trashedPlans.data?.slice(0, MAX_ITEMS).map(plan => (
                <PlanItemRow
                  key={plan.id}
                  id={plan.id}
                  name={plan.name}
                  onDelete={() => {}}
                  onRestore={() => restore.mutate(plan.id)}
                  onPermanentDelete={() => permanentDelete.mutate(plan.id)}
                  isTrash
                />
              ))}
              {(trashedPlans.data?.length || 0) > MAX_ITEMS && (
                <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                  ... ver todos ({trashedPlans.data?.length})
                </Button>
              )}
              {!trashedPlans.data?.length && (
                <p className="text-[10px] text-muted-foreground px-3 py-2">Lixeira vazia</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
      )}

      {/* Footer with user info */}
      <div className={cn(
        "p-3 border-t border-sidebar-border",
        isCollapsed && "flex flex-col items-center"
      )}>
        {isCollapsed ? (
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
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <User className="h-3.5 w-3.5" />
              <span className="truncate flex-1">{user?.email}</span>
            </div>
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

      <SimpleConfigDialog
        open={momentDialogOpen}
        onOpenChange={setMomentDialogOpen}
        onSave={(data) => moments.create.mutate({ name: data.name, description: data.description })}
        existingNames={getMomentNames()}
        title="Criar novo momento de campanha"
        nameLabel="Nome do momento"
        namePlaceholder="Ex: Black Friday"
        mode="create"
      />

      <SimpleConfigDialog
        open={funnelStageDialogOpen}
        onOpenChange={setFunnelStageDialogOpen}
        onSave={(data) => funnelStages.create.mutate({ name: data.name, description: data.description })}
        existingNames={getFunnelStageNames()}
        title="Criar nova fase de funil"
        nameLabel="Nome da fase"
        namePlaceholder="Ex: Awareness"
        mode="create"
      />

      <SimpleConfigDialog
        open={mediumDialogOpen}
        onOpenChange={setMediumDialogOpen}
        onSave={(data) => mediums.create.mutate({ name: data.name, description: data.description })}
        existingNames={getMediumNames()}
        title="Criar novo meio"
        nameLabel="Nome do meio"
        namePlaceholder="Ex: Digital"
        mode="create"
      />

      <VehicleDialog
        open={vehicleDialogOpen}
        onOpenChange={setVehicleDialogOpen}
        onSave={(data) => {
          vehicles.create.mutate({ name: data.name, description: data.description, medium_id: data.medium_id }, {
            onSuccess: (newVehicle: any) => {
              data.channels.forEach(channel => {
                if (channel.name.trim()) {
                  channels.create.mutate({ name: channel.name, description: channel.description, vehicle_id: newVehicle.id });
                }
              });
            }
          });
        }}
        existingNames={getVehicleNames()}
        mode="create"
        mediums={mediums.data || []}
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

      <TargetDialog
        open={targetDialogOpen}
        onOpenChange={setTargetDialogOpen}
        onSave={(data) => targets.create.mutate(data)}
        existingNames={getTargetNames()}
        mode="create"
      />

      <FormatDialog
        open={creativeDialogOpen}
        onOpenChange={setCreativeDialogOpen}
        onSave={(data) => {
          creativeTemplates.create.mutate({
            name: data.name,
            format: 'custom',
          });
        }}
        existingNames={getCreativeNames()}
        mode="create"
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
