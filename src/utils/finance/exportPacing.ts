import * as XLSX from "xlsx";
import type { FinancialForecast, FinancialActual } from "@/types/finance";

interface PacingExportRow {
  Período: string;
  Planejado: number;
  Executado: number;
  "Variação (R$)": number;
  "Variação (%)": string;
  Status: string;
}

export function exportPacingToXlsx(
  forecasts: FinancialForecast[],
  actuals: FinancialActual[],
  planName: string = "Pacing"
): void {
  // Group actuals by period
  const actualsByPeriod = new Map<string, number>();
  actuals.forEach((a) => {
    const key = `${a.period_start}_${a.period_end}`;
    actualsByPeriod.set(key, (actualsByPeriod.get(key) || 0) + a.actual_amount);
  });

  // Sort forecasts by period
  const sorted = [...forecasts].sort((a, b) => 
    new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
  );

  const rows: PacingExportRow[] = sorted.map((f) => {
    const key = `${f.period_start}_${f.period_end}`;
    const actualAmount = actualsByPeriod.get(key) || 0;
    const variation = actualAmount - f.planned_amount;
    const variationPct = f.planned_amount > 0 
      ? (variation / f.planned_amount) * 100 
      : 0;
    
    let status = "No Prazo";
    if (variationPct > 10) status = "⚠️ Overspend";
    else if (variationPct < -20) status = "⚠️ Underspend";
    else if (variationPct > 5) status = "Acima";
    else if (variationPct < -10) status = "Abaixo";

    return {
      "Período": `${formatDate(f.period_start)} - ${formatDate(f.period_end)}`,
      "Planejado": f.planned_amount,
      "Executado": actualAmount,
      "Variação (R$)": variation,
      "Variação (%)": `${variationPct.toFixed(1)}%`,
      "Status": status,
    };
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws["!cols"] = [
    { wch: 25 }, // Período
    { wch: 15 }, // Planejado
    { wch: 15 }, // Executado
    { wch: 15 }, // Variação R$
    { wch: 12 }, // Variação %
    { wch: 15 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Pacing");

  // Add summary
  const totalPlanned = forecasts.reduce((sum, f) => sum + f.planned_amount, 0);
  const totalActual = actuals.reduce((sum, a) => sum + a.actual_amount, 0);
  const totalVariation = totalActual - totalPlanned;
  const totalVariationPct = totalPlanned > 0 ? (totalVariation / totalPlanned) * 100 : 0;

  const summaryData = [
    { "Métrica": "Total Planejado", "Valor": `R$ ${totalPlanned.toLocaleString("pt-BR")}` },
    { "Métrica": "Total Executado", "Valor": `R$ ${totalActual.toLocaleString("pt-BR")}` },
    { "Métrica": "Variação Total", "Valor": `R$ ${totalVariation.toLocaleString("pt-BR")}` },
    { "Métrica": "Variação %", "Valor": `${totalVariationPct.toFixed(1)}%` },
    { "Métrica": "Data de Exportação", "Valor": new Date().toLocaleString("pt-BR") },
  ];
  
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Resumo");

  // Download
  const fileName = `pacing_${slugify(planName)}_${formatDateFile(new Date())}.xlsx`;
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
