import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { Loader2, ArrowRight, ArrowLeft, Check, Link, Table, Columns, Upload, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateReportImport, useUpdateReportImport, useSaveColumnMappings, useRunImport, METRIC_FIELDS } from '@/hooks/useReportData';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  existingImportId?: string;
  existingUrl?: string;
  existingName?: string;
  existingMappings?: { source_column: string; target_field: string; date_format?: string | null }[];
  onComplete?: () => void;
}

type Step = 'url' | 'preview' | 'mapping' | 'import';

const DATE_FORMATS = [
  { value: 'auto', label: 'Detectar automaticamente' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/AAAA (ex: 21/11/2025)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/AAAA (ex: 11/21/2025)' },
  { value: 'YYYY-MM-DD', label: 'AAAA-MM-DD (ex: 2025-11-21)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-AAAA (ex: 21-11-2025)' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.AAAA (ex: 21.11.2025)' },
  { value: 'YYYY/MM/DD', label: 'AAAA/MM/DD (ex: 2025/11/21)' },
  { value: 'excel_serial', label: 'Número serial Excel' },
];

function detectDateFormat(sampleValues: any[]): string {
  const stringValues = sampleValues
    .filter((v) => v !== undefined && v !== null && v !== '')
    .map((v) => v.toString().trim());

  if (stringValues.length === 0) return 'auto';

  // Check if all are numbers (Excel serial dates)
  if (stringValues.every((v) => /^\d+$/.test(v) && parseInt(v) > 30000 && parseInt(v) < 60000)) {
    return 'excel_serial';
  }

  // ISO: 2025-11-21
  if (stringValues.some((v) => /^\d{4}-\d{2}-\d{2}/.test(v))) return 'YYYY-MM-DD';

  // Check DD/MM/YYYY vs MM/DD/YYYY
  const slashDates = stringValues.filter((v) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v));
  if (slashDates.length > 0) {
    // If any first part > 12, it must be DD/MM/YYYY
    const firstParts = slashDates.map((v) => parseInt(v.split('/')[0]));
    const secondParts = slashDates.map((v) => parseInt(v.split('/')[1]));
    if (firstParts.some((p) => p > 12)) return 'DD/MM/YYYY';
    if (secondParts.some((p) => p > 12)) return 'MM/DD/YYYY';
    // Default to DD/MM/YYYY (Brazilian/European convention)
    return 'DD/MM/YYYY';
  }

  // DD-MM-YYYY
  if (stringValues.some((v) => /^\d{2}-\d{2}-\d{4}$/.test(v))) {
    const firstParts = stringValues
      .filter((v) => /^\d{2}-\d{2}-\d{4}$/.test(v))
      .map((v) => parseInt(v.split('-')[0]));
    if (firstParts.some((p) => p > 12)) return 'DD-MM-YYYY';
    return 'DD-MM-YYYY';
  }

  // DD.MM.YYYY
  if (stringValues.some((v) => /^\d{2}\.\d{2}\.\d{4}$/.test(v))) return 'DD.MM.YYYY';

  // YYYY/MM/DD
  if (stringValues.some((v) => /^\d{4}\/\d{2}\/\d{2}$/.test(v))) return 'YYYY/MM/DD';

  return 'auto';
}

export function ImportConfigDialog({
  open,
  onOpenChange,
  planId,
  existingImportId,
  existingUrl,
  existingName,
  existingMappings,
  onComplete,
}: ImportConfigDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('url');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [dateFormats, setDateFormats] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [importId, setImportId] = useState('');
  const pendingExistingMappings = useRef<Record<string, string> | null>(null);
  const pendingExistingDateFormats = useRef<Record<string, string> | null>(null);

  const createImport = useCreateReportImport();
  const updateImport = useUpdateReportImport();
  const saveMappings = useSaveColumnMappings();
  const runImport = useRunImport();

  const fetchPreview = useCallback(async (url: string) => {
    if (!url) return;

    setLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Não foi possível acessar a URL');

      const contentType = response.headers.get('content-type') || '';
      const isCSV = contentType.includes('text/csv') ||
        contentType.includes('text/plain') ||
        url.includes('output=csv') ||
        url.includes('output=tsv');

      const arrayBuffer = await response.arrayBuffer();

      let workbook;
      if (isCSV) {
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(arrayBuffer);
        workbook = XLSX.read(csvText, { type: 'string', raw: true });
      } else {
        workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as any[][];

      if (jsonData.length < 2) throw new Error('A planilha deve ter pelo menos cabeçalho e uma linha de dados');

      const headerRow = jsonData[0] as string[];
      const dataRows = jsonData.slice(1, 6);

      const cleanHeaders = headerRow.map((h) => h?.toString() || '');
      setHeaders(cleanHeaders);
      setPreviewRows(dataRows);

      // Auto-detect common column names
      const autoMappings: Record<string, string> = {};
      const autoDateFormats: Record<string, string> = {};

      headerRow.forEach((header, colIndex) => {
        const h = header?.toString().toLowerCase().trim();
        if (h.includes('código') || h.includes('codigo') || h === 'line_code' || h === 'id') {
          autoMappings[header] = 'line_code';
        } else if (h.includes('impressões') || h.includes('impressoes') || h === 'impressions') {
          autoMappings[header] = 'impressions';
        } else if (h.includes('cliques') || h === 'clicks' || h === 'link clicks') {
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
        } else if (h.includes('data') || h.includes('date') || h.includes('período') || h.includes('periodo') || h.includes('period')) {
          // Auto-detect date columns
          if (h.includes('início') || h.includes('inicio') || h.includes('start') || h.includes('de')) {
            autoMappings[header] = 'period_start';
          } else if (h.includes('fim') || h.includes('end') || h.includes('até') || h.includes('ate')) {
            autoMappings[header] = 'period_end';
          } else {
            // Generic date column → period_date (single date)
            autoMappings[header] = 'period_date';
          }
        }
      });

      // Auto-detect date formats for date-mapped columns
      Object.entries(autoMappings).forEach(([header, target]) => {
        if (target === 'period_start' || target === 'period_end' || target === 'period_date') {
          const colIndex = cleanHeaders.indexOf(header);
          if (colIndex !== -1) {
            const sampleValues = dataRows.map((row) => row[colIndex]);
            autoDateFormats[header] = detectDateFormat(sampleValues);
          }
        }
      });

      // Merge: existing mappings take priority over auto-detected
      if (pendingExistingMappings.current) {
        setMappings({ ...autoMappings, ...pendingExistingMappings.current });
        pendingExistingMappings.current = null;
      } else {
        setMappings(autoMappings);
      }

      if (pendingExistingDateFormats.current) {
        setDateFormats({ ...autoDateFormats, ...pendingExistingDateFormats.current });
        pendingExistingDateFormats.current = null;
      } else {
        setDateFormats(autoDateFormats);
      }

      setStep('preview');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar planilha');
    } finally {
      setLoading(false);
    }
  }, []);

  const prevOpenRef = useRef(false);

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    // Only reset when dialog transitions from closed to open
    if (open && !wasOpen) {
      setStep('url');
      setSourceUrl(existingUrl || '');
      setSourceName(existingName || '');
      setHeaders([]);
      setPreviewRows([]);
      setMappings({});
      setDateFormats({});
      setImportId(existingImportId || '');

      // If editing, store existing mappings and auto-fetch preview
      if (existingImportId && existingUrl) {
        if (existingMappings && existingMappings.length > 0) {
          const mappingObj: Record<string, string> = {};
          const dateFormatObj: Record<string, string> = {};
          existingMappings.forEach((m) => {
            mappingObj[m.source_column] = m.target_field;
            if (m.date_format) {
              dateFormatObj[m.source_column] = m.date_format;
            }
          });
          pendingExistingMappings.current = mappingObj;
          pendingExistingDateFormats.current = dateFormatObj;
        }
        const timer = setTimeout(() => {
          fetchPreview(existingUrl);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [open, existingImportId, existingUrl, existingName, existingMappings, fetchPreview]);

  const handleFetchPreview = () => fetchPreview(sourceUrl);

  const handleMappingChange = (header: string, value: string) => {
    setMappings((prev) => ({ ...prev, [header]: value }));
    // When a column is mapped to a date field, auto-detect format
    if (value === 'period_start' || value === 'period_end' || value === 'period_date') {
      const colIndex = headers.indexOf(header);
      if (colIndex !== -1 && !dateFormats[header]) {
        const sampleValues = previewRows.map((row) => row[colIndex]);
        const detected = detectDateFormat(sampleValues);
        setDateFormats((prev) => ({ ...prev, [header]: detected }));
      }
    } else {
      // Remove date format if no longer a date field
      setDateFormats((prev) => {
        const next = { ...prev };
        delete next[header];
        return next;
      });
    }
  };

  const handleCreateOrUpdateImportAndProceed = async () => {
    if (!user?.id) return;

    const currentHeaders = [...headers];
    const currentMappings = { ...mappings };
    const currentDateFormats = { ...dateFormats };
    const currentPreviewRows = [...previewRows];

    setLoading(true);
    try {
      if (existingImportId) {
        await updateImport.mutateAsync({
          import_id: existingImportId,
          media_plan_id: planId,
          source_url: sourceUrl,
          source_name: sourceName || 'Google Sheets',
        });
        setHeaders(currentHeaders);
        setMappings(currentMappings);
        setDateFormats(currentDateFormats);
        setPreviewRows(currentPreviewRows);
        setImportId(existingImportId);
      } else {
        const result = await createImport.mutateAsync({
          media_plan_id: planId,
          source_url: sourceUrl,
          source_name: sourceName || 'Google Sheets',
        });
        setHeaders(currentHeaders);
        setMappings(currentMappings);
        setDateFormats(currentDateFormats);
        setPreviewRows(currentPreviewRows);
        setImportId(result.id);
      }
      setStep('mapping');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMappingsAndImport = async () => {
    if (!user?.id || !importId) return;

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
          date_format: dateFormats[source] || undefined,
        }));

      await saveMappings.mutateAsync({
        import_id: importId,
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

  const isDateField = (header: string) => {
    const target = mappings[header];
    return target === 'period_start' || target === 'period_end' || target === 'period_date';
  };

  const getDatePreviewExample = (header: string) => {
    const colIndex = headers.indexOf(header);
    if (colIndex === -1 || previewRows.length === 0) return null;
    const val = previewRows[0][colIndex];
    return val !== undefined && val !== null ? val.toString() : null;
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
                  No Google Sheets: Arquivo → Compartilhar → Publicar na Web → CSV ou XLSX
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-url">URL da Planilha (CSV ou XLSX)</Label>
              <Input
                id="source-url"
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Suporta formatos CSV e XLSX. Para números decimais, use vírgula (ex: 278,28)
              </p>
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
              <Button onClick={handleCreateOrUpdateImportAndProceed} disabled={loading}>
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

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {headers.map((header) => (
                <div key={header} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm truncate w-32 shrink-0" title={header}>
                      {header}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Select
                      value={mappings[header] || 'ignore'}
                      onValueChange={(value) => handleMappingChange(header, value)}
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

                  {isDateField(header) && (
                    <div className="ml-[calc(8rem+1.5rem)] flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Select
                        value={dateFormats[header] || 'auto'}
                        onValueChange={(value) =>
                          setDateFormats((prev) => ({ ...prev, [header]: value }))
                        }
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="Formato da data" />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_FORMATS.map((fmt) => (
                            <SelectItem key={fmt.value} value={fmt.value} className="text-xs">
                              {fmt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {getDatePreviewExample(header) && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          ex: {getDatePreviewExample(header)}
                        </span>
                      )}
                    </div>
                  )}
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
          <DialogTitle>{existingImportId ? 'Editar Fonte de Dados' : 'Configurar Importação de Dados'}</DialogTitle>
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
