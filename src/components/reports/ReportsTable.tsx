import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ReportData, useUpdateReportDataMatch } from '@/hooks/useReportData';
import { MediaLine } from '@/types/media';
import { Search, AlertTriangle, Check, Link2, Download, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsTableProps {
  reportData: ReportData[];
  mediaLines: MediaLine[];
  planId: string;
  planName: string;
}

type SortField = 'line_code' | 'period_start' | 'cost' | 'impressions' | 'clicks' | 'conversions' | 'variance';
type SortDirection = 'asc' | 'desc';

export function ReportsTable({ reportData, mediaLines, planId, planName }: ReportsTableProps) {
  const [search, setSearch] = useState('');
  const [matchFilter, setMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [sortField, setSortField] = useState<SortField>('line_code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState<ReportData | null>(null);

  const updateMatch = useUpdateReportDataMatch();

  const lineMap = useMemo(() => new Map(mediaLines.map((l) => [l.id, l])), [mediaLines]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR').format(value);

  const formatPercent = (value: number) =>
    `${(value * 100).toFixed(2)}%`;

  // Calculate variance for each row
  const dataWithVariance = useMemo(() => {
    return reportData.map((r) => {
      const line = r.media_line_id ? lineMap.get(r.media_line_id) : null;
      const planned = Number(line?.budget || 0);
      const actual = Number(r.cost || 0);
      const variance = planned > 0 ? ((actual - planned) / planned) * 100 : 0;
      return { ...r, planned, variance, lineName: line?.platform || '-' };
    });
  }, [reportData, lineMap]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = dataWithVariance;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.line_code.toLowerCase().includes(searchLower) ||
          r.lineName.toLowerCase().includes(searchLower)
      );
    }

    // Match status filter
    if (matchFilter !== 'all') {
      filtered = filtered.filter((r) =>
        matchFilter === 'matched'
          ? r.match_status === 'matched' || r.match_status === 'manual'
          : r.match_status === 'unmatched'
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'line_code':
          aVal = a.line_code;
          bVal = b.line_code;
          break;
        case 'period_start':
          aVal = a.period_start || '';
          bVal = b.period_start || '';
          break;
        case 'cost':
          aVal = Number(a.cost || 0);
          bVal = Number(b.cost || 0);
          break;
        case 'impressions':
          aVal = Number(a.impressions || 0);
          bVal = Number(b.impressions || 0);
          break;
        case 'clicks':
          aVal = Number(a.clicks || 0);
          bVal = Number(b.clicks || 0);
          break;
        case 'conversions':
          aVal = Number(a.conversions || 0);
          bVal = Number(b.conversions || 0);
          break;
        case 'variance':
          aVal = a.variance;
          bVal = b.variance;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [dataWithVariance, search, matchFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleManualMatch = (reportDataRow: ReportData) => {
    setSelectedReportData(reportDataRow);
    setMatchDialogOpen(true);
  };

  const handleConfirmMatch = async (mediaLineId: string) => {
    if (!selectedReportData) return;

    await updateMatch.mutateAsync({
      report_data_id: selectedReportData.id,
      media_line_id: mediaLineId,
      media_plan_id: planId,
    });

    setMatchDialogOpen(false);
    setSelectedReportData(null);
  };

  const handleExport = () => {
    const exportData = filteredData.map((r) => ({
      'Código': r.line_code,
      'Status Match': r.match_status === 'matched' ? 'Casada' : r.match_status === 'manual' ? 'Manual' : 'Não Casada',
      'Data': r.period_start ? new Date(r.period_start + 'T00:00:00').toLocaleDateString('pt-BR') : '',
      'Orç. Planejado': r.planned,
      'Investimento': r.cost,
      'Variação (%)': r.variance.toFixed(1),
      'Impressões': r.impressions,
      'Cliques': r.clicks,
      'CTR': r.ctr,
      'CPC': r.cpc,
      'CPM': r.cpm,
      'Leads': r.leads,
      'Conversões': r.conversions,
      'CPA': r.cpa,
      'Sessões': r.sessions,
      'Taxa Rejeição': r.bounce_rate,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `relatorio_${planName.replace(/\s+/g, '_')}.xlsx`);
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="w-3 h-3 ml-1" />
    </Button>
  );

  const unmatchedLines = mediaLines.filter(
    (l) => l.line_code && !reportData.some((r) => r.media_line_id === l.id)
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base font-medium">Tabela Comparativa</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              <Select value={matchFilter} onValueChange={(v) => setMatchFilter(v as any)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="matched">Casadas</SelectItem>
                  <SelectItem value="unmatched">Não Casadas</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">
                    <SortButton field="line_code">Código</SortButton>
                  </TableHead>
                   <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">
                    <SortButton field="period_start">Data</SortButton>
                  </TableHead>
                  <TableHead className="text-right">Planejado</TableHead>
                  <TableHead className="text-right">
                    <SortButton field="cost">Investido</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="variance">Var (%)</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="impressions">Impressões</SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="clicks">Cliques</SortButton>
                  </TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">CPC</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">
                    <SortButton field="conversions">Conv.</SortButton>
                  </TableHead>
                  <TableHead className="text-right">CPA</TableHead>
                  <TableHead className="text-right">Sessões</TableHead>
                  <TableHead className="w-20">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                      Nenhum dado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.line_code}</TableCell>
                      <TableCell>
                        {row.match_status === 'matched' ? (
                          <Badge variant="default" className="bg-success text-success-foreground">
                            <Check className="w-3 h-3 mr-1" />
                            Casada
                          </Badge>
                        ) : row.match_status === 'manual' ? (
                          <Badge variant="default" className="bg-primary">
                            <Link2 className="w-3 h-3 mr-1" />
                            Manual
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Não
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums whitespace-nowrap">
                        {row.period_start
                          ? new Date(row.period_start + 'T00:00:00').toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.planned)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(Number(row.cost || 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={
                            row.variance > 10
                              ? 'text-destructive'
                              : row.variance < -10
                              ? 'text-success'
                              : ''
                          }
                        >
                          {row.variance > 0 ? '+' : ''}
                          {row.variance.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(Number(row.impressions || 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(Number(row.clicks || 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(Number(row.ctr || 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(Number(row.cpc || 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(Number(row.leads || 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(Number(row.conversions || 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(Number(row.cpa || 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(Number(row.sessions || 0))}
                      </TableCell>
                      <TableCell>
                        {row.match_status === 'unmatched' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleManualMatch(row)}
                          >
                            <Link2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {filteredData.length} de {reportData.length} linhas
          </div>
        </CardContent>
      </Card>

      {/* Manual Match Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match Manual</DialogTitle>
            <DialogDescription>
              Selecione a linha de mídia correspondente ao código "{selectedReportData?.line_code}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {unmatchedLines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Todas as linhas já foram associadas
              </p>
            ) : (
              unmatchedLines.map((line) => (
                <Button
                  key={line.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleConfirmMatch(line.id)}
                >
                  <span className="font-mono text-xs mr-2">{line.line_code}</span>
                  <span className="truncate">{line.platform}</span>
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}