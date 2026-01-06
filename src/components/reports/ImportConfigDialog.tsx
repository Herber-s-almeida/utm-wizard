import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowRight, ArrowLeft, Check, Link, Table, Columns, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateReportImport, useSaveColumnMappings, useRunImport, METRIC_FIELDS } from '@/hooks/useReportData';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  existingImportId?: string;
  existingUrl?: string;
  existingMappings?: { source_column: string; target_field: string }[];
  onComplete?: () => void;
}

type Step = 'url' | 'preview' | 'mapping' | 'import';

export function ImportConfigDialog({
  open,
  onOpenChange,
  planId,
  existingImportId,
  existingUrl,
  existingMappings,
  onComplete,
}: ImportConfigDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('url');
  const [sourceUrl, setSourceUrl] = useState(existingUrl || '');
  const [sourceName, setSourceName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [importId, setImportId] = useState(existingImportId || '');

  const createImport = useCreateReportImport();
  const saveMappings = useSaveColumnMappings();
  const runImport = useRunImport();

  useEffect(() => {
    if (open) {
      setStep(existingImportId ? 'mapping' : 'url');
      setSourceUrl(existingUrl || '');
      if (existingMappings) {
        const mappingObj: Record<string, string> = {};
        existingMappings.forEach((m) => {
          mappingObj[m.source_column] = m.target_field;
        });
        setMappings(mappingObj);
      }
      if (existingImportId) {
        setImportId(existingImportId);
      }
    }
  }, [open, existingImportId, existingUrl, existingMappings]);

  const handleFetchPreview = async () => {
    if (!sourceUrl) {
      toast.error('Insira a URL do Google Sheets');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error('Não foi possível acessar a URL');
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        throw new Error('A planilha deve ter pelo menos cabeçalho e uma linha de dados');
      }

      const headerRow = jsonData[0] as string[];
      const dataRows = jsonData.slice(1, 6); // Preview first 5 rows

      setHeaders(headerRow.map((h) => h?.toString() || ''));
      setPreviewRows(dataRows);

      // Auto-detect common column names
      const autoMappings: Record<string, string> = {};
      headerRow.forEach((header) => {
        const h = header?.toString().toLowerCase().trim();
        if (h.includes('código') || h.includes('codigo') || h === 'line_code' || h === 'id') {
          autoMappings[header] = 'line_code';
        } else if (h.includes('impressões') || h.includes('impressoes') || h === 'impressions') {
          autoMappings[header] = 'impressions';
        } else if (h.includes('cliques') || h === 'clicks') {
          autoMappings[header] = 'clicks';
        } else if (h.includes('custo') || h.includes('investimento') || h === 'cost') {
          autoMappings[header] = 'cost';
        } else if (h === 'ctr') {
          autoMappings[header] = 'ctr';
        } else if (h === 'cpc') {
          autoMappings[header] = 'cpc';
        } else if (h === 'cpm') {
          autoMappings[header] = 'cpm';
        } else if (h.includes('leads')) {
          autoMappings[header] = 'leads';
        } else if (h.includes('vendas') || h === 'sales') {
          autoMappings[header] = 'sales';
        } else if (h.includes('conversões') || h.includes('conversoes') || h === 'conversions') {
          autoMappings[header] = 'conversions';
        } else if (h === 'cpa') {
          autoMappings[header] = 'cpa';
        } else if (h === 'roas') {
          autoMappings[header] = 'roas';
        } else if (h.includes('sessões') || h.includes('sessoes') || h === 'sessions') {
          autoMappings[header] = 'sessions';
        } else if (h.includes('rejeição') || h.includes('bounce')) {
          autoMappings[header] = 'bounce_rate';
        } else if (h.includes('pageviews') || h.includes('visualizações')) {
          autoMappings[header] = 'pageviews';
        }
      });

      setMappings(autoMappings);
      setStep('preview');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar planilha');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateImportAndProceed = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const result = await createImport.mutateAsync({
        media_plan_id: planId,
        source_url: sourceUrl,
        source_name: sourceName || 'Google Sheets',
        user_id: user.id,
      });

      setImportId(result.id);
      setStep('mapping');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar configuração');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMappingsAndImport = async () => {
    if (!user?.id || !importId) return;

    // Validate line_code mapping exists
    const hasLineCode = Object.values(mappings).includes('line_code');
    if (!hasLineCode) {
      toast.error('É necessário mapear a coluna de Código da Linha');
      return;
    }

    setLoading(true);
    try {
      const mappingArray = Object.entries(mappings)
        .filter(([_, target]) => target && target !== 'ignore')
        .map(([source, target]) => ({
          source_column: source,
          target_field: target,
        }));

      await saveMappings.mutateAsync({
        import_id: importId,
        user_id: user.id,
        mappings: mappingArray,
      });

      setStep('import');

      await runImport.mutateAsync({
        import_id: importId,
        media_plan_id: planId,
        source_url: sourceUrl,
        mappings: mappingArray,
      });

      onComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro na importação');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'url':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Link className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Publique sua planilha</p>
                <p className="text-xs text-muted-foreground">
                  No Google Sheets: Arquivo → Compartilhar → Publicar na Web → XLSX
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-url">URL da Planilha (XLSX)</Label>
              <Input
                id="source-url"
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=xlsx"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-name">Nome da Fonte (opcional)</Label>
              <Input
                id="source-name"
                placeholder="Ex: Dados de Mídia - Janeiro"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleFetchPreview} disabled={loading || !sourceUrl}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Carregar Preview
              </Button>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Table className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Preview dos Dados</p>
                <p className="text-xs text-muted-foreground">
                  {headers.length} colunas encontradas
                </p>
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto max-h-48">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="px-2 py-1 text-left font-medium truncate max-w-32">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t">
                      {headers.map((_, j) => (
                        <td key={j} className="px-2 py-1 truncate max-w-32">
                          {row[j]?.toString() || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('url')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={handleCreateImportAndProceed} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Configurar Mapeamento
              </Button>
            </div>
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Columns className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Mapeamento de Colunas</p>
                <p className="text-xs text-muted-foreground">
                  Associe cada coluna da planilha a uma métrica do sistema
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-2">
                  <span className="text-sm truncate w-32 shrink-0" title={header}>
                    {header}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Select
                    value={mappings[header] || 'ignore'}
                    onValueChange={(value) => {
                      setMappings((prev) => ({ ...prev, [header]: value }));
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Ignorar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ignore">Ignorar</SelectItem>
                      {METRIC_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                          {field.required && ' *'}
                          {field.group && ` (${field.group})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('preview')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={handleSaveMappingsAndImport} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Importar Dados
              </Button>
            </div>
          </div>
        );

      case 'import':
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importando dados...</p>
          </div>
        );
    }
  };

  const stepLabels: Record<Step, string> = {
    url: '1. Fonte de Dados',
    preview: '2. Preview',
    mapping: '3. Mapeamento',
    import: '4. Importação',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Importação de Dados</DialogTitle>
          <DialogDescription>{stepLabels[step]}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 mb-4">
          {(['url', 'preview', 'mapping', 'import'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                i <= ['url', 'preview', 'mapping', 'import'].indexOf(step)
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}