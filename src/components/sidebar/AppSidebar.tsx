import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Plus, 
  ChevronDown,
  ChevronRight,
  Settings,
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
  User
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMediaPlans, useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets, useCreativeTemplates } from '@/hooks/useConfigData';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfigItemRow } from './ConfigItemRow';
import { CreateItemButton } from './CreateItemButton';
import { PlanItemRow } from './PlanItemRow';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { activePlans, finishedPlans, trashedPlans, softDelete, restore, permanentDelete } = useMediaPlans();
  const subdivisions = useSubdivisions();
  const moments = useMoments();
  const funnelStages = useFunnelStages();
  const mediums = useMediums();
  const vehicles = useVehicles();
  const channels = useChannels();
  const targets = useTargets();
  const creativeTemplates = useCreativeTemplates();

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
    creatives: false,
    trash: false,
  });

  // Vehicle subsections
  const [openVehicles, setOpenVehicles] = useState<Record<string, boolean>>({});
  // Subdivisions subsections
  const [openSubdivisions, setOpenSubdivisions] = useState<Record<string, boolean>>({});

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

  return (
    <div className="flex flex-col h-full w-64 border-r border-sidebar-border bg-sidebar-background">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display font-semibold text-sm">MediaPlan</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
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

          {/* Criar novo */}
          <Link to="/media-plans/new">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2 h-8 text-xs text-primary hover:text-primary mb-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar novo plano
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

        {/* CONFIGURAÇÕES */}
        <div className="mb-4">
          <h3 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Configurações
          </h3>

          {/* Subdivisões */}
          <Collapsible open={openSections.subdivisions} onOpenChange={() => toggleSection('subdivisions')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
                {openSections.subdivisions ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Layers className="h-3.5 w-3.5" />
                Subdivisões de plano
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4">
              <CreateItemButton 
                onCreate={(name) => subdivisions.create.mutate({ name })} 
                placeholder="Nome da subdivisão..."
              />
              {parentSubdivisions.slice(0, MAX_ITEMS).map(sub => (
                <Collapsible 
                  key={sub.id} 
                  open={openSubdivisions[sub.id]} 
                  onOpenChange={() => setOpenSubdivisions(prev => ({ ...prev, [sub.id]: !prev[sub.id] }))}
                >
                  <div className="flex items-center">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 mr-1">
                        {openSubdivisions[sub.id] ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                      </Button>
                    </CollapsibleTrigger>
                    <ConfigItemRow
                      name={sub.name}
                      onEdit={(name) => subdivisions.update.mutate({ id: sub.id, name })}
                      onDelete={() => subdivisions.remove.mutate(sub.id)}
                      className="flex-1"
                    />
                  </div>
                  <CollapsibleContent className="pl-6">
                    <CreateItemButton 
                      onCreate={(name) => subdivisions.create.mutate({ name, parent_id: sub.id })} 
                      placeholder="Detalhe..."
                    />
                    {getChildSubdivisions(sub.id).map(child => (
                      <ConfigItemRow
                        key={child.id}
                        name={child.name}
                        onEdit={(name) => subdivisions.update.mutate({ id: child.id, name })}
                        onDelete={() => subdivisions.remove.mutate(child.id)}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
              {parentSubdivisions.length > MAX_ITEMS && (
                <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                  ... ver todos ({parentSubdivisions.length})
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Momentos */}
          <Collapsible open={openSections.moments} onOpenChange={() => toggleSection('moments')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
                {openSections.moments ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Clock className="h-3.5 w-3.5" />
                Momentos
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4">
              <CreateItemButton 
                onCreate={(name) => moments.create.mutate(name)} 
                placeholder="Nome do momento..."
              />
              {moments.data?.slice(0, MAX_ITEMS).map(moment => (
                <ConfigItemRow
                  key={moment.id}
                  name={moment.name}
                  onEdit={(name) => moments.update.mutate({ id: moment.id, name })}
                  onDelete={() => moments.remove.mutate(moment.id)}
                />
              ))}
              {(moments.data?.length || 0) > MAX_ITEMS && (
                <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                  ... ver todos ({moments.data?.length})
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Fases do Funil */}
          <Collapsible open={openSections.funnelStages} onOpenChange={() => toggleSection('funnelStages')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
                {openSections.funnelStages ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Filter className="h-3.5 w-3.5" />
                Fases do Funil
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4">
              <CreateItemButton 
                onCreate={(name) => funnelStages.create.mutate(name)} 
                placeholder="Nome da fase..."
              />
              {funnelStages.data?.slice(0, MAX_ITEMS).map(stage => (
                <ConfigItemRow
                  key={stage.id}
                  name={stage.name}
                  onEdit={(name) => funnelStages.update.mutate({ id: stage.id, name })}
                  onDelete={() => funnelStages.remove.mutate(stage.id)}
                />
              ))}
              {(funnelStages.data?.length || 0) > MAX_ITEMS && (
                <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                  ... ver todos ({funnelStages.data?.length})
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Meio */}
          <Collapsible open={openSections.mediums} onOpenChange={() => toggleSection('mediums')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
                {openSections.mediums ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Radio className="h-3.5 w-3.5" />
                Meio
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4">
              <CreateItemButton 
                onCreate={(name) => mediums.create.mutate(name)} 
                placeholder="Nome do meio..."
              />
              {mediums.data?.slice(0, MAX_ITEMS).map(medium => (
                <ConfigItemRow
                  key={medium.id}
                  name={medium.name}
                  onEdit={(name) => mediums.update.mutate({ id: medium.id, name })}
                  onDelete={() => mediums.remove.mutate(medium.id)}
                />
              ))}
              {(mediums.data?.length || 0) > MAX_ITEMS && (
                <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                  ... ver todos ({mediums.data?.length})
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Veículos e Canais */}
          <Collapsible open={openSections.vehicles} onOpenChange={() => toggleSection('vehicles')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
                {openSections.vehicles ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Tv className="h-3.5 w-3.5" />
                Veículos e Canais
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4">
              <CreateItemButton 
                onCreate={(name) => vehicles.create.mutate({ name })} 
                placeholder="Nome do veículo..."
              />
              {vehicles.data?.slice(0, MAX_ITEMS).map(vehicle => (
                <Collapsible 
                  key={vehicle.id} 
                  open={openVehicles[vehicle.id]} 
                  onOpenChange={() => setOpenVehicles(prev => ({ ...prev, [vehicle.id]: !prev[vehicle.id] }))}
                >
                  <div className="flex items-center">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 mr-1">
                        {openVehicles[vehicle.id] ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                      </Button>
                    </CollapsibleTrigger>
                    <ConfigItemRow
                      name={vehicle.name}
                      onEdit={(name) => vehicles.update.mutate({ id: vehicle.id, name })}
                      onDelete={() => vehicles.remove.mutate(vehicle.id)}
                      className="flex-1"
                    />
                  </div>
                  <CollapsibleContent className="pl-6">
                    <CreateItemButton 
                      onCreate={(name) => channels.create.mutate({ name, vehicle_id: vehicle.id })} 
                      placeholder="Nome do canal..."
                    />
                    {getVehicleChannels(vehicle.id).map(channel => (
                      <ConfigItemRow
                        key={channel.id}
                        name={channel.name}
                        onEdit={(name) => channels.update.mutate({ id: channel.id, name })}
                        onDelete={() => channels.remove.mutate(channel.id)}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
              {(vehicles.data?.length || 0) > MAX_ITEMS && (
                <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                  ... ver todos ({vehicles.data?.length})
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Target/Segmentações */}
          <Collapsible open={openSections.targets} onOpenChange={() => toggleSection('targets')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
                {openSections.targets ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Users className="h-3.5 w-3.5" />
                Target
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4">
              <CreateItemButton 
                onCreate={(name) => targets.create.mutate({ name })} 
                placeholder="Nome da segmentação..."
              />
              {targets.data?.slice(0, MAX_ITEMS).map(target => (
                <ConfigItemRow
                  key={target.id}
                  name={target.name}
                  onEdit={(name) => targets.update.mutate({ id: target.id, name })}
                  onDelete={() => targets.remove.mutate(target.id)}
                />
              ))}
              {(targets.data?.length || 0) > MAX_ITEMS && (
                <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                  ... ver todos ({targets.data?.length})
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Criativos */}
          <Collapsible open={openSections.creatives} onOpenChange={() => toggleSection('creatives')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
                {openSections.creatives ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Image className="h-3.5 w-3.5" />
                Criativos
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4">
              <CreateItemButton 
                onCreate={(name) => creativeTemplates.create.mutate({ name, format: 'Estático' })} 
                placeholder="Nome do criativo..."
              />
              {creativeTemplates.data?.slice(0, MAX_ITEMS).map(template => (
                <ConfigItemRow
                  key={template.id}
                  name={template.name}
                  onEdit={(name) => creativeTemplates.update.mutate({ id: template.id, name })}
                  onDelete={() => creativeTemplates.remove.mutate(template.id)}
                />
              ))}
              {(creativeTemplates.data?.length || 0) > MAX_ITEMS && (
                <Button variant="ghost" size="sm" className="w-full justify-start h-6 text-[10px] text-muted-foreground">
                  ... ver todos ({creativeTemplates.data?.length})
                </Button>
              )}
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

      {/* Footer with user info */}
      <div className="p-3 border-t border-sidebar-border">
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
      </div>
    </div>
  );
}
