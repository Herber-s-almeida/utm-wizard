import * as XLSX from 'xlsx';
import { parse, isValid } from 'date-fns';

export interface ParsedImportLine {
  rowNumber: number;
  lineCode: string;
  vehicleName: string;
  channelName: string;
  totalBudget: number;
  startDate: Date | null;
  endDate: Date | null;
  
  // Optional fields
  mediumName?: string;
  funnelStageName?: string;
  subdivisionName?: string;
  momentName?: string;
  targetName?: string;
  formatName?: string;
  objective?: string;
  notes?: string;
  destinationUrl?: string;
  
  // Monthly budgets (key = "YYYY-MM-01")
  monthlyBudgets: Record<string, number>;
}

export interface ColumnMapping {
  fileColumn: string;
  systemField: string;
  detected: boolean;
}

export interface ParseResult {
  lines: ParsedImportLine[];
  columns: string[];
  mappings: ColumnMapping[];
  monthColumns: string[];
  errors: string[];
  warnings: string[];
}

// System field definitions
export const SYSTEM_FIELDS = {
  linha_codigo: { label: 'Código da Linha', required: true },
  veiculo: { label: 'Veículo', required: true },
  canal: { label: 'Canal', required: true },
  orcamento_total: { label: 'Orçamento Total', required: true },
  data_inicio: { label: 'Data Início', required: false },
  data_fim: { label: 'Data Fim', required: false },
  meio: { label: 'Meio', required: false },
  fase_funil: { label: 'Fase do Funil', required: false },
  subdivisao: { label: 'Subdivisão', required: false },
  momento: { label: 'Momento', required: false },
  segmentacao: { label: 'Segmentação', required: false },
  formato: { label: 'Formato', required: false },
  objetivo: { label: 'Objetivo', required: false },
  notas: { label: 'Notas', required: false },
  url_destino: { label: 'URL de Destino', required: false },
} as const;

// Auto-detection patterns for column mapping
const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  linha_codigo: [/^(linha_?)?cod(igo)?$/i, /^code$/i, /^id$/i, /^linha$/i],
  veiculo: [/^veiculo$/i, /^ve[ií]culo$/i, /^plataforma$/i, /^platform$/i, /^vehicle$/i],
  canal: [/^canal$/i, /^channel$/i, /^tipo$/i],
  orcamento_total: [/^orc?amento(_?total)?$/i, /^budget$/i, /^investimento$/i, /^valor$/i, /^total$/i],
  data_inicio: [/^(data_?)?(inicio|start)$/i, /^in[ií]cio$/i, /^start$/i],
  data_fim: [/^(data_?)?(fim|end)$/i, /^fim$/i, /^end$/i, /^t[eé]rmino$/i],
  meio: [/^meio$/i, /^medium$/i, /^m[eé]dia$/i],
  fase_funil: [/^fase(_?funil)?$/i, /^funil$/i, /^funnel$/i, /^etapa$/i, /^stage$/i],
  subdivisao: [/^subdivisao$/i, /^praca$/i, /^pra[çc]a$/i, /^regiao$/i, /^regi[ãa]o$/i, /^produto$/i],
  momento: [/^momento$/i, /^campanha$/i, /^moment$/i, /^wave$/i],
  segmentacao: [/^segmenta[çc][ãa]o$/i, /^target$/i, /^publico$/i, /^p[úu]blico$/i, /^audience$/i],
  formato: [/^formato$/i, /^format$/i, /^criativo$/i, /^creative$/i],
  objetivo: [/^objetivo$/i, /^objective$/i, /^goal$/i],
  notas: [/^notas?$/i, /^obs(erva[çc][ãa]o)?$/i, /^notes?$/i, /^comments?$/i],
  url_destino: [/^url[_\s-]?destino$/i, /^destino[_\s-]?url$/i, /^destination[_\s-]?url$/i, /^landing[_\s-]?(page|url)?$/i, /^url$/i, /^destino$/i, /^link$/i, /^destination$/i],
};

// Month patterns for detecting month columns
const MONTH_NAMES: Record<string, number> = {
  jan: 0, janeiro: 0, january: 0,
  fev: 1, fevereiro: 1, february: 1, feb: 1,
  mar: 2, marco: 2, março: 2, march: 2,
  abr: 3, abril: 3, april: 3, apr: 3,
  mai: 4, maio: 4, may: 4,
  jun: 5, junho: 5, june: 5,
  jul: 6, julho: 6, july: 6,
  ago: 7, agosto: 7, august: 7, aug: 7,
  set: 8, setembro: 8, september: 8, sep: 8,
  out: 9, outubro: 9, october: 9, oct: 9,
  nov: 10, novembro: 10, november: 10,
  dez: 11, dezembro: 11, december: 11, dec: 11,
};

