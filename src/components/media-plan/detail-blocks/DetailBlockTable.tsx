/**
 * DetailBlockTable - Main table component for block-based detail types.
 * Renders all blocks (Campaign, Format & Message, Financial, Period) as column groups,
 * supports inline editing, calculated fields, totals row, optional grid,
 * and wizard dialogs for creating new formats and creatives.
 */
import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Save, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type DetailCategory, type BlockDef, type ColumnDef, detailTypeSchemas } from '@/utils/detailSchemas';
import { calculateFinancials, calculateTotals, formatBRL, formatPercentage, countGridInsertions, type DetailItemData } from '@/utils/financialCalculations';
import { BlockHeader } from './BlockHeader';
import { CellRenderer } from './CellRenderer';
import { GridBlock } from './GridBlock';
import { type DetailItemRow, getDisplayValue, isColumnEditable } from './blockUtils';
import { FormatWizardDialog } from '@/components/config/FormatWizardDialog';
import { CreativeDialog } from '@/components/config/CreativeDialog';
import { cn } from '@/lib/utils';
import { format as fnsFormat, parseISO, isValid } from 'date-fns';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';

export interface DetailBlockTableProps {
  category: DetailCategory;
  items: Array<{
    id: string;
    data: Record<string, unknown>;
    total_insertions?: number;
    days_of_week?: string[];
    period_start?: string | null;
    period_end?: string | null;
    format_id?: string | null;
    creative_id?: string | null;
    status_id?: string | null;
    insertions?: Array<{ insertion_date: string; quantity: number; line_detail_item_id: string }>;
  }>;
  /** Inherited context from the media line */
  inheritedContext: Record<string, unknown>;
  /** Whether this detail uses insertion grid */
  hasGrid: boolean;
  /** Plan date range for validation */
  planStartDate?: string | null;
  planEndDate?: string | null;
  /** Callbacks */
  onCreateItem: (data: Record<string, unknown>) => Promise<unknown>;
  onUpdateItem: (id: string, data: Record<string, unknown>, extras?: Record<string, unknown>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onInsertionChange?: (itemId: string, date: string, quantity: number) => void;
  onSaveInsertions?: (itemId: string, insertions: { date: string; quantity: number }[]) => Promise<void>;
  /** Reference data for select fields */
  formats?: Array<{ id: string; name: string }>;
  statuses?: Array<{ id: string; name: string }>;
  creatives?: Array<{ id: string; creative_id: string; message: string | null; copy_text?: string | null }>;
  /** Format detail data for enrichment (creative_type_name, dimension, duration) */
  formatDetails?: Record<string, { creative_type_name?: string; dimension?: string; duration?: string }>;
  /** Callbacks for wizard completion */
  onFormatCreated?: () => void;
  onCreativeCreated?: () => void;
  /** Media line ID needed for creative creation */
  mediaLineId?: string;
  readOnly?: boolean;
}

export function DetailBlockTable({
  category,
  items,
  inheritedContext,
  hasGrid,
  planStartDate,
  planEndDate,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onInsertionChange,
  onSaveInsertions,
  formats = [],
  statuses = [],
  creatives = [],
  formatDetails = {},
  onFormatCreated,
  onCreativeCreated,
  mediaLineId,
  readOnly = false,
}: DetailBlockTableProps) {
  const schema = detailTypeSchemas[category];
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    schema?.blocks.forEach(b => {
      if (b.defaultCollapsed) initial.add(b.key);
    });
    return initial;
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, unknown>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemData, setNewItemData] = useState<Record<string, unknown>>({});

  // Wizard dialog states
  const [showFormatWizard, setShowFormatWizard] = useState(false);
  const [showCreativeDialog, setShowCreativeDialog] = useState(false);

