import { useState, useCallback, useEffect } from 'react';

export type PlanElementKey = 'plan-summary' | 'moments-timeline' | 'budget-hierarchy' | 'temporal-distribution';

export interface PlanElementVisibility {
  key: PlanElementKey;
  label: string;
  visible: boolean;
}

const STORAGE_KEY_PREFIX = 'plan-elements-visibility';

const DEFAULT_ELEMENTS: PlanElementVisibility[] = [
  { key: 'plan-summary', label: 'Resumo do Plano', visible: true },
  { key: 'moments-timeline', label: 'Timeline de Momentos', visible: true },
  { key: 'budget-hierarchy', label: 'Hierarquia do Orçamento', visible: true },
  { key: 'temporal-distribution', label: 'Distribuição Temporal', visible: true },
];

export function usePlanElementsVisibility(planId: string | undefined) {
  const storageKey = planId ? `${STORAGE_KEY_PREFIX}-${planId}` : null;
  
  const [elements, setElements] = useState<PlanElementVisibility[]>(() => {
    if (!storageKey) return DEFAULT_ELEMENTS;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<PlanElementKey, boolean>;
        return DEFAULT_ELEMENTS.map(el => ({
          ...el,
          visible: parsed[el.key] ?? el.visible,
        }));
      }
    } catch {
      // Ignore parsing errors
    }
    return DEFAULT_ELEMENTS;
  });

  // Persist changes to localStorage
  useEffect(() => {
    if (!storageKey) return;
    
    const visibility = elements.reduce((acc, el) => {
      acc[el.key] = el.visible;
      return acc;
    }, {} as Record<PlanElementKey, boolean>);
    
    localStorage.setItem(storageKey, JSON.stringify(visibility));
  }, [elements, storageKey]);

  const toggleVisibility = useCallback((key: PlanElementKey) => {
    setElements(prev => prev.map(el => 
      el.key === key ? { ...el, visible: !el.visible } : el
    ));
  }, []);

  const hideElement = useCallback((key: PlanElementKey) => {
    setElements(prev => prev.map(el => 
      el.key === key ? { ...el, visible: false } : el
    ));
  }, []);

  const showElement = useCallback((key: PlanElementKey) => {
    setElements(prev => prev.map(el => 
      el.key === key ? { ...el, visible: true } : el
    ));
  }, []);

  const isVisible = useCallback((key: PlanElementKey) => {
    return elements.find(el => el.key === key)?.visible ?? true;
  }, [elements]);

  const showAll = useCallback(() => {
    setElements(prev => prev.map(el => ({ ...el, visible: true })));
  }, []);

  return {
    elements,
    toggleVisibility,
    hideElement,
    showElement,
    isVisible,
    showAll,
  };
}
