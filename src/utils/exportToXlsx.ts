import * as XLSX from 'xlsx';
import { MediaPlan, MediaLine, MediaCreative } from '@/types/media';

interface ExportData {
  plan: MediaPlan;
  lines: MediaLine[];
  creatives: Record<string, MediaCreative[]>;
  subdivisions: Array<{ id: string; name: string }>;
  moments: Array<{ id: string; name: string }>;
  funnelStages: Array<{ id: string; name: string }>;
  mediums: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; name: string }>;
  channels: Array<{ id: string; name: string }>;
  targets: Array<{ id: string; name: string }>;
  statuses: Array<{ id: string; name: string }>;
}

export function exportMediaPlanToXlsx(data: ExportData) {
  const { plan, lines, creatives, subdivisions, moments, funnelStages, mediums, vehicles, channels, targets, statuses } = data;

  // Helper to find name by id
  const findName = (list: Array<{ id: string; name: string }>, id: string | null | undefined): string => {
    if (!id) return '-';
    return list.find(item => item.id === id)?.name || '-';
  };

  // Format date for display
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Format currency for display
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Build rows for the export
  const rows = lines.map(line => {
    const lineCreatives = creatives[line.id] || [];
    
    return {
      'Código': line.line_code || '-',
      'Subdivisão': findName(subdivisions, line.subdivision_id),
      'Momento': findName(moments, line.moment_id),
      'Fase do Funil': findName(funnelStages, line.funnel_stage_id),
      'Meio': findName(mediums, line.medium_id),
      'Veículo': findName(vehicles, line.vehicle_id),
      'Canal': findName(channels, line.channel_id),
      'Segmentação': findName(targets, line.target_id),
      'Orçamento': formatCurrency(Number(line.budget)),
      'Qtd. Criativos': lineCreatives.length,
      'Status': findName(statuses, line.status_id),
      'Início': formatDate(line.start_date),
      'Fim': formatDate(line.end_date),
    };
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  const colWidths = [
    { wch: 15 }, // Código
    { wch: 20 }, // Subdivisão
    { wch: 20 }, // Momento
    { wch: 18 }, // Fase do Funil
    { wch: 15 }, // Meio
    { wch: 20 }, // Veículo
    { wch: 20 }, // Canal
    { wch: 20 }, // Segmentação
    { wch: 15 }, // Orçamento
    { wch: 12 }, // Qtd. Criativos
    { wch: 15 }, // Status
    { wch: 12 }, // Início
    { wch: 12 }, // Fim
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Plano de Mídia');

  // Generate filename
  const sanitizedName = plan.name.replace(/[^a-zA-Z0-9áéíóúàèìòùâêîôûãõäëïöüçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÄËÏÖÜÇ\s-]/g, '').trim();
  const filename = `${sanitizedName}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Download
  XLSX.writeFile(wb, filename);
}
