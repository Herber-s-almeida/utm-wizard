import { useState, useCallback, useEffect } from 'react';

export type ColumnKey = 
  | 'subdivision' 
  | 'moment' 
  | 'funnel_stage' 
  | 'line_code' 
  | 'medium' 
  | 'vehicle' 
  | 'channel' 
  | 'target' 
  | 'objective'
  | 'notes'
  | 'budget' 
  | 'creatives' 
  | 'status' 
  | 'start_date' 
  | 'end_date' 
  | 'actions'
  | 'days'
  | 'allocated'
  | 'fee'
  | 'month';

export interface ColumnWidths {
  subdivision: number;
  moment: number;
  funnel_stage: number;
  line_code: number;
  medium: number;
  vehicle: number;
  channel: number;
  target: number;
  objective: number;
  notes: number;
  budget: number;
  creatives: number;
  status: number;
  start_date: number;
  end_date: number;
  actions: number;
  days: number;
  allocated: number;
  fee: number;
  month: number;
}

const DEFAULT_WIDTHS: ColumnWidths = {
  subdivision: 180,
  moment: 180,
  funnel_stage: 200,
  line_code: 120,
  medium: 80,
  vehicle: 110,
  channel: 100,
  target: 130,
  objective: 120,
  notes: 100,
  budget: 120,
  creatives: 90,
  status: 100,
  start_date: 100,
  end_date: 100,
  actions: 100,
  days: 60,
  allocated: 100,
  fee: 80,
  month: 90,
};

const FLAT_VIEW_WIDTHS: Partial<ColumnWidths> = {
  subdivision: 120,
  moment: 120,
  funnel_stage: 100,
};

const MIN_WIDTH = 50;
const STORAGE_KEY = 'media-plan-column-widths';

export type MinWidthOverrides = Partial<Record<ColumnKey, number>>;

export function useResizableColumns(viewMode: 'grouped' | 'flat' = 'grouped', minWidthOverrides?: MinWidthOverrides) {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_WIDTHS, ...JSON.parse(saved) };
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return DEFAULT_WIDTHS;
  });

  // Save to localStorage when widths change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [columnWidths]);

  const getWidth = useCallback((column: ColumnKey): number => {
    // Apply flat view overrides
    if (viewMode === 'flat' && column in FLAT_VIEW_WIDTHS) {
      const flatWidth = FLAT_VIEW_WIDTHS[column as keyof typeof FLAT_VIEW_WIDTHS];
      if (flatWidth !== undefined) {
        // Use stored width if it differs from default, otherwise use flat default
        const stored = columnWidths[column];
        const defaultVal = DEFAULT_WIDTHS[column];
        if (stored !== defaultVal) {
          return stored;
        }
        return flatWidth;
      }
    }
    return columnWidths[column];
  }, [columnWidths, viewMode]);

  const handleResize = useCallback((column: ColumnKey, newWidth: number) => {
    const effectiveMinWidth = minWidthOverrides?.[column] ?? MIN_WIDTH;
    setColumnWidths(prev => ({
      ...prev,
      [column]: Math.max(effectiveMinWidth, newWidth),
    }));
  }, [minWidthOverrides]);

  const resetWidths = useCallback(() => {
    setColumnWidths(DEFAULT_WIDTHS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // Ignore
    }
  }, []);

  return {
    columnWidths,
    getWidth,
    handleResize,
    resetWidths,
    DEFAULT_WIDTHS,
  };
}
