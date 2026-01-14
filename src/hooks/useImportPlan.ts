import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, addMonths, startOfMonth, differenceInMonths } from 'date-fns';
import { 
  parseFile, 
  detectColumnMappings, 
  parseImportData, 
  ParsedImportLine, 
  ColumnMapping,
  ParseResult,
} from '@/utils/importPlanParser';
import { HierarchyLevel, HierarchyLevelConfig, createHierarchyConfig, getHierarchyOrder } from '@/types/hierarchy';
import { generateBudgetDistributionsFromLines } from '@/utils/generateBudgetDistributions';

export type EntityType = 'client' | 'vehicle' | 'channel' | 'subdivision' | 'moment' | 'funnel_stage' | 'target' | 'medium' | 'format';

export interface UnresolvedEntity {
  id: string;
  type: EntityType;
  originalName: string;
  affectedLines: number[];
  status: 'pending' | 'resolved' | 'ignored' | 'creating';
  resolvedId?: string;
  parentContext?: {
    type: string;
    name: string;
    id?: string;
  };
}

export interface PlanInfo {
  name: string;
  clientId: string;
  clientName: string;
  campaign: string;
  totalBudget: number;
  startDate: Date | null;
  endDate: Date | null;
  useBudgetFromFile: boolean;
  useDatesFromFile: boolean;
}

export interface ImportState {
  step: number;
  file: File | null;
  rawData: any[];
  columns: string[];
  mappings: ColumnMapping[];
  monthColumns: string[];
  parseResult: ParseResult | null;
  planInfo: PlanInfo;
  unresolvedEntities: UnresolvedEntity[];
  detectedHierarchy: HierarchyLevelConfig[];
  isCreating: boolean;
  isCheckingEntities: boolean;
  existingEntities: Record<EntityType, Array<{ id: string; name: string; parentId?: string }>>;
}

const initialPlanInfo: PlanInfo = {
  name: '',
  clientId: '',
  clientName: '',
  campaign: '',
  totalBudget: 0,
  startDate: null,
  endDate: null,
  useBudgetFromFile: true,
  useDatesFromFile: true,
};

