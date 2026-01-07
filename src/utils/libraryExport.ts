import * as XLSX from 'xlsx';

export interface LibraryConfigExport {
  version: string;
  exportedAt: string;
  subdivisions: Array<{ name: string; description?: string }>;
  moments: Array<{ name: string; description?: string }>;
  funnelStages: Array<{ name: string; description?: string; order_index?: number }>;
  mediums: Array<{ name: string; description?: string }>;
  vehicles: Array<{ name: string; description?: string; medium?: string }>;
  channels: Array<{ name: string; description?: string; vehicle?: string }>;
  targets: Array<{ name: string; description?: string; age_range?: string }>;
  statuses: Array<{ name: string; description?: string }>;
}

export interface ImportResult {
  success: boolean;
  imported: {
    subdivisions: number;
    moments: number;
    funnelStages: number;
    mediums: number;
    vehicles: number;
    channels: number;
    targets: number;
    statuses: number;
  };
  errors: string[];
}

/**
 * Export library configurations to JSON format
 */
export function exportLibraryToJson(config: LibraryConfigExport): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Export library configurations to Excel format
 */
export function exportLibraryToExcel(config: LibraryConfigExport, filename?: string) {
  const wb = XLSX.utils.book_new();

  // Subdivisions sheet
  if (config.subdivisions.length > 0) {
    const ws = XLSX.utils.json_to_sheet(config.subdivisions);
    ws['!cols'] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Subdivisões');
  }

  // Moments sheet
  if (config.moments.length > 0) {
    const ws = XLSX.utils.json_to_sheet(config.moments);
    ws['!cols'] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Momentos');
  }

  // Funnel Stages sheet
  if (config.funnelStages.length > 0) {
    const ws = XLSX.utils.json_to_sheet(config.funnelStages);
    ws['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Fases do Funil');
  }

  // Mediums sheet
  if (config.mediums.length > 0) {
    const ws = XLSX.utils.json_to_sheet(config.mediums);
    ws['!cols'] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Meios');
  }

  // Vehicles sheet
  if (config.vehicles.length > 0) {
    const ws = XLSX.utils.json_to_sheet(config.vehicles);
    ws['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Veículos');
  }

  // Channels sheet
  if (config.channels.length > 0) {
    const ws = XLSX.utils.json_to_sheet(config.channels);
    ws['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Canais');
  }

  // Targets sheet
  if (config.targets.length > 0) {
    const ws = XLSX.utils.json_to_sheet(config.targets);
    ws['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Segmentações');
  }

  // Statuses sheet
  if (config.statuses.length > 0) {
    const ws = XLSX.utils.json_to_sheet(config.statuses);
    ws['!cols'] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Status');
  }

  // Add metadata sheet
  const metaWs = XLSX.utils.json_to_sheet([
    { Campo: 'Versão', Valor: config.version },
    { Campo: 'Exportado em', Valor: config.exportedAt },
    { Campo: 'Total Subdivisões', Valor: config.subdivisions.length },
    { Campo: 'Total Momentos', Valor: config.moments.length },
    { Campo: 'Total Fases do Funil', Valor: config.funnelStages.length },
    { Campo: 'Total Meios', Valor: config.mediums.length },
    { Campo: 'Total Veículos', Valor: config.vehicles.length },
    { Campo: 'Total Canais', Valor: config.channels.length },
    { Campo: 'Total Segmentações', Valor: config.targets.length },
    { Campo: 'Total Status', Valor: config.statuses.length },
  ]);
  metaWs['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadados');

  const finalFilename = filename || `configuracoes_biblioteca_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, finalFilename);
}

/**
 * Parse library configurations from JSON
 */
export function parseLibraryFromJson(jsonContent: string): LibraryConfigExport | null {
  try {
    const parsed = JSON.parse(jsonContent);
    
    // Validate structure
    if (!parsed.version || !parsed.exportedAt) {
      throw new Error('Invalid configuration file format');
    }
    
    return {
      version: parsed.version || '1.0',
      exportedAt: parsed.exportedAt,
      subdivisions: parsed.subdivisions || [],
      moments: parsed.moments || [],
      funnelStages: parsed.funnelStages || [],
      mediums: parsed.mediums || [],
      vehicles: parsed.vehicles || [],
      channels: parsed.channels || [],
      targets: parsed.targets || [],
      statuses: parsed.statuses || [],
    };
  } catch {
    return null;
  }
}

/**
 * Parse library configurations from Excel file
 */
export function parseLibraryFromExcel(file: ArrayBuffer): LibraryConfigExport | null {
  try {
    const wb = XLSX.read(file, { type: 'array' });
    
    const parseSheet = <T>(sheetName: string): T[] => {
      const ws = wb.Sheets[sheetName];
      if (!ws) return [];
      return XLSX.utils.sheet_to_json(ws) as T[];
    };
    
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      subdivisions: parseSheet<{ name: string; description?: string }>('Subdivisões'),
      moments: parseSheet<{ name: string; description?: string }>('Momentos'),
      funnelStages: parseSheet<{ name: string; description?: string; order_index?: number }>('Fases do Funil'),
      mediums: parseSheet<{ name: string; description?: string }>('Meios'),
      vehicles: parseSheet<{ name: string; description?: string; medium?: string }>('Veículos'),
      channels: parseSheet<{ name: string; description?: string; vehicle?: string }>('Canais'),
      targets: parseSheet<{ name: string; description?: string; age_range?: string }>('Segmentações'),
      statuses: parseSheet<{ name: string; description?: string }>('Status'),
    };
  } catch {
    return null;
  }
}

/**
 * Generate a template Excel file for importing configurations
 */
export function generateImportTemplate() {
  const wb = XLSX.utils.book_new();

  // Subdivisions template
  const subWs = XLSX.utils.json_to_sheet([
    { name: 'Exemplo: Sul', description: 'Região Sul do Brasil' },
    { name: 'Exemplo: Nordeste', description: 'Região Nordeste do Brasil' },
  ]);
  subWs['!cols'] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, subWs, 'Subdivisões');

  // Moments template
  const momWs = XLSX.utils.json_to_sheet([
    { name: 'Exemplo: Lançamento', description: 'Fase inicial da campanha' },
    { name: 'Exemplo: Sustentação', description: 'Fase de manutenção' },
  ]);
  momWs['!cols'] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, momWs, 'Momentos');

  // Funnel Stages template
  const funWs = XLSX.utils.json_to_sheet([
    { name: 'Exemplo: Awareness', description: 'Topo do funil', order_index: 1 },
    { name: 'Exemplo: Consideration', description: 'Meio do funil', order_index: 2 },
  ]);
  funWs['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, funWs, 'Fases do Funil');

  // Mediums template
  const medWs = XLSX.utils.json_to_sheet([
    { name: 'Exemplo: Digital', description: 'Canais digitais' },
    { name: 'Exemplo: TV', description: 'Televisão' },
  ]);
  medWs['!cols'] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, medWs, 'Meios');

  // Vehicles template
  const vehWs = XLSX.utils.json_to_sheet([
    { name: 'Exemplo: Google Ads', description: 'Plataforma de anúncios Google', medium: 'Digital' },
    { name: 'Exemplo: Meta Ads', description: 'Plataforma Meta', medium: 'Digital' },
  ]);
  vehWs['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, vehWs, 'Veículos');

  // Channels template
  const chWs = XLSX.utils.json_to_sheet([
    { name: 'Exemplo: Search', description: 'Busca paga', vehicle: 'Google Ads' },
    { name: 'Exemplo: Display', description: 'Rede de display', vehicle: 'Google Ads' },
  ]);
  chWs['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, chWs, 'Canais');

  // Targets template
  const tarWs = XLSX.utils.json_to_sheet([
    { name: 'Exemplo: Jovens Adultos', description: 'Público jovem adulto', age_range: '18-34' },
    { name: 'Exemplo: Profissionais', description: 'Profissionais de negócios', age_range: '25-54' },
  ]);
  tarWs['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, tarWs, 'Segmentações');

  // Instructions sheet
  const instructionsWs = XLSX.utils.json_to_sheet([
    { Instruções: 'Como usar este template:' },
    { Instruções: '1. Substitua os exemplos pelos seus dados reais' },
    { Instruções: '2. Mantenha a coluna "name" preenchida (obrigatória)' },
    { Instruções: '3. O campo "description" é opcional' },
    { Instruções: '4. Em Veículos, indique o Meio relacionado na coluna "medium"' },
    { Instruções: '5. Em Canais, indique o Veículo relacionado na coluna "vehicle"' },
    { Instruções: '6. Salve o arquivo e importe no sistema' },
  ]);
  instructionsWs['!cols'] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instruções');

  XLSX.writeFile(wb, 'template_importacao_biblioteca.xlsx');
}
