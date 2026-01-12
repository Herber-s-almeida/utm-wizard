import * as XLSX from 'xlsx';
import { MediaPlan, MediaLine, MediaCreative } from '@/types/media';
import { HierarchyLevel, getLevelLabel, DEFAULT_HIERARCHY_ORDER } from '@/types/hierarchy';

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
  hierarchyOrder?: HierarchyLevel[];
}

export function exportMediaPlanToXlsx(data: ExportData) {
  const { 
    plan, 
    lines, 
    creatives, 
    subdivisions, 
    moments, 
    funnelStages, 
    mediums, 
    vehicles, 
    channels, 
    targets, 
    statuses,
    hierarchyOrder = DEFAULT_HIERARCHY_ORDER 
  } = data;

  // Helper to find name by id
  const findName = (list: Array<{ id: string; name: string }>, id: string | null | undefined): string => {
    if (!id) return '-';
    return list.find(item => item.id === id)?.name || '-';
  };

  // Get list for a hierarchy level
  const getListForLevel = (level: HierarchyLevel): Array<{ id: string; name: string }> => {
    switch (level) {
      case 'subdivision': return subdivisions;
      case 'moment': return moments;
      case 'funnel_stage': return funnelStages;
      default: return [];
    }
  };

  // Get field name for a hierarchy level
  const getFieldForLevel = (level: HierarchyLevel): keyof MediaLine => {
    switch (level) {
      case 'subdivision': return 'subdivision_id';
      case 'moment': return 'moment_id';
      case 'funnel_stage': return 'funnel_stage_id';
      default: return 'subdivision_id';
    }
  };

  // Format date for display
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '-';
    // Parse date as local time to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  };

  // Format currency for display
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Build dynamic column definitions based on hierarchyOrder
  const hierarchyColumns = hierarchyOrder.map(level => ({
    key: level,
    header: getLevelLabel(level),
    getValue: (line: MediaLine) => findName(getListForLevel(level), line[getFieldForLevel(level)] as string | null | undefined),
  }));

  // Build rows for the export
  const rows = lines.map(line => {
    const lineCreatives = creatives[line.id] || [];
    
    // Build base row with hierarchy columns in order
    const row: Record<string, string | number> = {
      'Código': line.line_code || '-',
    };
    
    // Add hierarchy columns in the configured order
    hierarchyColumns.forEach(col => {
      row[col.header] = col.getValue(line);
    });
    
    // Add remaining fixed columns
    row['Meio'] = findName(mediums, line.medium_id);
    row['Veículo'] = findName(vehicles, line.vehicle_id);
    row['Canal'] = findName(channels, line.channel_id);
    row['Segmentação'] = findName(targets, line.target_id);
    row['Orçamento'] = formatCurrency(Number(line.budget));
    row['Qtd. Criativos'] = lineCreatives.length;
    row['Status'] = findName(statuses, line.status_id);
    row['Início'] = formatDate(line.start_date);
    row['Fim'] = formatDate(line.end_date);
    
    return row;
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Calculate column widths dynamically
  const baseColWidths = [
    { wch: 15 }, // Código
  ];
  
  // Add hierarchy column widths
  const hierarchyColWidths = hierarchyOrder.map(() => ({ wch: 20 }));
  
  // Add remaining fixed column widths
  const remainingColWidths = [
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
  
  ws['!cols'] = [...baseColWidths, ...hierarchyColWidths, ...remainingColWidths];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Plano de Mídia');

  // Generate filename
  const sanitizedName = plan.name.replace(/[^a-zA-Z0-9áéíóúàèìòùâêîôûãõäëïöüçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÄËÏÖÜÇ\s-]/g, '').trim();
  const filename = `${sanitizedName}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Download
  XLSX.writeFile(wb, filename);
}
