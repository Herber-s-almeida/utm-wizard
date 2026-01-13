import { useState, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Link,
  Upload,
  FileSpreadsheet,
  Calendar,
  Columns,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MediaLine } from '@/types/media';

interface ImportWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  mediaLines: MediaLine[];
  onComplete?: () => void;
}

type Step = 'source' | 'preview' | 'period' | 'mapping' | 'matching' | 'confirm';
type SourceType = 'google_sheets' | 'csv_upload';

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

interface MatchingResult {
  rowIndex: number;
  lineCode: string;
  matchedLineId: string | null;
  matchedLineName: string | null;
  matchType: 'exact' | 'utm' | 'similarity' | 'manual' | 'none';
  confidence: number;
}

const METRIC_FIELDS = [
  { value: 'line_code', label: 'Código da Linha', required: true, group: 'Identificador' },
  { value: 'campaign_name', label: 'Nome da Campanha', group: 'Identificador' },
  { value: 'period_date', label: 'Data do Período', group: 'Período' },
  { value: 'impressions', label: 'Impressões', group: 'Mídia' },
  { value: 'clicks', label: 'Cliques', group: 'Mídia' },
  { value: 'cost', label: 'Custo / Investimento', group: 'Mídia' },
  { value: 'reach', label: 'Alcance', group: 'Mídia' },
  { value: 'frequency', label: 'Frequência', group: 'Mídia' },
  { value: 'video_views', label: 'Visualizações de Vídeo', group: 'Mídia' },
  { value: 'video_completions', label: 'Vídeos Completos', group: 'Mídia' },
  { value: 'leads', label: 'Leads', group: 'Conversão' },
  { value: 'conversions', label: 'Conversões', group: 'Conversão' },
  { value: 'sales', label: 'Vendas', group: 'Conversão' },
  { value: 'revenue', label: 'Receita', group: 'Conversão' },
  { value: 'sessions', label: 'Sessões', group: 'Analytics' },
  { value: 'pageviews', label: 'Pageviews', group: 'Analytics' },
  { value: 'bounce_rate', label: 'Taxa de Rejeição', group: 'Analytics' },
  { value: 'avg_session_duration', label: 'Duração Média', group: 'Analytics' },
];

