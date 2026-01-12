import { useState, useCallback, useMemo } from 'react';
import { useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets, useCreativeTemplates } from './useConfigData';
import { useClients } from './useClients';
import { HierarchyLevel, DEFAULT_HIERARCHY_ORDER, getLevelLabel, getLevelLabelPlural } from '@/types/hierarchy';

export interface WizardPlanData {
  name: string;
  client: string;
  client_id: string | null;
  utm_campaign_slug: string | null;
  start_date: string;
  end_date: string;
  total_budget: number;
  default_url: string;
  objectives: string[];
  kpis: Record<string, number>;
}

export interface BudgetAllocation {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  start_date?: string;
  end_date?: string;
}

// Generic allocation structure for dynamic hierarchy
export interface LevelAllocations {
  // Keyed by path: 'root', 'sub1', 'sub1_mom1', etc.
  [path: string]: BudgetAllocation[];
}

export interface WizardState {
  step: number;
  planData: WizardPlanData;
  // Dynamic hierarchy support
  hierarchyOrder: HierarchyLevel[];
  levelAllocations: LevelAllocations;
  // Legacy support (computed from levelAllocations)
  subdivisions: BudgetAllocation[];
  moments: Record<string, BudgetAllocation[]>;
  funnelStages: Record<string, BudgetAllocation[]>;
  // Temporal
  temporalGranularity: 'monthly' | 'quarterly';
  temporalDistribution: Record<string, BudgetAllocation[]>;
}

const createDefaultState = (): WizardState => ({
  step: 0, // Start at step 0 for hierarchy configuration
  planData: {
    name: '',
    client: '',
    client_id: null,
    utm_campaign_slug: null,
    start_date: '',
    end_date: '',
    total_budget: 0,
    default_url: '',
    objectives: [],
    kpis: {},
  },
  hierarchyOrder: [], // Start with empty (General budget) - user can add levels
  levelAllocations: {},
  // Legacy fields (for backward compatibility)
  subdivisions: [],
  moments: {},
  funnelStages: {},
  temporalGranularity: 'monthly',
  temporalDistribution: {},
});