function detectMonthColumn(colName: string): { month: number; year: number } | null {
  const normalized = colName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Pattern: "jan_2026", "jan2026", "janeiro_2026", etc.
  for (const [monthName, monthIndex] of Object.entries(MONTH_NAMES)) {
    const pattern = new RegExp(`^${monthName}[_-]?(\\d{4})$`);
    const match = normalized.match(pattern);
    if (match) {
      return { month: monthIndex, year: parseInt(match[1]) };
    }
    
    // Pattern: "2026_jan", "2026jan"
    const reversePattern = new RegExp(`^(\\d{4})[_-]?${monthName}$`);
    const reverseMatch = normalized.match(reversePattern);
    if (reverseMatch) {
      return { month: monthIndex, year: parseInt(reverseMatch[1]) };
    }
  }
  
  return null;
}

function autoDetectMapping(column: string): string | null {
  const normalized = column.toLowerCase().replace(/\s+/g, '_');
  
  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return field;
      }
    }
  }
  
  return null;
}

function parseDate(value: any): Date | null {
  if (!value) return null;
  
  // If it's already a valid Date with reasonable year
  if (value instanceof Date && isValid(value)) {
    const year = value.getFullYear();
    if (year >= 1900 && year <= 2100) {
      return value;
    }
  }
  
  // If it's a number (Excel serial date: days since 1900-01-01)
  if (typeof value === 'number' && value > 0) {
    // Excel serial date: days since 1899-12-30 (includes the 1900 leap year bug)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    if (isValid(date) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
      return date;
    }
  }
  
  const strValue = String(value).trim();
  
  // Try common date formats
  const formats = [
    'dd/MM/yyyy',
    'dd-MM-yyyy',
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'd/M/yyyy',
  ];
  
  for (const fmt of formats) {
    const parsed = parse(strValue, fmt, new Date());
    if (isValid(parsed) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
      return parsed;
    }
  }
  
  // Try native Date parsing
  const nativeDate = new Date(strValue);
  if (isValid(nativeDate) && nativeDate.getFullYear() >= 1900 && nativeDate.getFullYear() <= 2100) {
    return nativeDate;
  }
  
  return null;
}

