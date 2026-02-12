/**
 * Detail Block Schemas for OOH, Rádio, and TV detail types.
 * Defines the structure of each block and its columns.
 */

export type DetailCategory = 'ooh' | 'radio' | 'tv' | 'custom';

export type ColumnType = 
  | 'text' 
  | 'number' 
  | 'currency' 
  | 'percentage' 
  | 'date' 
  | 'url' 
  | 'select' 
  | 'multi-select' 
  | 'readonly' 
  | 'calculated';

export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  /** If true, value comes from inherited context (line/plan) */
  inherited?: boolean;
  /** Source of inherited data: 'plan' | 'line' | 'format' | 'creative' */
  inheritSource?: 'plan' | 'line' | 'format' | 'creative';
  /** The field key to inherit from the source */
  inheritField?: string;
  /** For calculated fields, the formula key (resolved by financialCalculations engine) */
  formula?: string;
  /** For select fields, options source */
  optionsSource?: string;
  /** For multi-select, the available options */
  options?: string[];
  /** Whether this field is required */
  required?: boolean;
  /** Minimum column width in px */
  minWidth?: number;
  /** Whether this column is visible when the block is collapsed */
  visibleWhenCollapsed?: boolean;
  /** Decimal places for number/currency/percentage */
  decimals?: number;
  /** Whether this column appears in the footer totals */
  showInTotals?: boolean;
  /** Total type: 'sum' | 'min' | 'max' | 'calc' */
  totalType?: 'sum' | 'min' | 'max' | 'calc';
  /** Whether the field depends on grid mode */
  gridDependent?: boolean;
}

export interface BlockDef {
  key: string;
  label: string;
  /** Whether the block can be collapsed */
  collapsible: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Columns in this block */
  columns: ColumnDef[];
}

export interface DetailTypeSchema {
  category: DetailCategory;
  label: string;
  /** Whether grid mode is available */
  supportsGrid: boolean;
  /** Blocks in display order */
  blocks: BlockDef[];
}

// ─── Shared block definitions ───────────────────────────────────────────

const campaignBlock: BlockDef = {
  key: 'campaign',
  label: 'Campanha',
  collapsible: false,
  columns: [
    { key: 'subdivision', label: 'Subdivisão', type: 'readonly', inherited: true, inheritSource: 'plan', inheritField: 'subdivision_name', minWidth: 100 },
    { key: 'moment', label: 'Momento', type: 'readonly', inherited: true, inheritSource: 'plan', inheritField: 'moment_name', minWidth: 100 },
    { key: 'funnel_stage', label: 'Fase', type: 'readonly', inherited: true, inheritSource: 'plan', inheritField: 'funnel_stage_name', minWidth: 100 },
    { key: 'status_id', label: 'Status', type: 'select', optionsSource: 'statuses', minWidth: 120 },
    { key: 'line_code', label: 'COD', type: 'readonly', inherited: true, inheritSource: 'line', inheritField: 'line_code', minWidth: 60 },
    { key: 'vehicle', label: 'Veículo', type: 'readonly', inherited: true, inheritSource: 'line', inheritField: 'vehicle_name', minWidth: 100 },
    { key: 'medium', label: 'Meio', type: 'readonly', inherited: true, inheritSource: 'line', inheritField: 'medium_name', minWidth: 100 },
  ],
};