  const toggleBlock = (key: string) => {
    setCollapsedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Get visible columns per block considering collapse state
  const getVisibleColumns = useCallback((block: BlockDef): ColumnDef[] => {
    if (!block.collapsible || !collapsedBlocks.has(block.key)) {
      return block.columns;
    }
    return block.columns.filter(c => c.visibleWhenCollapsed);
  }, [collapsedBlocks]);

  const allVisibleColumns = useMemo(() => {
    if (!schema) return [];
    return schema.blocks.flatMap(b => getVisibleColumns(b));
  }, [schema, getVisibleColumns]);

  // Build enriched item rows with inherited data and calculations
  const enrichedItems: DetailItemRow[] = useMemo(() => {
    return items.map(item => {
      // Merge inherited context into data for display
      const mergedData: Record<string, unknown> = { ...item.data };

      // Fill inherited fields
      mergedData.subdivision = inheritedContext.subdivision_name;
      mergedData.moment = inheritedContext.moment_name;
      mergedData.funnel_stage = inheritedContext.funnel_stage_name;
      mergedData.line_code = inheritedContext.line_code;
      mergedData.vehicle = inheritedContext.vehicle_name;
      mergedData.medium = inheritedContext.medium_name;

      // For grid mode, total_insertions comes from grid
      if (hasGrid && item.insertions) {
        const gridTotal = item.insertions.reduce((sum, ins) => sum + (ins.quantity || 0), 0);
        mergedData.total_insertions = gridTotal;
      } else if (item.total_insertions !== undefined) {
        mergedData.total_insertions = item.total_insertions;
      }

      // Period
      mergedData.period_start = item.period_start || item.data.period_start;
      mergedData.period_end = item.period_end || item.data.period_end;

      // Status / format / creative IDs
      mergedData.status_id = item.status_id || item.data.status_id;
      mergedData.format_id = item.format_id || item.data.format_id;
      mergedData.creative_id = item.creative_id || item.data.creative_id;
      mergedData.days_of_week = item.days_of_week || item.data.days_of_week;

      // Enrich format-inherited fields from formatDetails
      const fmtId = mergedData.format_id as string;
      if (fmtId && formatDetails[fmtId]) {
        const fd = formatDetails[fmtId];
        mergedData.creative_type = fd.creative_type_name || mergedData.creative_type;
        mergedData.dimension = fd.dimension || mergedData.dimension;
        mergedData.duration = fd.duration || mergedData.duration;
      }

      // Enrich creative-inherited fields
      const crtId = mergedData.creative_id as string;
      if (crtId) {
        const crt = creatives.find(c => c.id === crtId);
        if (crt) {
          mergedData.message = crt.message || crt.copy_text || mergedData.message;
        }
      }

      const calculated = calculateFinancials(mergedData as DetailItemData);

      return { id: item.id, data: mergedData, calculated };
    });
  }, [items, inheritedContext, hasGrid, formatDetails, creatives]);

  // Totals
  const totals = useMemo(() => {
    const itemsData = enrichedItems.map(r => r.data as DetailItemData);
    return calculateTotals(itemsData);
  }, [enrichedItems]);

  const selectOptionsForColumn = (col: ColumnDef) => {
    if (col.optionsSource === 'statuses') return statuses.map(s => ({ id: s.id, name: s.name }));
    if (col.optionsSource === 'formats') return formats.map(f => ({ id: f.id, name: f.name }));
    if (col.optionsSource === 'creatives') return creatives.map(c => ({ id: c.id, name: c.creative_id || c.id }));
    return [];
  };

  const getCreateNewHandler = (col: ColumnDef): (() => void) | undefined => {
    if (readOnly) return undefined;
    if (col.key === 'format_id') return () => setShowFormatWizard(true);
    if (col.key === 'creative_id') return () => setShowCreativeDialog(true);
    return undefined;
  };

  const startEditing = (item: DetailItemRow) => {
    setEditingItemId(item.id);
    setEditingData({ ...item.data });
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingData({});
  };

  const validateDates = (data: Record<string, unknown>): string | null => {
    const start = data.period_start as string | undefined;
    const end = data.period_end as string | undefined;
    if (start && end && start > end) return 'A data de fim deve ser posterior à data de início.';
    if (start && planStartDate && start < planStartDate) return 'A data de início deve estar dentro do período do plano.';
    if (end && planEndDate && end > planEndDate) return 'A data de fim deve estar dentro do período do plano.';
    if (start && planEndDate && start > planEndDate) return 'A data de início deve estar dentro do período do plano.';
    if (end && planStartDate && end < planStartDate) return 'A data de fim deve estar dentro do período do plano.';
    return null;
  };

  const handleSave = async (itemId: string) => {
    const dateError = validateDates(editingData);
    if (dateError) {
      toast.error(dateError);
      return;
    }
    try {
      const { status_id, format_id, creative_id, days_of_week, period_start, period_end, ...rest } = editingData;
      await onUpdateItem(itemId, rest, { status_id, format_id, creative_id, days_of_week, period_start, period_end });
      setEditingItemId(null);
      setEditingData({});
    } catch (e) {
      console.error('Error saving item:', e);
    }
  };

  const handleCreate = async () => {
    const dateError = validateDates(newItemData);
    if (dateError) {
      toast.error(dateError);
      return;
    }
    try {
      const { status_id, format_id, creative_id, days_of_week, period_start, period_end, ...rest } = newItemData;
      await onCreateItem({ ...rest, status_id, format_id, creative_id, days_of_week, period_start, period_end });
      setIsAddingNew(false);
      setNewItemData({});
    } catch (e) {
      console.error('Error creating item:', e);
    }
  };

  // Grid insertions data – mutable local state for pending changes
  const [localInsertions, setLocalInsertions] = useState<Record<string, Record<string, number>>>({});

  // Seed from server data
  const gridInsertions = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    items.forEach(item => {
      const itemIns: Record<string, number> = {};
      (item.insertions || []).forEach(ins => {
        itemIns[ins.insertion_date] = ins.quantity;
      });
      map[item.id] = { ...itemIns, ...(localInsertions[item.id] || {}) };
    });
    return map;
  }, [items, localInsertions]);

  const handleGridInsertionChange = useCallback((itemId: string, date: string, qty: number) => {
    setLocalInsertions(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [date]: qty },
    }));
    onInsertionChange?.(itemId, date, qty);
  }, [onInsertionChange]);

  const handleSaveAllInsertions = useCallback(async () => {
    if (!onSaveInsertions) return;
    // For each item with local changes, build full insertion list and save
    const itemIds = Object.keys(gridInsertions);
    for (const itemId of itemIds) {
      const all = gridInsertions[itemId];
      const list = Object.entries(all).map(([date, quantity]) => ({ date, quantity }));
      await onSaveInsertions(itemId, list);
    }
    setLocalInsertions({});
  }, [gridInsertions, onSaveInsertions]);

  const formatTotalValue = (col: ColumnDef): string => {
    if (!col.showInTotals) return '';

    if (col.totalType === 'min') {
      return totals.minDate
        ? (() => {
          try { const d = parseISO(totals.minDate); return isValid(d) ? fnsFormat(d, 'dd/MM/yyyy', { locale: ptBR }) : '—'; } catch { return '—'; }
        })()
        : '—';
    }
    if (col.totalType === 'max') {
      return totals.maxDate
        ? (() => {
          try { const d = parseISO(totals.maxDate); return isValid(d) ? fnsFormat(d, 'dd/MM/yyyy', { locale: ptBR }) : '—'; } catch { return '—'; }
        })()
        : '—';
    }
    if (col.totalType === 'calc' && col.formula === 'period_days') {
      return String(totals.totalDays);
    }

    // Sum type
    const sumKey = col.formula || col.key;
    const sumMap: Record<string, string> = {
      total_insertions: String(totals.sums.total_insertions || 0),
      total_table: formatBRL(totals.sums.total_table_price || 0),
      total_negotiated_gross: formatBRL(totals.sums.total_negotiated_gross || 0),
      media_fee: formatBRL(totals.sums.media_fee_value || 0),
      total_net: formatBRL(totals.sums.total_net || 0),
      production_total_gross: formatBRL(totals.sums.production_total_gross || 0),
      production_fee: formatBRL(totals.sums.production_fee_value || 0),
      production_total_net: formatBRL(totals.sums.production_total_net || 0),
      grand_total: formatBRL(totals.sums.grand_total || 0),
    };
    return sumMap[sumKey] || '';
  };

  if (!schema) return <div className="p-4 text-muted-foreground">Schema não encontrado para "{category}".</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="rounded-lg border overflow-x-auto">
          <Table className="min-w-max text-xs">
            <TableHeader>
              {/* Block group headers */}
              <TableRow className="bg-muted/30">
                {schema.blocks.map(block => {
                  const visibleCols = getVisibleColumns(block);
                  if (visibleCols.length === 0) return null;
                  return (
                    <BlockHeader
                      key={block.key}
                      block={block}
                      isCollapsed={collapsedBlocks.has(block.key)}
                      onToggle={() => toggleBlock(block.key)}
                      colSpan={visibleCols.length}
                    />
                  );
                })}
                <th className="w-[70px] bg-muted/70 border-b px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Ações
                </th>
              </TableRow>
              {/* Column headers */}
              <TableRow className="bg-muted/50">
                {allVisibleColumns.map(col => (
                  <TableHead
                    key={col.key}
                    className="text-[10px] font-medium whitespace-nowrap px-2 py-1.5"
                    style={{ minWidth: col.minWidth || 80 }}
                  >
                    {col.label}
                    {col.inherited && (
                      <span className="ml-1 text-[8px] text-muted-foreground">(herd.)</span>
                    )}
                  </TableHead>
                ))}
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Data rows */}
              {enrichedItems.map(item => {
                const isEditing = editingItemId === item.id;
                const displayData = isEditing ? { ...item.data, ...editingData } : item.data;
                const displayCalc = isEditing
                  ? calculateFinancials(editingData as DetailItemData)
                  : item.calculated;
                const displayItem: DetailItemRow = { ...item, data: displayData, calculated: displayCalc };

                  return (
                  <TableRow key={item.id} className="group hover:bg-muted/20">
                    {allVisibleColumns.map(col => (
                      <TableCell key={col.key} className="py-0.5 px-2">
                        <CellRenderer
                          column={col}
                          value={getDisplayValue(col, displayItem)}
                          isEditing={isEditing && isColumnEditable(col)}
                          readOnly={readOnly}
                          onChange={(val) => setEditingData(prev => ({ ...prev, [col.key]: val }))}
                          selectOptions={selectOptionsForColumn(col)}
                          onCreateNew={isEditing ? getCreateNewHandler(col) : undefined}
                          minDate={col.type === 'date' ? (planStartDate || undefined) : undefined}
                          maxDate={col.type === 'date' ? (planEndDate || undefined) : undefined}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="py-0.5 px-1">
                      {!readOnly && (
                        isEditing ? (
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => handleSave(item.id)}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditing}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => startEditing(item)}
                            >
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => onDeleteItem(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* New item row */}
              {isAddingNew && (
                <TableRow className="bg-primary/5">
                  {allVisibleColumns.map(col => (
                    <TableCell key={col.key} className="py-0.5 px-2">
                      <CellRenderer
                        column={col}
                        value={col.inherited ? (inheritedContext as any)[col.inheritField || ''] : newItemData[col.key]}
                        isEditing={isColumnEditable(col)}
                        onChange={(val) => setNewItemData(prev => ({ ...prev, [col.key]: val }))}
                        selectOptions={selectOptionsForColumn(col)}
                        onCreateNew={getCreateNewHandler(col)}
                        minDate={col.type === 'date' ? (planStartDate || undefined) : undefined}
                        maxDate={col.type === 'date' ? (planEndDate || undefined) : undefined}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="py-0.5 px-1">
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={handleCreate}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setIsAddingNew(false); setNewItemData({}); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Totals row */}
              {enrichedItems.length > 0 && (
                <TableRow className="bg-muted font-semibold">
                  {allVisibleColumns.map((col, idx) => (
                    <TableCell key={col.key} className="py-1.5 px-2 text-xs">
                      {idx === 0 ? (
                        <span className="font-bold">TOTAIS</span>
                      ) : (
                        formatTotalValue(col)
                      )}
                    </TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Grid Block */}
        {hasGrid && enrichedItems.length > 0 && (
          <GridBlock
            items={enrichedItems.map((i, idx) => ({
              id: i.id,
              label: (i.data.line_code as string) || `#${idx + 1}`,
              daysOfWeek: i.data.days_of_week as string[] | undefined,
              periodStart: i.data.period_start as string | undefined,
              periodEnd: i.data.period_end as string | undefined,
            }))}
            insertions={gridInsertions}
            planPeriodStart={planStartDate || null}
            planPeriodEnd={planEndDate || null}
            onInsertionChange={handleGridInsertionChange}
            onSaveAll={onSaveInsertions ? handleSaveAllInsertions : undefined}
            readOnly={readOnly}
          />
        )}
      </div>

      {/* Add button */}
      {!readOnly && !isAddingNew && (
        <div className="p-3 border-t">
          <Button variant="outline" size="sm" onClick={() => setIsAddingNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
        </div>
      )}

      {/* Wizard Dialogs */}
      <FormatWizardDialog
        open={showFormatWizard}
        onOpenChange={setShowFormatWizard}
        onComplete={() => onFormatCreated?.()}
      />

      {showCreativeDialog && mediaLineId && (
        <CreativeDialog
          open={showCreativeDialog}
          onOpenChange={setShowCreativeDialog}
          existingNames={creatives.map(c => c.creative_id || '')}
          onSave={() => {
            onCreativeCreated?.();
            setShowCreativeDialog(false);
          }}
        />
      )}
    </div>
  );
}