export function useImportPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [state, setState] = useState<ImportState>({
    step: 1,
    file: null,
    rawData: [],
    columns: [],
    mappings: [],
    monthColumns: [],
    parseResult: null,
    planInfo: initialPlanInfo,
    unresolvedEntities: [],
    detectedHierarchy: [],
    isCreating: false,
    isCheckingEntities: false,
    existingEntities: {
      client: [],
      vehicle: [],
      channel: [],
      subdivision: [],
      moment: [],
      funnel_stage: [],
      target: [],
      medium: [],
      format: [],
    },
  });
  
  // Step 1: Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const { data, columns } = await parseFile(file);
      const { mappings, monthColumns } = detectColumnMappings(columns);
      
      setState(prev => ({
        ...prev,
        file,
        rawData: data,
        columns,
        mappings,
        monthColumns,
        step: 2,
      }));
    } catch (error) {
      toast.error((error as Error).message);
    }
  }, []);
  
  // Step 2: Update column mappings
  const updateMapping = useCallback((fileColumn: string, systemField: string) => {
    setState(prev => ({
      ...prev,
      mappings: prev.mappings.map(m => 
        m.fileColumn === fileColumn 
          ? { ...m, systemField, detected: false }
          : m.systemField === systemField && systemField !== ''
            ? { ...m, systemField: '', detected: false }
            : m
      ),
    }));
  }, []);
  
  // Step 2: Confirm mappings and parse data
  const confirmMappings = useCallback(() => {
    const result = parseImportData(state.rawData, state.mappings, state.monthColumns);
    
    if (result.errors.length > 0) {
      result.errors.forEach(err => toast.error(err));
      return;
    }
    
    // Calculate totals from file
    const totalBudget = result.lines.reduce((sum, line) => sum + line.totalBudget, 0);
    const allDates = result.lines.flatMap(line => [line.startDate, line.endDate].filter(Boolean)) as Date[];
    const startDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : null;
    const endDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : null;
    
    setState(prev => ({
      ...prev,
      parseResult: result,
      planInfo: {
        ...prev.planInfo,
        totalBudget,
        startDate,
        endDate,
      },
      step: 3,
    }));
  }, [state.rawData, state.mappings, state.monthColumns]);
  
  // Step 3: Update plan info
  const updatePlanInfo = useCallback((updates: Partial<PlanInfo>) => {
    setState(prev => ({
      ...prev,
      planInfo: { ...prev.planInfo, ...updates },
    }));
  }, []);
  
  // Step 3: Confirm plan info and detect entities
  const confirmPlanInfo = useCallback(async () => {
    if (!state.parseResult || !user) return;
    
    setState(prev => ({ ...prev, isCheckingEntities: true }));
    
    try {
      const lines = state.parseResult.lines;
      const unresolvedEntities: UnresolvedEntity[] = [];
      let entityId = 0;
      
      // Collect unique entity names
      const entityNames: Record<EntityType, Set<string>> = {
        client: new Set(),
        vehicle: new Set(),
        channel: new Set(),
        subdivision: new Set(),
        moment: new Set(),
        funnel_stage: new Set(),
        target: new Set(),
        medium: new Set(),
        format: new Set(),
      };
      
      const channelVehicleMap: Record<string, string> = {};
      
      lines.forEach((line, index) => {
        entityNames.vehicle.add(line.vehicleName);
        entityNames.channel.add(line.channelName);
        channelVehicleMap[line.channelName] = line.vehicleName;
        
        if (line.subdivisionName) entityNames.subdivision.add(line.subdivisionName);
        if (line.momentName) entityNames.moment.add(line.momentName);
        if (line.funnelStageName) entityNames.funnel_stage.add(line.funnelStageName);
        if (line.targetName) entityNames.target.add(line.targetName);
        if (line.mediumName) entityNames.medium.add(line.mediumName);
        if (line.formatName) entityNames.format.add(line.formatName);
      });
      
      // Fetch all existing entities in parallel
      const [vehiclesRes, channelsRes, subdivisionsRes, momentsRes, stagesRes, targetsRes] = await Promise.all([
        supabase.from('vehicles').select('id, name').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('channels').select('id, name, vehicle_id').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('plan_subdivisions').select('id, name').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('moments').select('id, name').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('funnel_stages').select('id, name').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('targets').select('id, name').eq('user_id', user.id).is('deleted_at', null),
      ]);
      
      const existingEntities: Record<EntityType, Array<{ id: string; name: string; parentId?: string }>> = {
        client: [],
        vehicle: (vehiclesRes.data || []).map(v => ({ id: v.id, name: v.name })),
        channel: (channelsRes.data || []).map(c => ({ id: c.id, name: c.name, parentId: c.vehicle_id })),
        subdivision: (subdivisionsRes.data || []).map(s => ({ id: s.id, name: s.name })),
        moment: (momentsRes.data || []).map(m => ({ id: m.id, name: m.name })),
        funnel_stage: (stagesRes.data || []).map(s => ({ id: s.id, name: s.name })),
        target: (targetsRes.data || []).map(t => ({ id: t.id, name: t.name })),
        medium: [],
        format: [],
      };
      
      const vehicleMap = new Map((vehiclesRes.data || []).map(v => [v.name.toLowerCase(), v.id]));
      
      for (const name of entityNames.vehicle) {
        if (!vehicleMap.has(name.toLowerCase())) {
          unresolvedEntities.push({
            id: `entity_${entityId++}`,
            type: 'vehicle',
            originalName: name,
            affectedLines: lines.filter(l => l.vehicleName === name).map(l => l.rowNumber),
            status: 'pending',
          });
        }
      }
      
      // Check channels
      const channelMap = new Map((channelsRes.data || []).map(c => [c.name.toLowerCase(), { id: c.id, vehicleId: c.vehicle_id }]));
      
      for (const name of entityNames.channel) {
        const channel = channelMap.get(name.toLowerCase());
        const vehicleName = channelVehicleMap[name];
        
        if (!channel) {
          unresolvedEntities.push({
            id: `entity_${entityId++}`,
            type: 'channel',
            originalName: name,
            affectedLines: lines.filter(l => l.channelName === name).map(l => l.rowNumber),
            status: 'pending',
            parentContext: {
              type: 'vehicle',
              name: vehicleName,
              id: vehicleMap.get(vehicleName.toLowerCase()),
            },
          });
        }
      }
      
      // Check subdivisions
      if (entityNames.subdivision.size > 0) {
        const subdivisionMap = new Map((subdivisionsRes.data || []).map(s => [s.name.toLowerCase(), s.id]));
        
        for (const name of entityNames.subdivision) {
          if (!subdivisionMap.has(name.toLowerCase())) {
            unresolvedEntities.push({
              id: `entity_${entityId++}`,
              type: 'subdivision',
              originalName: name,
              affectedLines: lines.filter(l => l.subdivisionName === name).map(l => l.rowNumber),
              status: 'pending',
            });
          }
        }
      }
      
      // Check moments
      if (entityNames.moment.size > 0) {
        const momentMap = new Map((momentsRes.data || []).map(m => [m.name.toLowerCase(), m.id]));
        
        for (const name of entityNames.moment) {
          if (!momentMap.has(name.toLowerCase())) {
            unresolvedEntities.push({
              id: `entity_${entityId++}`,
              type: 'moment',
              originalName: name,
              affectedLines: lines.filter(l => l.momentName === name).map(l => l.rowNumber),
              status: 'pending',
            });
          }
        }
      }
      
      // Check funnel stages
      if (entityNames.funnel_stage.size > 0) {
        const stageMap = new Map((stagesRes.data || []).map(s => [s.name.toLowerCase(), s.id]));
        
        for (const name of entityNames.funnel_stage) {
          if (!stageMap.has(name.toLowerCase())) {
            unresolvedEntities.push({
              id: `entity_${entityId++}`,
              type: 'funnel_stage',
              originalName: name,
              affectedLines: lines.filter(l => l.funnelStageName === name).map(l => l.rowNumber),
              status: 'pending',
            });
          }
        }
      }
      
      // Check targets
      if (entityNames.target.size > 0) {
        const targetMap = new Map((targetsRes.data || []).map(t => [t.name.toLowerCase(), t.id]));
        
        for (const name of entityNames.target) {
          if (!targetMap.has(name.toLowerCase())) {
            unresolvedEntities.push({
              id: `entity_${entityId++}`,
              type: 'target',
              originalName: name,
              affectedLines: lines.filter(l => l.targetName === name).map(l => l.rowNumber),
              status: 'pending',
            });
          }
        }
      }
      
      // Detect hierarchy based on data
      const detectedLevels: HierarchyLevel[] = [];
      if (entityNames.subdivision.size > 0) detectedLevels.push('subdivision');
      if (entityNames.moment.size > 0) detectedLevels.push('moment');
      if (entityNames.funnel_stage.size > 0) detectedLevels.push('funnel_stage');
      
      // Convert to HierarchyLevelConfig with default allocate_budget = true
      const detectedHierarchy = createHierarchyConfig(detectedLevels, true);
      
      setState(prev => ({
        ...prev,
        unresolvedEntities,
        existingEntities,
        detectedHierarchy,
        step: 4,
        isCheckingEntities: false,
      }));
    } catch (error) {
      console.error('Error checking entities:', error);
      toast.error('Erro ao verificar entidades');
      setState(prev => ({ ...prev, isCheckingEntities: false }));
    }
  }, [state.parseResult, user]);
  
  // Step 4: Resolve entity
  const resolveEntity = useCallback((entityId: string, resolvedId: string) => {
    setState(prev => ({
      ...prev,
      unresolvedEntities: prev.unresolvedEntities.map(e =>
        e.id === entityId ? { ...e, status: 'resolved' as const, resolvedId } : e
      ),
    }));
  }, []);
  
  
  // Step 4: Set entity as creating
  const setEntityCreating = useCallback((entityId: string, creating: boolean) => {
    setState(prev => ({
      ...prev,
      unresolvedEntities: prev.unresolvedEntities.map(e =>
        e.id === entityId ? { ...e, status: creating ? 'creating' as const : 'pending' as const } : e
      ),
    }));
  }, []);
  
  // Step 4: Add created entity to existing entities list
  const addCreatedEntity = useCallback((type: EntityType, entity: { id: string; name: string; parentId?: string }) => {
    setState(prev => ({
      ...prev,
      existingEntities: {
        ...prev.existingEntities,
        [type]: [...prev.existingEntities[type], entity],
      },
    }));
  }, []);
  
  // Step 4: Confirm entity resolution
  const confirmEntityResolution = useCallback(() => {
    const pending = state.unresolvedEntities.filter(e => e.status === 'pending');
    if (pending.length > 0) {
      toast.error(`Ainda há ${pending.length} entidade(s) pendente(s)`);
      return;
    }
    
    setState(prev => ({ ...prev, step: 5 }));
  }, [state.unresolvedEntities]);
  
  // Step 5: Update hierarchy config
  const updateHierarchyOrder = useCallback((newConfig: HierarchyLevelConfig[]) => {
    setState(prev => ({ ...prev, detectedHierarchy: newConfig }));
  }, []);
  
  // Step 5: Confirm hierarchy
  const confirmHierarchy = useCallback(() => {
    setState(prev => ({ ...prev, step: 6 }));
  }, []);
  
  // Step 6: Create plan
  const createPlan = useCallback(async () => {
    if (!user || !state.parseResult) return;
    
    setState(prev => ({ ...prev, isCreating: true }));
    
    try {
      const lines = state.parseResult.lines;
      const planInfo = state.planInfo;
      
      // Build entity ID maps
      const vehicleIdMap: Record<string, string> = {};
      const channelIdMap: Record<string, string> = {};
      const subdivisionIdMap: Record<string, string> = {};
      const momentIdMap: Record<string, string> = {};
      const funnelStageIdMap: Record<string, string> = {};
      const targetIdMap: Record<string, string> = {};
      
      // Fetch existing entities
      const [vehiclesRes, channelsRes, subdivisionsRes, momentsRes, stagesRes, targetsRes] = await Promise.all([
        supabase.from('vehicles').select('id, name').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('channels').select('id, name').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('plan_subdivisions').select('id, name').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('moments').select('id, name').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('funnel_stages').select('id, name').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('targets').select('id, name').eq('user_id', user.id).is('deleted_at', null),
      ]);
      
      (vehiclesRes.data || []).forEach(v => { vehicleIdMap[v.name.toLowerCase()] = v.id; });
      (channelsRes.data || []).forEach(c => { channelIdMap[c.name.toLowerCase()] = c.id; });
      (subdivisionsRes.data || []).forEach(s => { subdivisionIdMap[s.name.toLowerCase()] = s.id; });
      (momentsRes.data || []).forEach(m => { momentIdMap[m.name.toLowerCase()] = m.id; });
      (stagesRes.data || []).forEach(s => { funnelStageIdMap[s.name.toLowerCase()] = s.id; });
      (targetsRes.data || []).forEach(t => { targetIdMap[t.name.toLowerCase()] = t.id; });
      
      // Add resolved entities from the unresolved list
      for (const entity of state.unresolvedEntities) {
        if (entity.status === 'resolved' && entity.resolvedId) {
          const key = entity.originalName.toLowerCase();
          switch (entity.type) {
            case 'vehicle': vehicleIdMap[key] = entity.resolvedId; break;
            case 'channel': channelIdMap[key] = entity.resolvedId; break;
            case 'subdivision': subdivisionIdMap[key] = entity.resolvedId; break;
            case 'moment': momentIdMap[key] = entity.resolvedId; break;
            case 'funnel_stage': funnelStageIdMap[key] = entity.resolvedId; break;
            case 'target': targetIdMap[key] = entity.resolvedId; break;
          }
        }
      }
      
      // Calculate final values
      const totalBudget = planInfo.useBudgetFromFile 
        ? lines.reduce((sum, l) => sum + l.totalBudget, 0)
        : planInfo.totalBudget;
      
      const allDates = lines.flatMap(l => [l.startDate, l.endDate].filter(Boolean)) as Date[];
      const startDate = planInfo.useDatesFromFile && allDates.length > 0
        ? new Date(Math.min(...allDates.map(d => d.getTime())))
        : planInfo.startDate;
      const endDate = planInfo.useDatesFromFile && allDates.length > 0
        ? new Date(Math.max(...allDates.map(d => d.getTime())))
        : planInfo.endDate;
      
      // Create plan
      const { data: newPlan, error: planError } = await supabase
        .from('media_plans')
        .insert({
          name: planInfo.name,
          client_id: planInfo.clientId && planInfo.clientId !== 'none' ? planInfo.clientId : null,
          campaign: planInfo.campaign || null,
          total_budget: totalBudget,
          start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          status: 'draft',
          hierarchy_order: getHierarchyOrder(state.detectedHierarchy),
          hierarchy_config: state.detectedHierarchy as unknown as Record<string, unknown>[],
          user_id: user.id,
        } as any)
        .select()
        .single();
      
      if (planError) throw planError;
      
      // Filter valid lines (not ignored)
      const ignoredLineNumbers = new Set(
        state.unresolvedEntities
          .filter(e => e.status === 'ignored')
          .flatMap(e => e.affectedLines)
      );
      
      const validLines = lines.filter(l => !ignoredLineNumbers.has(l.rowNumber));
      
      // Create media lines
      const mediaLinesData = validLines.map(line => ({
        media_plan_id: newPlan.id,
        user_id: user.id,
        platform: line.vehicleName,
        line_code: line.lineCode,
        budget: line.totalBudget,
        start_date: line.startDate ? format(line.startDate, 'yyyy-MM-dd') : null,
        end_date: line.endDate ? format(line.endDate, 'yyyy-MM-dd') : null,
        vehicle_id: vehicleIdMap[line.vehicleName.toLowerCase()] || null,
        channel_id: channelIdMap[line.channelName.toLowerCase()] || null,
        subdivision_id: line.subdivisionName ? subdivisionIdMap[line.subdivisionName.toLowerCase()] || null : null,
        moment_id: line.momentName ? momentIdMap[line.momentName.toLowerCase()] || null : null,
        funnel_stage_id: line.funnelStageName ? funnelStageIdMap[line.funnelStageName.toLowerCase()] || null : null,
        target_id: line.targetName ? targetIdMap[line.targetName.toLowerCase()] || null : null,
        objective: line.objective || null,
        notes: line.notes || null,
        destination_url: line.destinationUrl || null,
      }));
      
      const { data: createdLines, error: linesError } = await supabase
        .from('media_lines')
        .insert(mediaLinesData)
        .select();
      
      if (linesError) throw linesError;
      
      // Create monthly budgets
      const monthlyBudgetsData: any[] = [];
      
      validLines.forEach((line, index) => {
        const createdLine = createdLines[index];
        if (!createdLine) return;
        
        if (Object.keys(line.monthlyBudgets).length > 0) {
          // Use monthly budgets from file
          for (const [monthDate, amount] of Object.entries(line.monthlyBudgets)) {
            if (amount > 0) {
              monthlyBudgetsData.push({
                media_line_id: createdLine.id,
                user_id: user.id,
                month_date: monthDate,
                amount,
              });
            }
          }
        } else if (line.startDate && line.endDate) {
          // Distribute evenly across months
          const start = startOfMonth(line.startDate);
          const end = startOfMonth(line.endDate);
          const monthCount = differenceInMonths(end, start) + 1;
          const monthlyAmount = line.totalBudget / monthCount;
          
          let current = start;
          while (current <= end) {
            monthlyBudgetsData.push({
              media_line_id: createdLine.id,
              user_id: user.id,
              month_date: format(current, 'yyyy-MM-01'),
              amount: monthlyAmount,
            });
            current = addMonths(current, 1);
          }
        }
      });
      
      if (monthlyBudgetsData.length > 0) {
        const { error: budgetsError } = await supabase
          .from('media_line_monthly_budgets')
          .insert(monthlyBudgetsData);
        
        if (budgetsError) throw budgetsError;
      }
      
      // Generate budget distributions from the created lines
      if (state.detectedHierarchy.length > 0 && createdLines.length > 0) {
        const linesForDistribution = createdLines.map(line => ({
          id: line.id,
          budget: line.budget,
          subdivision_id: line.subdivision_id,
          moment_id: line.moment_id,
          funnel_stage_id: line.funnel_stage_id,
          start_date: line.start_date,
          end_date: line.end_date,
        }));
        
        const distResult = await generateBudgetDistributionsFromLines({
          planId: newPlan.id,
          userId: user.id,
          hierarchyOrder: getHierarchyOrder(state.detectedHierarchy),
          lines: linesForDistribution,
          totalBudget,
          clearExisting: false, // No existing distributions for a new plan
        });
        
        if (!distResult.success) {
          console.error('Error generating distributions:', distResult.error);
          // Don't fail the whole import, just warn
          toast.warning('Plano criado, mas a hierarquia do orçamento precisa ser gerada manualmente');
        }
      }
      
      toast.success(`Plano "${planInfo.name}" criado com ${createdLines.length} linhas!`);
      navigate(`/media-plans/${newPlan.slug || newPlan.id}`);
      
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Erro ao criar plano: ' + (error as Error).message);
    } finally {
      setState(prev => ({ ...prev, isCreating: false }));
    }
  }, [user, state.parseResult, state.planInfo, state.unresolvedEntities, state.detectedHierarchy, navigate]);
  
  // Navigation
  const goToStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, step }));
  }, []);
  
  const goBack = useCallback(() => {
    setState(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  }, []);
  
  const reset = useCallback(() => {
    setState({
      step: 1,
      file: null,
      rawData: [],
      columns: [],
      mappings: [],
      monthColumns: [],
      parseResult: null,
      planInfo: initialPlanInfo,
      unresolvedEntities: [],
      detectedHierarchy: [],
      isCreating: false,
      isCheckingEntities: false,
      existingEntities: {
        client: [],
        vehicle: [],
        channel: [],
        subdivision: [],
        moment: [],
        funnel_stage: [],
        target: [],
        medium: [],
        format: [],
      },
    });
  }, []);
  
  return {
    state,
    handleFileUpload,
    updateMapping,
    confirmMappings,
    updatePlanInfo,
    confirmPlanInfo,
    resolveEntity,
    setEntityCreating,
    addCreatedEntity,
    confirmEntityResolution,
    updateHierarchyOrder,
    confirmHierarchy,
    createPlan,
    goToStep,
    goBack,
    reset,
  };
}
