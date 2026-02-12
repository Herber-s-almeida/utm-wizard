/**
 * Financial Calculations Engine for Detail Line Items.
 * 
 * All monetary values use 2 decimal places for display,
 * but internal calculations use full precision to avoid rounding errors.
 */

import { differenceInDays, parseISO, isValid } from 'date-fns';

export interface DetailItemData {
  // Financial inputs
  total_insertions?: number | null;
  unit_table_price?: number | null;
  discount_pct?: number | null;
  media_fee_pct?: number | null;
  production_qty?: number | null;
  production_unit_price?: number | null;
  production_fee_pct?: number | null;

  // Period inputs
  period_start?: string | null;
  period_end?: string | null;

  // Any other fields
  [key: string]: unknown;
}

export interface CalculatedValues {
  total_table_price: number;
  unit_gross_price: number;
  total_negotiated_gross: number;
  media_fee_value: number;
  total_net: number;
  production_total_gross: number;
  production_fee_value: number;
  production_total_net: number;
  grand_total: number;
  period_days: number;
}

/**
 * Safely parse a numeric value from potentially null/undefined/string input.
 */
function num(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

/**
 * Calculate all computed financial fields from a detail item's raw data.
 */
export function calculateFinancials(data: DetailItemData): CalculatedValues {
  const totalInsertions = num(data.total_insertions);
  const unitTablePrice = num(data.unit_table_price);
  const discountPct = num(data.discount_pct);
  const mediaFeePct = num(data.media_fee_pct);
  const productionQty = num(data.production_qty);
  const productionUnitPrice = num(data.production_unit_price);
  const productionFeePct = num(data.production_fee_pct);

  // Media calculations
  const total_table_price = unitTablePrice * totalInsertions;
  const unit_gross_price = unitTablePrice * (1 - discountPct / 100);
  const total_negotiated_gross = unit_gross_price * totalInsertions;
  const media_fee_value = total_negotiated_gross * (mediaFeePct / 100);
  const total_net = total_negotiated_gross + media_fee_value;

  // Production calculations
  const production_total_gross = productionUnitPrice * productionQty;
  const production_fee_value = production_total_gross * (productionFeePct / 100);
  const production_total_net = production_total_gross + production_fee_value;

  // Grand total
  const grand_total = total_net + production_total_net;

  // Period
  const period_days = calculatePeriodDays(data.period_start, data.period_end);

  return {
    total_table_price,
    unit_gross_price,
    total_negotiated_gross,
    media_fee_value,
    total_net,
    production_total_gross,
    production_fee_value,
    production_total_net,
    grand_total,
    period_days,
  };
}

/**
 * Calculate period days: end - start + 1
 */
export function calculatePeriodDays(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  if (!isValid(startDate) || !isValid(endDate)) return 0;
  const diff = differenceInDays(endDate, startDate) + 1;
  return diff > 0 ? diff : 0;
}

/**
 * Resolve a single formula key from the calculated values.
 */
export function resolveFormula(formulaKey: string, data: DetailItemData): number {
  const calc = calculateFinancials(data);
  const map: Record<string, number> = {
    total_table: calc.total_table_price,
    unit_gross: calc.unit_gross_price,
    total_negotiated_gross: calc.total_negotiated_gross,
    media_fee: calc.media_fee_value,
    total_net: calc.total_net,
    production_total_gross: calc.production_total_gross,
    production_fee: calc.production_fee_value,
    production_total_net: calc.production_total_net,
    grand_total: calc.grand_total,
    period_days: calc.period_days,
  };
  return map[formulaKey] ?? 0;
}

/**
 * Format a number as Brazilian Real currency (R$ 1.234,56).
 */
export function formatBRL(value: number, decimals = 2): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a number as percentage (12,50%).
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/**
 * Calculate totals (footer row) from an array of detail items.
 */
export function calculateTotals(
  items: DetailItemData[]
): {
  sums: Record<string, number>;
  minDate: string | null;
  maxDate: string | null;
  totalDays: number;
} {
  const sumKeys = [
    'total_insertions',
    'total_table_price',
    'total_negotiated_gross',
    'media_fee_value',
    'total_net',
    'production_total_gross',
    'production_fee_value',
    'production_total_net',
    'grand_total',
  ];

  const sums: Record<string, number> = {};
  sumKeys.forEach(k => { sums[k] = 0; });

  let minDate: string | null = null;
  let maxDate: string | null = null;

  items.forEach(item => {
    const calc = calculateFinancials(item);

    sums.total_insertions += num(item.total_insertions);
    sums.total_table_price += calc.total_table_price;
    sums.total_negotiated_gross += calc.total_negotiated_gross;
    sums.media_fee_value += calc.media_fee_value;
    sums.total_net += calc.total_net;
    sums.production_total_gross += calc.production_total_gross;
    sums.production_fee_value += calc.production_fee_value;
    sums.production_total_net += calc.production_total_net;
    sums.grand_total += calc.grand_total;

    if (item.period_start) {
      if (!minDate || item.period_start < minDate) minDate = item.period_start;
    }
    if (item.period_end) {
      if (!maxDate || item.period_end > maxDate) maxDate = item.period_end;
    }
  });

  const totalDays = calculatePeriodDays(minDate, maxDate);

  return { sums, minDate, maxDate, totalDays };
}

/**
 * Calculate grid insertion totals per day across all items.
 * Returns a map of date string -> total insertions.
 */
export function calculateGridDayTotals(
  insertions: Array<{ line_detail_item_id: string; insertion_date: string; quantity: number | null }>
): Record<string, number> {
  const totals: Record<string, number> = {};
  insertions.forEach(ins => {
    const qty = num(ins.quantity);
    totals[ins.insertion_date] = (totals[ins.insertion_date] || 0) + qty;
  });
  return totals;
}

/**
 * Count total insertions from grid data for a specific item.
 */
export function countGridInsertions(
  insertions: Array<{ line_detail_item_id: string; quantity: number | null }>,
  itemId: string
): number {
  return insertions
    .filter(ins => ins.line_detail_item_id === itemId)
    .reduce((sum, ins) => sum + num(ins.quantity), 0);
}
