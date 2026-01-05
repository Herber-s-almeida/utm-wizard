import * as XLSX from 'xlsx';
import { TaxonomyLine } from '@/hooks/useTaxonomyData';
import { toSlug, buildUrlWithUTM } from './utmGenerator';

interface ExportUtmData {
  planName: string;
  campaignName: string;
  defaultUrl: string | null;
  lines: TaxonomyLine[];
}

export function exportUtmsToXlsx(data: ExportUtmData) {
  const { planName, campaignName, defaultUrl, lines } = data;

  const buildUtmCampaign = (line: TaxonomyLine): string => {
    const parts = [
      line.line_code || '',
      toSlug(campaignName),
      line.subdivision?.slug || '',
      line.moment?.slug || '',
      line.funnel_stage_ref?.slug || '',
    ].filter(Boolean);
    return parts.join('_');
  };

  // Build rows for lines
  const lineRows: any[] = [];
  
  lines.forEach(line => {
    const utmSource = line.vehicle?.slug || line.utm_source || '';
    const utmMedium = line.channel?.slug || line.utm_medium || '';
    const utmCampaign = line.utm_campaign || buildUtmCampaign(line);
    const destinationUrl = line.destination_url || defaultUrl || '';
    
    const utmParams = {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: line.utm_term || '',
      utm_content: '',
    };
    
    const fullUrl = destinationUrl ? buildUrlWithUTM(destinationUrl, utmParams) : '';
    
    // Add line row
    lineRows.push({
      'Tipo': 'Linha',
      'Código': line.line_code || '-',
      'Veículo': line.vehicle?.name || line.platform,
      'Canal': line.channel?.name || '-',
      'utm_source': utmSource,
      'utm_medium': utmMedium,
      'utm_campaign': utmCampaign,
      'utm_term': line.utm_term || '',
      'utm_content': '',
      'URL de Destino': destinationUrl,
      'URL Completa': fullUrl,
      'Validado': line.utm_validated ? 'Sim' : 'Não',
    });
    
    // Add creative rows
    line.creatives.forEach(creative => {
      const creativeUtmParams = {
        ...utmParams,
        utm_content: creative.creative_id || '',
      };
      const creativeFullUrl = destinationUrl ? buildUrlWithUTM(destinationUrl, creativeUtmParams) : '';
      
      lineRows.push({
        'Tipo': 'Criativo',
        'Código': creative.creative_id || '-',
        'Veículo': `↳ ${creative.name}`,
        'Canal': '',
        'utm_source': utmSource,
        'utm_medium': utmMedium,
        'utm_campaign': utmCampaign,
        'utm_term': line.utm_term || '',
        'utm_content': creative.creative_id || '',
        'URL de Destino': destinationUrl,
        'URL Completa': creativeFullUrl,
        'Validado': line.utm_validated ? 'Sim' : 'Não',
      });
    });
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(lineRows);

  // Set column widths
  const colWidths = [
    { wch: 10 }, // Tipo
    { wch: 12 }, // Código
    { wch: 25 }, // Veículo
    { wch: 15 }, // Canal
    { wch: 20 }, // utm_source
    { wch: 20 }, // utm_medium
    { wch: 40 }, // utm_campaign
    { wch: 20 }, // utm_term
    { wch: 15 }, // utm_content
    { wch: 35 }, // URL de Destino
    { wch: 80 }, // URL Completa
    { wch: 10 }, // Validado
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'UTMs');

  // Generate filename
  const sanitizedName = planName.replace(/[^a-zA-Z0-9áéíóúàèìòùâêîôûãõäëïöüçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÄËÏÖÜÇ\s-]/g, '').trim();
  const filename = `UTMs_${sanitizedName}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Download
  XLSX.writeFile(wb, filename);
}
