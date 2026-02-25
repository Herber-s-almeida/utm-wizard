import { Check, AlertCircle, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SYSTEM_FIELDS, ColumnMapping } from '@/utils/importPlanParser';
import { cn } from '@/lib/utils';

interface ImportColumnMapperProps {
  mappings: ColumnMapping[];
  monthColumns: string[];
  onUpdateMapping: (fileColumn: string, systemField: string) => void;
}

export function ImportColumnMapper({ 
  mappings, 
  monthColumns, 
  onUpdateMapping 
}: ImportColumnMapperProps) {
  const usedFields = new Set(mappings.map(m => m.systemField).filter(Boolean));
  
  const availableFields = Object.entries(SYSTEM_FIELDS).filter(
    ([key]) => !usedFields.has(key)
  );
  
  const requiredMapped = ['linha_codigo', 'veiculo', 'canal', 'orcamento_total']
    .every(field => usedFields.has(field));

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Mapeamento de Colunas</h2>
        <p className="text-muted-foreground text-sm">
          Confirme ou ajuste o mapeamento das colunas do arquivo
        </p>
      </div>

      {/* Status Summary */}
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg text-sm",
        requiredMapped ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
      )}>
        {requiredMapped ? (
          <>
            <Check className="w-4 h-4" />
            <span>Todas as colunas obrigatórias estão mapeadas</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>Mapeie todas as colunas obrigatórias para continuar</span>
          </>
        )}
      </div>

      {/* Month Columns Detected */}
      {monthColumns.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {monthColumns.length} coluna(s) de mês detectada(s)
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {monthColumns.map(col => (
              <Badge key={col} variant="secondary" className="text-xs">
                {col}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Estas colunas serão usadas para distribuição mensal do orçamento
          </p>
        </div>
      )}

      {/* Column Mappings Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 p-3 bg-muted/50 text-sm font-medium border-b">
          <div>Coluna no arquivo</div>
          <div className="w-8" />
          <div>Campo do sistema</div>
        </div>
        
        <div className="divide-y">
          {mappings.map((mapping) => {
            const isRequired = ['linha_codigo', 'veiculo', 'canal', 'orcamento_total']
              .includes(mapping.systemField);
            const isMapped = !!mapping.systemField;
            
            return (
              <div 
                key={mapping.fileColumn}
                className="grid grid-cols-[1fr,auto,1fr] gap-4 p-3 items-center"
              >
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-muted px-2 py-0.5 rounded">
                    {mapping.fileColumn}
                  </code>
                  {mapping.detected && isMapped && (
                    <Badge variant="outline" className="text-xs text-success border-success/30">
                      Auto
                    </Badge>
                  )}
                </div>
                
                <div className="text-muted-foreground">→</div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={mapping.systemField || 'none'}
                    onValueChange={(value) => onUpdateMapping(
                      mapping.fileColumn, 
                      value === 'none' ? '' : value
                    )}
                  >
                    <SelectTrigger className={cn(
                      "w-full",
                      !isMapped && "text-muted-foreground"
                    )}>
                      <SelectValue placeholder="Não mapeado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">Não mapeado</span>
                      </SelectItem>
                      {mapping.systemField && (
                        <SelectItem value={mapping.systemField}>
                          {SYSTEM_FIELDS[mapping.systemField as keyof typeof SYSTEM_FIELDS]?.label || mapping.systemField}
                          {['linha_codigo', 'veiculo', 'canal', 'orcamento_total'].includes(mapping.systemField) && ' *'}
                        </SelectItem>
                      )}
                      {availableFields.map(([key, field]) => (
                        <SelectItem key={key} value={key}>
                          {field.label}
                          {field.required && ' *'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {isMapped && (
                    <Check className={cn(
                      "w-4 h-4 shrink-0",
                      isRequired ? "text-success" : "text-primary"
                    )} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unmapped columns info */}
      {mappings.some(m => !m.systemField) && (
        <p className="text-xs text-muted-foreground text-center">
          Colunas não mapeadas serão ignoradas durante a importação
        </p>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span>* Campos obrigatórios</span>
        <span>•</span>
        <Badge variant="outline" className="text-xs text-success border-success/30">
          Auto
        </Badge>
        <span>= Detectado automaticamente</span>
      </div>
    </div>
  );
}
