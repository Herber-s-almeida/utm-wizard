/**
 * Shared utilities and types for detail block components.
 */
import { type DetailItemData, calculateFinancials, type CalculatedValues } from '@/utils/financialCalculations';
import { type ColumnDef, type BlockDef, type DetailCategory } from '@/utils/detailSchemas';

export interface BlockProps {
  block: BlockDef;
  items: DetailItemRow[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCellChange: (itemId: string, key: string, value: unknown) => void;
  /** Read-only mode (view permission only) */
  readOnly?: boolean;
  /** For format/creative select fields */
  formats?: Array<{ id: string; name: string }>;
  statuses?: Array<{ id: string; name: string }>;
  creatives?: Array<{ id: string; creative_id: string; message: string | null }>;
}

export interface DetailItemRow {
  id: string;
  data: Record<string, unknown>;
  calculated: CalculatedValues;
  isNew?: boolean;
  readOnly?: boolean;
  sourceLineCode?: string;
}

/**
 * Merge raw data with calculated values for display.
 */
export function getDisplayValue(col: ColumnDef, item: DetailItemRow): unknown {
  if (col.type === 'calculated' && col.formula) {
    const calcMap: Record<string, number> = {
      total_table: item.calculated.total_table_price,
      unit_gross: item.calculated.unit_gross_price,
      total_negotiated_gross: item.calculated.total_negotiated_gross,
      media_fee: item.calculated.media_fee_value,
      total_net: item.calculated.total_net,
      production_total_gross: item.calculated.production_total_gross,
      production_fee: item.calculated.production_fee_value,
      production_total_net: item.calculated.production_total_net,
      grand_total: item.calculated.grand_total,
      period_days: item.calculated.period_days,
    };
    return calcMap[col.formula] ?? 0;
  }
  return item.data[col.key];
}

/**
 * Check if a column is editable (not inherited, not calculated).
 */
export function isColumnEditable(col: ColumnDef): boolean {
  return !col.inherited && col.type !== 'calculated' && col.type !== 'readonly';
}