function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const strValue = String(value).trim();
  
  // If already a simple number format (digits with optional decimal point)
  if (/^\d+\.?\d*$/.test(strValue)) {
    return parseFloat(strValue);
  }
  
  // Detect format: Brazilian (1.234.567,89) vs American (1,234,567.89)
  // Brazilian: comma is decimal separator, period is thousands
  // American: period is decimal separator, comma is thousands
  const lastComma = strValue.lastIndexOf(',');
  const lastDot = strValue.lastIndexOf('.');
  
  let cleaned = strValue.replace(/[R$\s]/g, '');
  
  // Determine format based on position of last comma vs last dot
  const isBrazilianFormat = lastComma > lastDot || 
    (lastComma > -1 && lastDot === -1) ||
    (lastComma > -1 && strValue.indexOf('.') < lastComma);
  
  if (isBrazilianFormat) {
    // Brazilian: remove periods (thousands), replace comma with dot (decimal)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // American: remove commas (thousands), keep dot (decimal)
    cleaned = cleaned.replace(/,/g, '');
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseFile(file: File): Promise<{ data: any[]; columns: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
        
        if (jsonData.length === 0) {
          reject(new Error('Arquivo vazio ou sem dados válidos'));
          return;
        }
        
        const columns = Object.keys(jsonData[0] as object);
        resolve({ data: jsonData, columns });
      } catch (error) {
        reject(new Error('Erro ao ler arquivo: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsBinaryString(file);
  });
}

export function detectColumnMappings(columns: string[]): { mappings: ColumnMapping[]; monthColumns: string[] } {
  const mappings: ColumnMapping[] = [];
  const monthColumns: string[] = [];
  const usedFields = new Set<string>();
  
  for (const col of columns) {
    // Check if it's a month column
    const monthInfo = detectMonthColumn(col);
    if (monthInfo) {
      monthColumns.push(col);
      continue;
    }
    
    // Try to auto-detect system field
    const detected = autoDetectMapping(col);
    if (detected && !usedFields.has(detected)) {
      mappings.push({
        fileColumn: col,
        systemField: detected,
        detected: true,
      });
      usedFields.add(detected);
    } else {
      mappings.push({
        fileColumn: col,
        systemField: '',
        detected: false,
      });
    }
  }
  
  return { mappings, monthColumns };
}

export function parseImportData(
  rawData: any[],
  mappings: ColumnMapping[],
  monthColumns: string[]
): ParseResult {
  const lines: ParsedImportLine[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Build field to column map
  const fieldToColumn: Record<string, string> = {};
  for (const mapping of mappings) {
    if (mapping.systemField) {
      fieldToColumn[mapping.systemField] = mapping.fileColumn;
    }
  }
  
  // Validate required fields
  const requiredFields = ['linha_codigo', 'veiculo', 'canal', 'orcamento_total'];
  for (const field of requiredFields) {
    if (!fieldToColumn[field]) {
      errors.push(`Campo obrigatório não mapeado: ${SYSTEM_FIELDS[field as keyof typeof SYSTEM_FIELDS].label}`);
    }
  }
  
  if (errors.length > 0) {
    return { lines: [], columns: [], mappings, monthColumns, errors, warnings };
  }
  
  // Parse each row
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const rowNum = i + 2; // +2 because of 0-index and header row
    
    const lineCode = String(row[fieldToColumn.linha_codigo] || '').trim();
    const vehicleName = String(row[fieldToColumn.veiculo] || '').trim();
    const channelName = String(row[fieldToColumn.canal] || '').trim();
    const totalBudget = parseNumber(row[fieldToColumn.orcamento_total]);
    
    // Validate required fields for this row
    if (!lineCode) {
      errors.push(`Linha ${rowNum}: Código da linha é obrigatório`);
      continue;
    }
    if (!vehicleName) {
      errors.push(`Linha ${rowNum}: Veículo é obrigatório`);
      continue;
    }
    if (!channelName) {
      errors.push(`Linha ${rowNum}: Canal é obrigatório`);
      continue;
    }
    if (totalBudget <= 0) {
      errors.push(`Linha ${rowNum}: Orçamento deve ser maior que zero`);
      continue;
    }
    
    // Parse optional fields
    const startDate = fieldToColumn.data_inicio ? parseDate(row[fieldToColumn.data_inicio]) : null;
    const endDate = fieldToColumn.data_fim ? parseDate(row[fieldToColumn.data_fim]) : null;
    
    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      warnings.push(`Linha ${rowNum}: Data de início posterior à data de fim`);
    }
    
    // Parse monthly budgets
    const monthlyBudgets: Record<string, number> = {};
    let monthlySum = 0;
    
    for (const monthCol of monthColumns) {
      const monthInfo = detectMonthColumn(monthCol);
      if (monthInfo) {
        const value = parseNumber(row[monthCol]);
        if (value > 0) {
          const key = `${monthInfo.year}-${String(monthInfo.month + 1).padStart(2, '0')}-01`;
          monthlyBudgets[key] = value;
          monthlySum += value;
        }
      }
    }
    
    // Check if monthly sum matches total
    if (monthlySum > 0 && Math.abs(monthlySum - totalBudget) > 0.01) {
      warnings.push(`Linha ${rowNum}: Soma mensal (R$ ${monthlySum.toFixed(2)}) difere do total (R$ ${totalBudget.toFixed(2)})`);
    }
    
    const line: ParsedImportLine = {
      rowNumber: rowNum,
      lineCode,
      vehicleName,
      channelName,
      totalBudget,
      startDate,
      endDate,
      monthlyBudgets,
      mediumName: fieldToColumn.meio ? String(row[fieldToColumn.meio] || '').trim() || undefined : undefined,
      funnelStageName: fieldToColumn.fase_funil ? String(row[fieldToColumn.fase_funil] || '').trim() || undefined : undefined,
      subdivisionName: fieldToColumn.subdivisao ? String(row[fieldToColumn.subdivisao] || '').trim() || undefined : undefined,
      momentName: fieldToColumn.momento ? String(row[fieldToColumn.momento] || '').trim() || undefined : undefined,
      targetName: fieldToColumn.segmentacao ? String(row[fieldToColumn.segmentacao] || '').trim() || undefined : undefined,
      formatName: fieldToColumn.formato ? String(row[fieldToColumn.formato] || '').trim() || undefined : undefined,
      objective: fieldToColumn.objetivo ? String(row[fieldToColumn.objetivo] || '').trim() || undefined : undefined,
      notes: fieldToColumn.notas ? String(row[fieldToColumn.notas] || '').trim() || undefined : undefined,
      destinationUrl: fieldToColumn.url_destino ? String(row[fieldToColumn.url_destino] || '').trim() || undefined : undefined,
    };
    
    lines.push(line);
  }
  
  // Check for duplicate line codes
  const codes = lines.map(l => l.lineCode);
  const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Códigos de linha duplicados: ${[...new Set(duplicates)].join(', ')}`);
  }
  
  return {
    lines,
    columns: mappings.map(m => m.fileColumn),
    mappings,
    monthColumns,
    errors,
    warnings,
  };
}