export function useMediaPlanWizard() {
  const subdivisions = useSubdivisions();
  const moments = useMoments();
  const funnelStages = useFunnelStages();
  const mediums = useMediums();
  const vehicles = useVehicles();
  const channels = useChannels();
  const targets = useTargets();
  const creativeTemplates = useCreativeTemplates();
  const clients = useClients();

  const [state, setState] = useState<WizardState>(createDefaultState());

  // Get the number of wizard steps based on hierarchy order
  const totalSteps = useMemo(() => {
    // Step 0: Hierarchy config
    // Step 1: Plan data
    // Step 2 to N: One step per hierarchy level
    // Last step: Review
    return 2 + state.hierarchyOrder.length + 1;
  }, [state.hierarchyOrder.length]);

  // Get step configuration
  const getStepConfig = useCallback((stepNumber: number) => {
    if (stepNumber === 0) {
      return { id: 0, title: 'Estrutura', description: 'Ordem das divisões', level: null };
    }
    if (stepNumber === 1) {
      return { id: 1, title: 'Plano', description: 'Dados básicos', level: null };
    }
    
    const levelIndex = stepNumber - 2;
    if (levelIndex >= 0 && levelIndex < state.hierarchyOrder.length) {
      const level = state.hierarchyOrder[levelIndex];
      return {
        id: stepNumber,
        title: getLevelLabel(level),
        description: levelIndex === 0 ? 'Nível 1' : `Nível ${levelIndex + 1}`,
        level,
        levelIndex,
      };
    }
    
    // Review step
    return { id: stepNumber, title: 'Revisão', description: 'Confirmar', level: null };
  }, [state.hierarchyOrder]);

  // Generate wizard steps array
  const wizardSteps = useMemo(() => {
    const steps = [];
    for (let i = 0; i <= totalSteps - 1; i++) {
      const config = getStepConfig(i);
      steps.push({
        id: config.id,
        title: config.title,
        description: config.description,
      });
    }
    return steps;
  }, [totalSteps, getStepConfig]);

  const goToStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const updatePlanData = useCallback((data: Partial<WizardPlanData>) => {
    setState(prev => ({
      ...prev,
      planData: { ...prev.planData, ...data },
    }));
  }, []);

  // Set hierarchy order (does not reset allocations - caller controls that)
  const setHierarchyOrder = useCallback((order: HierarchyLevel[]) => {
    setState(prev => ({
      ...prev,
      hierarchyOrder: order,
    }));
  }, []);

  // Get allocations for a specific path
  const getAllocationsForPath = useCallback((path: string): BudgetAllocation[] => {
    return state.levelAllocations[path] || [];
  }, [state.levelAllocations]);

  // Set allocations for a specific path
  const setAllocationsForPath = useCallback((path: string, allocations: BudgetAllocation[]) => {
    setState(prev => {
      const newLevelAllocations = { ...prev.levelAllocations, [path]: allocations };
      
      // Also update legacy fields for backward compatibility
      const newState = { ...prev, levelAllocations: newLevelAllocations };
      
      // Sync to legacy fields based on level type
      // This is determined by the depth in the hierarchy
      const pathParts = path === 'root' ? [] : path.split('_');
      const depth = pathParts.length;
      
      if (depth === 0) {
        // Root level allocations - first level in hierarchy
        const firstLevel = prev.hierarchyOrder[0];
        if (firstLevel === 'subdivision') {
          newState.subdivisions = allocations;
        } else if (firstLevel === 'moment') {
          newState.moments = { ...prev.moments, root: allocations };
        } else if (firstLevel === 'funnel_stage') {
          newState.funnelStages = { ...prev.funnelStages, root: allocations };
        }
      }
      
      return newState;
    });
  }, []);

  // Legacy setters that work with new structure
  const setSubdivisions = useCallback((allocations: BudgetAllocation[]) => {
    setState(prev => {
      const newState = { ...prev, subdivisions: allocations };
      
      // If subdivision is the first level, also set in levelAllocations
      if (prev.hierarchyOrder[0] === 'subdivision') {
        newState.levelAllocations = { ...prev.levelAllocations, root: allocations };
      }
      
      return newState;
    });
  }, []);

  // Set moments for a specific path (supports full hierarchical paths like 'curitiba_lancamento')
  const setMoments = useCallback((path: string, allocations: BudgetAllocation[]) => {
    setState(prev => ({
      ...prev,
      moments: { ...prev.moments, [path]: allocations },
    }));
  }, []);

  // Set funnel stages for a specific path (supports full hierarchical paths)
  const setFunnelStages = useCallback((path: string, allocations: BudgetAllocation[]) => {
    setState(prev => ({
      ...prev,
      funnelStages: { ...prev.funnelStages, [path]: allocations },
    }));
  }, []);

  const setTemporalGranularity = useCallback((granularity: 'monthly' | 'quarterly') => {
    setState(prev => ({
      ...prev,
      temporalGranularity: granularity,
    }));
  }, []);

  const setTemporalDistribution = useCallback((key: string, allocations: BudgetAllocation[]) => {
    setState(prev => ({
      ...prev,
      temporalDistribution: { ...prev.temporalDistribution, [key]: allocations },
    }));
  }, []);

  const validatePercentages = useCallback((allocations: BudgetAllocation[]) => {
    const total = allocations.reduce((sum, a) => sum + a.percentage, 0);
    return Math.abs(total - 100) < 0.01;
  }, []);

  const calculateAmount = useCallback((parentAmount: number, percentage: number) => {
    return (parentAmount * percentage) / 100;
  }, []);

  const reset = useCallback(() => {
    setState(createDefaultState());
  }, []);

  // Initialize state from existing plan data (for edit mode)
  const initializeFromPlan = useCallback((
    planData: WizardPlanData,
    subdivisionAllocations: BudgetAllocation[],
    momentAllocations: Record<string, BudgetAllocation[]>,
    funnelAllocations: Record<string, BudgetAllocation[]>,
    initialStep: number = 0,
    hierarchyOrder?: HierarchyLevel[]
  ) => {
    setState({
      step: initialStep,
      planData,
      // Accept empty array as valid hierarchy (General budget)
      hierarchyOrder: hierarchyOrder ?? [],
      levelAllocations: {},
      subdivisions: subdivisionAllocations,
      moments: momentAllocations,
      funnelStages: funnelAllocations,
      temporalGranularity: 'monthly',
      temporalDistribution: {},
    });
  }, []);

  const setFullState = useCallback((newState: WizardState) => {
    setState(newState);
  }, []);

  // Get library data for a specific level
  const getLibraryForLevel = useCallback((level: HierarchyLevel) => {
    switch (level) {
      case 'subdivision':
        return subdivisions.activeItems || [];
      case 'moment':
        return moments.activeItems || [];
      case 'funnel_stage':
        return funnelStages.activeItems || [];
      default:
        return [];
    }
  }, [subdivisions.activeItems, moments.activeItems, funnelStages.activeItems]);

  // Get create mutation for a specific level
  const getCreateMutationForLevel = useCallback((level: HierarchyLevel) => {
    switch (level) {
      case 'subdivision':
        return subdivisions.create;
      case 'moment':
        return moments.create;
      case 'funnel_stage':
        return funnelStages.create;
      default:
        return null;
    }
  }, [subdivisions.create, moments.create, funnelStages.create]);

  return {
    state,
    totalSteps,
    wizardSteps,
    getStepConfig,
    goToStep,
    updatePlanData,
    setHierarchyOrder,
    getAllocationsForPath,
    setAllocationsForPath,
    // Legacy setters
    setSubdivisions,
    setMoments,
    setFunnelStages,
    setTemporalGranularity,
    setTemporalDistribution,
    validatePercentages,
    calculateAmount,
    reset,
    initializeFromPlan,
    setFullState,
    // Dynamic library access
    getLibraryForLevel,
    getCreateMutationForLevel,
    // Library data
    libraryData: {
      subdivisions: subdivisions.activeItems || [],
      moments: moments.activeItems || [],
      funnelStages: funnelStages.activeItems || [],
      mediums: mediums.activeItems || [],
      vehicles: vehicles.activeItems || [],
      channels: channels.activeItems || [],
      targets: targets.activeItems || [],
      creativeTemplates: creativeTemplates.activeItems || [],
      clients: clients.activeItems || [],
    },
    libraryMutations: {
      createSubdivision: subdivisions.create,
      createMoment: moments.create,
      createFunnelStage: funnelStages.create,
      createClient: clients.create,
    },
  };
}