const sharedFormatMessageColumns: ColumnDef[] = [
  { key: 'format_id', label: 'Formato', type: 'select', optionsSource: 'formats', minWidth: 140 },
  { key: 'creative_type', label: 'Tipo de Criativo', type: 'readonly', inherited: true, inheritSource: 'format', inheritField: 'creative_type_name', minWidth: 120 },
  { key: 'dimension', label: 'Dimensão', type: 'readonly', inherited: true, inheritSource: 'format', inheritField: 'dimension', minWidth: 100 },
  { key: 'duration', label: 'Tempo de Duração', type: 'readonly', inherited: true, inheritSource: 'format', inheritField: 'duration', minWidth: 100 },
  { key: 'creative_id', label: 'Criativo – ID', type: 'select', optionsSource: 'creatives', visibleWhenCollapsed: true, minWidth: 100 },
  { key: 'message', label: 'Mensagem', type: 'readonly', inherited: true, inheritSource: 'creative', inheritField: 'message', minWidth: 140 },
  { key: 'message_note', label: 'Obs. Mensagem', type: 'text', minWidth: 140 },
  { key: 'days_of_week', label: 'Dias da Semana', type: 'multi-select', options: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'], minWidth: 160 },
];

const financialBlock: BlockDef = {
  key: 'financial',
  label: 'Financeiro',
  collapsible: true,
  defaultCollapsed: false,
  columns: [
    { key: 'contract_type', label: 'Tipo de contratação', type: 'text', minWidth: 120 },
    { key: 'total_insertions', label: 'Total de Inserções (qtd)', type: 'number', decimals: 0, gridDependent: true, visibleWhenCollapsed: true, showInTotals: true, totalType: 'sum', minWidth: 80 },
    { key: 'unit_table_price', label: '$ Unitário (tabela)', type: 'currency', decimals: 2, minWidth: 100 },
    { key: 'total_table_price', label: '$ Total (tabela)', type: 'calculated', formula: 'total_table', decimals: 2, showInTotals: true, totalType: 'sum', minWidth: 110 },
    { key: 'discount_pct', label: '% Desconto Negociado', type: 'percentage', decimals: 2, minWidth: 100 },
    { key: 'unit_gross_price', label: '$ Unitário (bruto)', type: 'calculated', formula: 'unit_gross', decimals: 2, minWidth: 100 },
    { key: 'total_negotiated_gross', label: '$ Total Negociado (bruto)', type: 'calculated', formula: 'total_negotiated_gross', decimals: 2, showInTotals: true, totalType: 'sum', minWidth: 120 },
    { key: 'media_fee_pct', label: '% Fee de Mídia', type: 'percentage', decimals: 2, minWidth: 90 },
    { key: 'media_fee_value', label: '$ Fee de Mídia', type: 'calculated', formula: 'media_fee', decimals: 2, showInTotals: true, totalType: 'sum', minWidth: 100 },
    { key: 'total_net', label: '$ Total (Líquido)', type: 'calculated', formula: 'total_net', decimals: 2, visibleWhenCollapsed: true, showInTotals: true, totalType: 'sum', minWidth: 110 },
    { key: 'production_qty', label: 'Produção Estimada (qtd)', type: 'number', decimals: 0, minWidth: 90 },
    { key: 'production_unit_price', label: '$ Produção Unitária Estimada', type: 'currency', decimals: 2, minWidth: 120 },
    { key: 'production_total_gross', label: '$ Produção Total Estimada', type: 'calculated', formula: 'production_total_gross', decimals: 2, showInTotals: true, totalType: 'sum', minWidth: 120 },
    { key: 'production_fee_pct', label: '% Fee de Produção', type: 'percentage', decimals: 2, minWidth: 90 },
    { key: 'production_fee_value', label: '$ Fee de Produção', type: 'calculated', formula: 'production_fee', decimals: 2, showInTotals: true, totalType: 'sum', minWidth: 100 },
    { key: 'production_total_net', label: '$ Total de Produção (líquido)', type: 'calculated', formula: 'production_total_net', decimals: 2, showInTotals: true, totalType: 'sum', minWidth: 120 },
    { key: 'grand_total', label: '$ Total Mídia + Produção', type: 'calculated', formula: 'grand_total', decimals: 2, showInTotals: true, totalType: 'sum', minWidth: 130 },
  ],
};

const periodBlock: BlockDef = {
  key: 'period',
  label: 'Período',
  collapsible: false,
  columns: [
    { key: 'period_start', label: 'Início', type: 'date', showInTotals: true, totalType: 'min', minWidth: 100 },
    { key: 'period_end', label: 'Fim', type: 'date', showInTotals: true, totalType: 'max', minWidth: 100 },
    { key: 'period_days', label: 'Dias', type: 'calculated', formula: 'period_days', decimals: 0, showInTotals: true, totalType: 'calc', minWidth: 60 },
  ],
};

// ─── OOH-specific format & message columns ──────────────────────────────

const oohFormatMessageBlock: BlockDef = {
  key: 'format_message',
  label: 'Formato e Mensagem',
  collapsible: true,
  defaultCollapsed: false,
  columns: [
    ...sharedFormatMessageColumns,
    { key: 'ooh_point', label: 'Ponto de OOH', type: 'text', minWidth: 120 },
    { key: 'ooh_point_type', label: 'Tipo de ponto de OOH', type: 'text', minWidth: 120 },
    { key: 'ooh_location', label: 'Localização', type: 'url', minWidth: 120 },
  ],
};

// ─── Rádio/TV-specific format & message columns ────────────────────────

const radioTvFormatMessageColumns: ColumnDef[] = [
  ...sharedFormatMessageColumns,
  { key: 'program', label: 'Programa', type: 'text', minWidth: 120 },
  { key: 'time_slot', label: 'Faixa Horária', type: 'text', minWidth: 100 },
];

const radioFormatMessageBlock: BlockDef = {
  key: 'format_message',
  label: 'Formato e Mensagem',
  collapsible: true,
  defaultCollapsed: false,
  columns: radioTvFormatMessageColumns,
};

const tvFormatMessageBlock: BlockDef = {
  key: 'format_message',
  label: 'Formato e Mensagem',
  collapsible: true,
  defaultCollapsed: false,
  columns: radioTvFormatMessageColumns,
};

// ─── Complete schemas ───────────────────────────────────────────────────

export const detailTypeSchemas: Record<DetailCategory, DetailTypeSchema> = {
  ooh: {
    category: 'ooh',
    label: 'OOH / Mídia Exterior',
    supportsGrid: true,
    blocks: [campaignBlock, oohFormatMessageBlock, financialBlock, periodBlock],
  },
  radio: {
    category: 'radio',
    label: 'Rádio',
    supportsGrid: true,
    blocks: [campaignBlock, radioFormatMessageBlock, financialBlock, periodBlock],
  },
  tv: {
    category: 'tv',
    label: 'TV',
    supportsGrid: true,
    blocks: [campaignBlock, tvFormatMessageBlock, financialBlock, periodBlock],
  },
  custom: {
    category: 'custom',
    label: 'Personalizado',
    supportsGrid: false,
    blocks: [],
  },
};

/**
 * Get all columns (flattened from all blocks) for a given detail category.
 */
export function getAllColumns(category: DetailCategory): ColumnDef[] {
  const schema = detailTypeSchemas[category];
  if (!schema) return [];
  return schema.blocks.flatMap(b => b.columns);
}

/**
 * Get columns that appear in the totals footer row.
 */
export function getTotalColumns(category: DetailCategory): ColumnDef[] {
  return getAllColumns(category).filter(c => c.showInTotals);
}

/**
 * Get columns visible when a block is collapsed.
 */
export function getCollapsedColumns(block: BlockDef): ColumnDef[] {
  return block.columns.filter(c => c.visibleWhenCollapsed);
}

/**
 * Get the editable (non-inherited, non-calculated) column keys for data entry.
 */
export function getEditableColumnKeys(category: DetailCategory): string[] {
  return getAllColumns(category)
    .filter(c => !c.inherited && c.type !== 'calculated')
    .map(c => c.key);
}
