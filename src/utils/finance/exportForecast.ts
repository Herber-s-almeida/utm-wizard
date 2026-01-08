import * as XLSX from "xlsx";
import type { FinancialForecast } from "@/types/finance";

interface ForecastExportRow {
  Período: string;
  "Valor Planejado": number;
  "Acumulado": number;
  "Subdivisão": string;
  "Canal": string;
  "Veículo": string;
  "Status": string;
}

export function exportForecastToXlsx(
  forecasts: FinancialForecast[],
  planName: string = "Forecast"
): void {
  // Sort by period
  const sorted = [...forecasts].sort((a, b) => 
    new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
  );

  // Calculate cumulative
  let cumulative = 0;
  const rows: ForecastExportRow[] = sorted.map((f) => {
    cumulative += f.planned_amount;
    const dims = f.dimensions_json as Record<string, string> | null;
    
    return {
      "Período": `${formatDate(f.period_start)} - ${formatDate(f.period_end)}`,
      "Valor Planejado": f.planned_amount,
      "Acumulado": cumulative,
      "Subdivisão": dims?.subdivision_name || "-",
      "Canal": dims?.channel_name || "-",
      "Veículo": dims?.vehicle_name || "-",
      "Status": f.is_locked ? "Congelado" : "Aberto",
    };
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws["!cols"] = [
    { wch: 25 }, // Período
    { wch: 18 }, // Valor Planejado
    { wch: 15 }, // Acumulado
    { wch: 20 }, // Subdivisão
    { wch: 20 }, // Canal
    { wch: 20 }, // Veículo
    { wch: 12 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Forecast");

  // Add summary sheet
  const totalPlanned = forecasts.reduce((sum, f) => sum + f.planned_amount, 0);
  const lockedCount = forecasts.filter(f => f.is_locked).length;
  
  const summaryData = [
    { "Métrica": "Total Planejado", "Valor": totalPlanned },
    { "Métrica": "Períodos", "Valor": forecasts.length },
    { "Métrica": "Períodos Congelados", "Valor": lockedCount },
    { "Métrica": "Data de Exportação", "Valor": new Date().toLocaleString("pt-BR") },
  ];
  
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Resumo");

  // Download
  const fileName = `forecast_${slugify(planName)}_${formatDateFile(new Date())}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatDateFile(date: Date): string {
  return date.toISOString().split("T")[0];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 30);
}
