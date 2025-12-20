import { useState, useCallback } from 'react';
import { useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets, useCreativeTemplates } from './useConfigData';

export interface WizardPlanData {
  name: string;
  client: string;
  campaign: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  objectives: string[];
  kpis: Record<string, number>;
}

export interface BudgetAllocation {
  id: string;
  name: string;
  percentage: number;
  amount: number;
}

export interface WizardState {
  step: number;
  planData: WizardPlanData;
  subdivisions: BudgetAllocation[];
  moments: Record<string, BudgetAllocation[]>; // keyed by subdivision id or 'root'
  funnelStages: Record<string, BudgetAllocation[]>; // keyed by moment path
  temporalGranularity: 'weekly' | 'monthly';
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

  const [state, setState] = useState<WizardState>({
    step: 1,
    planData: {
      name: '',
      client: '',
      campaign: '',
      start_date: '',
      end_date: '',
      total_budget: 0,
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

  const setTemporalGranularity = useCallback((granularity: 'weekly' | 'monthly') => {
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
        campaign: '',
        start_date: '',
        end_date: '',
        total_budget: 0,
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
    // Library data
    libraryData: {
      subdivisions: subdivisions.data || [],
      moments: moments.data || [],
      funnelStages: funnelStages.data || [],
      mediums: mediums.data || [],
      vehicles: vehicles.data || [],
      channels: channels.data || [],
      targets: targets.data || [],
      creativeTemplates: creativeTemplates.data || [],
    },
    libraryMutations: {
      createSubdivision: subdivisions.create,
      createMoment: moments.create,
      createFunnelStage: funnelStages.create,
    },
  };
}