export function ImportWizardDialog({
  open,
  onOpenChange,
  planId,
  mediaLines,
  onComplete,
}: ImportWizardDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('source');
  const [sourceType, setSourceType] = useState<SourceType>('csv_upload');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[][]>([]);
  const [allRows, setAllRows] = useState<any[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [periodDate, setPeriodDate] = useState('');
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [matchingResults, setMatchingResults] = useState<MatchingResult[]>([]);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setStep('source');
    setSourceUrl('');
    setSourceName('');
    setUploadedFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setAllRows([]);
    setMappings({});
    setPeriodDate('');
    setMatchingResults([]);
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setSourceName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          toast.error('A planilha deve ter pelo menos cabeçalho e uma linha de dados');
          return;
        }

        const headerRow = jsonData[0] as string[];
        setHeaders(headerRow.map((h) => h?.toString() || ''));
        setPreviewRows(jsonData.slice(1, 6));
        setAllRows(jsonData.slice(1));

        // Auto-detect mappings
        const autoMappings = autoDetectMappings(headerRow);
        setMappings(autoMappings);

        // Try to detect period from data
        detectPeriodFromData(jsonData.slice(1), autoMappings, headerRow);

        setStep('preview');
      } catch (error: any) {
        toast.error(error.message || 'Erro ao ler arquivo');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFetchUrl = async () => {
    if (!sourceUrl) {
      toast.error('Insira a URL da planilha');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error('Não foi possível acessar a URL');

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        throw new Error('A planilha deve ter pelo menos cabeçalho e uma linha de dados');
      }

      const headerRow = jsonData[0] as string[];
      setHeaders(headerRow.map((h) => h?.toString() || ''));
      setPreviewRows(jsonData.slice(1, 6));
      setAllRows(jsonData.slice(1));

      const autoMappings = autoDetectMappings(headerRow);
      setMappings(autoMappings);
      detectPeriodFromData(jsonData.slice(1), autoMappings, headerRow);

      setStep('preview');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar planilha');
    } finally {
      setLoading(false);
    }
  };

  const autoDetectMappings = (headerRow: string[]): Record<string, string> => {
    const autoMappings: Record<string, string> = {};

    headerRow.forEach((header) => {
      const h = header?.toString().toLowerCase().trim();
      if (!h) return;

      if (h.includes('código') || h.includes('codigo') || h === 'line_code' || h === 'id') {
        autoMappings[header] = 'line_code';
      } else if (h.includes('campanha') || h === 'campaign' || h === 'campaign_name') {
        autoMappings[header] = 'campaign_name';
      } else if (h.includes('data') || h === 'date' || h === 'period') {
        autoMappings[header] = 'period_date';
      } else if (h.includes('impressões') || h.includes('impressoes') || h === 'impressions') {
        autoMappings[header] = 'impressions';
      } else if (h.includes('cliques') || h === 'clicks') {
        autoMappings[header] = 'clicks';
      } else if (h.includes('custo') || h.includes('investimento') || h === 'cost' || h === 'spend') {
        autoMappings[header] = 'cost';
      } else if (h.includes('alcance') || h === 'reach') {
        autoMappings[header] = 'reach';
      } else if (h.includes('leads')) {
        autoMappings[header] = 'leads';
      } else if (h.includes('vendas') || h === 'sales') {
        autoMappings[header] = 'sales';
      } else if (h.includes('conversões') || h.includes('conversoes') || h === 'conversions') {
        autoMappings[header] = 'conversions';
      } else if (h.includes('receita') || h === 'revenue') {
        autoMappings[header] = 'revenue';
      } else if (h.includes('sessões') || h.includes('sessoes') || h === 'sessions') {
        autoMappings[header] = 'sessions';
      } else if (h.includes('pageviews') || h.includes('visualizações')) {
        autoMappings[header] = 'pageviews';
      }
    });

    return autoMappings;
  };

  const detectPeriodFromData = (
    rows: any[][],
    mappings: Record<string, string>,
    headers: string[]
  ) => {
    const dateColumnHeader = Object.entries(mappings).find(([_, v]) => v === 'period_date')?.[0];
    if (!dateColumnHeader) return;

    const dateColumnIndex = headers.indexOf(dateColumnHeader);
    if (dateColumnIndex === -1) return;

    // Try to parse first date
    const firstDateValue = rows[0]?.[dateColumnIndex];
    if (firstDateValue) {
      // Try different date formats
      const dateFormats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'];
      for (const fmt of dateFormats) {
        try {
          const parsed = parse(firstDateValue.toString(), fmt, new Date());
          if (isValid(parsed)) {
            setPeriodDate(format(parsed, 'yyyy-MM-dd'));
            break;
          }
        } catch {
          // Continue to next format
        }
      }
    }
  };

  const performMatching = () => {
    const lineCodeColumnHeader = Object.entries(mappings).find(
      ([_, v]) => v === 'line_code'
    )?.[0];
    const campaignColumnHeader = Object.entries(mappings).find(
      ([_, v]) => v === 'campaign_name'
    )?.[0];

    const lineCodeIndex = lineCodeColumnHeader ? headers.indexOf(lineCodeColumnHeader) : -1;
    const campaignIndex = campaignColumnHeader ? headers.indexOf(campaignColumnHeader) : -1;

    const results: MatchingResult[] = allRows.map((row, idx) => {
      const lineCode = lineCodeIndex >= 0 ? row[lineCodeIndex]?.toString() : '';
      const campaignName = campaignIndex >= 0 ? row[campaignIndex]?.toString() : '';

      // Try exact line_code match
      let matchedLine = mediaLines.find((l) => l.line_code === lineCode);
      if (matchedLine) {
        return {
          rowIndex: idx,
          lineCode,
          matchedLineId: matchedLine.id,
          matchedLineName: matchedLine.platform,
          matchType: 'exact' as const,
          confidence: 100,
        };
      }

      // Try UTM campaign match
      if (campaignName) {
        matchedLine = mediaLines.find((l) => l.utm_campaign === campaignName);
        if (matchedLine) {
          return {
            rowIndex: idx,
            lineCode,
            matchedLineId: matchedLine.id,
            matchedLineName: matchedLine.platform,
            matchType: 'utm' as const,
            confidence: 90,
          };
        }
      }

      // Try similarity match (basic)
      if (campaignName) {
        for (const line of mediaLines) {
          const platform = line.platform.toLowerCase();
          const campaign = campaignName.toLowerCase();
          if (platform.includes(campaign) || campaign.includes(platform)) {
            return {
              rowIndex: idx,
              lineCode,
              matchedLineId: line.id,
              matchedLineName: line.platform,
              matchType: 'similarity' as const,
              confidence: 70,
            };
          }
        }
      }

      return {
        rowIndex: idx,
        lineCode,
        matchedLineId: null,
        matchedLineName: null,
        matchType: 'none' as const,
        confidence: 0,
      };
    });

    setMatchingResults(results);
    setStep('matching');
  };

  const handleImport = async () => {
    // TODO: Implement actual import using useImportMetrics
    toast.success('Importação iniciada');
    onComplete?.();
    onOpenChange(false);
    resetState();
  };

  const matchedCount = matchingResults.filter((r) => r.matchedLineId).length;
  const unmatchedCount = matchingResults.filter((r) => !r.matchedLineId).length;

  const stepLabels: Record<Step, string> = {
    source: '1. Fonte',
    preview: '2. Preview',
    period: '3. Período',
    mapping: '4. Mapeamento',
    matching: '5. Matching',
    confirm: '6. Confirmar',
  };

  const steps: Step[] = ['source', 'preview', 'period', 'mapping', 'matching', 'confirm'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Dados de Performance</DialogTitle>
          <DialogDescription>{stepLabels[step]}</DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1 mb-4">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step: Source */}
        {step === 'source' && (
          <div className="space-y-4">
            <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="csv_upload" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload de Arquivo
                </TabsTrigger>
                <TabsTrigger value="google_sheets" className="gap-2">
                  <Link className="w-4 h-4" />
                  Google Sheets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="csv_upload" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Arraste um arquivo CSV ou XLSX, ou clique para selecionar
                      </p>
                      <Input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="max-w-xs mx-auto"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="google_sheets" className="mt-4 space-y-4">
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
                  <Label>URL da Planilha (XLSX)</Label>
                  <Input
                    placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=xlsx"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </div>

                <Button onClick={handleFetchUrl} disabled={loading || !sourceUrl}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Carregar Planilha
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Preview dos Dados</p>
                <p className="text-xs text-muted-foreground">
                  {headers.length} colunas • {allRows.length} linhas
                </p>
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto max-h-48">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
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
              <Button variant="outline" onClick={() => setStep('source')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={() => setStep('period')}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Configurar Período
              </Button>
            </div>
          </div>
        )}

        {/* Step: Period */}
        {step === 'period' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Período dos Dados</p>
                <p className="text-xs text-muted-foreground">
                  Defina o período de referência para estes dados
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Data do Período</Label>
                <Input
                  type="date"
                  value={periodDate}
                  onChange={(e) => setPeriodDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Granularidade</Label>
                <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('preview')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={() => setStep('mapping')}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Mapear Colunas
              </Button>
            </div>
          </div>
        )}

        {/* Step: Mapping */}
        {step === 'mapping' && (
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
                  <span className="text-sm truncate w-40 shrink-0" title={header}>
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
              <Button variant="outline" onClick={() => setStep('period')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={performMatching}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Verificar Matching
              </Button>
            </div>
          </div>
        )}

        {/* Step: Matching */}
        {step === 'matching' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Resultado do Matching</p>
                  <p className="text-xs text-muted-foreground">
                    Verifique as correspondências encontradas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-success">
                  <Check className="w-3 h-3 mr-1" />
                  {matchedCount} casadas
                </Badge>
                {unmatchedCount > 0 && (
                  <Badge variant="secondary">
                    <X className="w-3 h-3 mr-1" />
                    {unmatchedCount} não casadas
                  </Badge>
                )}
              </div>
            </div>

            <div className="border rounded-lg overflow-y-auto max-h-48">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Código/Campanha</th>
                    <th className="px-3 py-2 text-left">Linha de Mídia</th>
                    <th className="px-3 py-2 text-left">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {matchingResults.slice(0, 20).map((result) => (
                    <tr key={result.rowIndex} className="border-t">
                      <td className="px-3 py-2 truncate max-w-32">{result.lineCode || '-'}</td>
                      <td className="px-3 py-2">{result.matchedLineName || '-'}</td>
                      <td className="px-3 py-2">
                        {result.matchedLineId ? (
                          <Badge variant="outline" className="text-success border-success">
                            {result.matchType}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Não encontrada
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {matchingResults.length > 20 && (
              <p className="text-xs text-muted-foreground text-center">
                Mostrando 20 de {matchingResults.length} linhas
              </p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={handleImport}>
                <Check className="w-4 h-4 mr-2" />
                Importar Dados
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
