import { useState, useCallback } from 'react';
import { useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets, useCreativeTemplates } from './useConfigData';
import { useClients } from './useClients';

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

export interface WizardState {
  step: number;
  planData: WizardPlanData;
  subdivisions: BudgetAllocation[];
  moments: Record<string, BudgetAllocation[]>; // keyed by subdivision id or 'root'
  funnelStages: Record<string, BudgetAllocation[]>; // keyed by moment path
  temporalGranularity: 'monthly' | 'quarterly';
  temporalDistribution: Record<string, BudgetAllocation[]>;
}

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

  const [state, setState] = useState<WizardState>({
    step: 1,
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
    subdivisions: [],
    moments: {},
    funnelStages: {},
    temporalGranularity: 'monthly',
    temporalDistribution: {},
  });

  const goToStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const updatePlanData = useCallback((data: Partial<WizardPlanData>) => {
    setState(prev => ({
      ...prev,
      planData: { ...prev.planData, ...data },
    }));
  }, []);

  const setSubdivisions = useCallback((allocations: BudgetAllocation[]) => {
    setState(prev => ({
      ...prev,
      subdivisions: allocations,
    }));
  }, []);

  const setMoments = useCallback((key: string, allocations: BudgetAllocation[]) => {
    setState(prev => ({
      ...prev,
      moments: { ...prev.moments, [key]: allocations },
    }));
  }, []);

  const setFunnelStages = useCallback((key: string, allocations: BudgetAllocation[]) => {
    setState(prev => ({
      ...prev,
      funnelStages: { ...prev.funnelStages, [key]: allocations },
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
    setState({
      step: 1,
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
      subdivisions: [],
      moments: {},
      funnelStages: {},
      temporalGranularity: 'monthly',
      temporalDistribution: {},
    });
  }, []);

  // Initialize state from existing plan data (for edit mode)
  const initializeFromPlan = useCallback((
    planData: WizardPlanData,
    subdivisionAllocations: BudgetAllocation[],
    momentAllocations: Record<string, BudgetAllocation[]>,
    funnelAllocations: Record<string, BudgetAllocation[]>,
    initialStep: number = 2
  ) => {
    setState({
      step: initialStep,
      planData,
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

  return {
    state,
    goToStep,
    updatePlanData,
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