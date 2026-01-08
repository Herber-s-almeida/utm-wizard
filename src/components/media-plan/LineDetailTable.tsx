import { useState, useMemo } from 'react';
import { Plus, Trash2, Save, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { LineDetail, LineDetailItem } from '@/hooks/useLineDetails';
import { FieldSchemaItem } from '@/hooks/useLineDetailTypes';
import { InsertionGrid } from './InsertionGrid';
import { cn } from '@/lib/utils';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LineDetailTableProps {
  detail: LineDetail;
  onCreateItem: (data: Record<string, unknown>) => Promise<unknown>;
  onUpdateItem: (data: { id: string; data?: Record<string, unknown>; total_gross?: number; total_net?: number }) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onUpdateInsertions: (data: { item_id: string; insertions: { date: string; quantity: number }[] }) => Promise<void>;
  planStartDate?: string | null;
  planEndDate?: string | null;
}

export function LineDetailTable({
  detail,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onUpdateInsertions,
  planStartDate,
  planEndDate,
}: LineDetailTableProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, unknown>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemData, setNewItemData] = useState<Record<string, unknown>>({});
  const [insertionGridItemId, setInsertionGridItemId] = useState<string | null>(null);

  const fieldSchema = detail.detail_type?.field_schema || [];
  const hasInsertionGrid = detail.detail_type?.has_insertion_grid ?? false;

  const formatCurrency = (value: number | string | null | undefined) => {
    const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const formatPercentage = (value: number | string | null | undefined) => {
    const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
    return `${num.toFixed(1)}%`;
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '-';
    try {
      return format(parseISO(value), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return value;
    }
  };

  const renderCellValue = (field: FieldSchemaItem, value: unknown) => {
    if (value === null || value === undefined || value === '') return '-';
    
    switch (field.type) {
      case 'currency':
        return formatCurrency(value as number);
      case 'percentage':
        return formatPercentage(value as number);
      case 'date':
        return formatDate(value as string);
      default:
        return String(value);
    }
  };

  const renderInput = (
    field: FieldSchemaItem, 
    value: unknown, 
    onChange: (value: unknown) => void
  ) => {
    switch (field.type) {
      case 'select':
        return (
          <Select 
            value={String(value || '')} 
            onValueChange={onChange}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'currency':
      case 'number':
      case 'percentage':
        return (
          <Input
            type="number"
            step={field.type === 'percentage' ? '0.1' : field.type === 'currency' ? '0.01' : '1'}
            className="h-8"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            className="h-8"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'time':
        return (
          <Input
            type="time"
            className="h-8"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      default:
        return (
          <Input
            type="text"
            className="h-8"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  const handleSaveItem = async (itemId: string) => {
    try {
      await onUpdateItem({ id: itemId, data: editingData });
      setEditingItemId(null);
      setEditingData({});
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleCreateItem = async () => {
    try {
      await onCreateItem(newItemData);
      setIsAddingNew(false);
      setNewItemData({});
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const startEditing = (item: LineDetailItem) => {
    setEditingItemId(item.id);
    setEditingData(item.data as Record<string, unknown>);
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingData({});
  };

  // Calculate totals
  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    
    fieldSchema.forEach((field) => {
      if (field.type === 'currency' || field.type === 'number') {
        result[field.key] = (detail.items || []).reduce((sum, item) => {
          const value = (item.data as Record<string, unknown>)?.[field.key];
          return sum + (typeof value === 'number' ? value : parseFloat(String(value)) || 0);
        }, 0);
      }
    });

    // Total insertions
    result['_insertions'] = (detail.items || []).reduce((sum, item) => sum + (item.total_insertions || 0), 0);
    
    return result;
  }, [detail.items, fieldSchema]);

  const insertionGridItem = (detail.items || []).find(i => i.id === insertionGridItemId);

  return (
    <div className="p-4">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {hasInsertionGrid && (
                <TableHead className="w-[50px] text-center">Ins.</TableHead>
              )}
              {fieldSchema.map((field) => (
                <TableHead 
                  key={field.key}
                  style={{ width: field.width ? `${field.width}px` : 'auto' }}
                  className="text-xs"
                >
                  {field.label}
                </TableHead>
              ))}
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(detail.items || []).map((item) => {
              const isEditing = editingItemId === item.id;
              const itemData = (isEditing ? editingData : item.data) as Record<string, unknown>;
              
              return (
                <TableRow key={item.id} className="group">
                  {hasInsertionGrid && (
                    <TableCell className="text-center">
                      <Popover 
                        open={insertionGridItemId === item.id} 
                        onOpenChange={(open) => setInsertionGridItemId(open ? item.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <Calendar className="h-3 w-3 mr-1" />
                            {item.total_insertions || 0}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <InsertionGrid
                            itemId={item.id}
                            insertions={item.insertions || []}
                            startDate={planStartDate}
                            endDate={planEndDate}
                            onSave={(insertions) => {
                              onUpdateInsertions({ item_id: item.id, insertions });
                              setInsertionGridItemId(null);
                            }}
                            onCancel={() => setInsertionGridItemId(null)}
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                  )}
                  {fieldSchema.map((field) => (
                    <TableCell key={field.key} className="py-1 text-xs">
                      {isEditing ? (
                        renderInput(
                          field,
                          itemData[field.key],
                          (value) => setEditingData(prev => ({ ...prev, [field.key]: value }))
                        )
                      ) : (
                        <span 
                          className="cursor-pointer hover:bg-muted px-1 py-0.5 rounded"
                          onDoubleClick={() => startEditing(item)}
                        >
                          {renderCellValue(field, itemData[field.key])}
                        </span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="py-1">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-primary"
                          onClick={() => handleSaveItem(item.id)}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={cancelEditing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* New item row */}
            {isAddingNew && (
              <TableRow className="bg-muted/30">
                {hasInsertionGrid && (
                  <TableCell className="text-center text-muted-foreground">-</TableCell>
                )}
                {fieldSchema.map((field) => (
                  <TableCell key={field.key} className="py-1">
                    {renderInput(
                      field,
                      newItemData[field.key],
                      (value) => setNewItemData(prev => ({ ...prev, [field.key]: value }))
                    )}
                  </TableCell>
                ))}
                <TableCell className="py-1">
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-primary"
                      onClick={handleCreateItem}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewItemData({});
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Totals row */}
            {(detail.items || []).length > 0 && (
              <TableRow className="bg-muted font-medium">
                {hasInsertionGrid && (
                  <TableCell className="text-center">
                    <Badge variant="secondary">{totals['_insertions']}</Badge>
                  </TableCell>
                )}
                {fieldSchema.map((field, idx) => (
                  <TableCell key={field.key} className="py-2 text-xs">
                    {idx === 0 ? (
                      <span className="font-semibold">TOTAIS</span>
                    ) : (field.type === 'currency' || field.type === 'number') ? (
                      field.type === 'currency' 
                        ? formatCurrency(totals[field.key] || 0)
                        : (totals[field.key] || 0).toLocaleString('pt-BR')
                    ) : null}
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add button */}
      {!isAddingNew && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setIsAddingNew(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </Button>
      )}
    </div>
  );
}
