import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ColumnMapping {
  source_column: string;
  target_field: string;
  date_format?: string;
}

interface ImportRequest {
  import_id: string;
  media_plan_id: string;
  source_url: string;
  mappings: ColumnMapping[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Lê o body UMA ÚNICA VEZ (como texto) e guarda para parsing.
  // Isso evita qualquer tentativa posterior de re-ler stream via req.json()/clone().
  let bodyText: string | null = null;
  let body: ImportRequest | null = null;

  // Guarda import_id assim que possível para o catch.
  let importIdForError: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Body: lê uma vez, parseia uma vez
    bodyText = await req.text();
    if (!bodyText) {
      return new Response(JSON.stringify({ error: "Empty request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      body = JSON.parse(bodyText) as ImportRequest;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { import_id, media_plan_id, source_url, mappings } = body;

    // Deixa o import id disponível para o catch (mesmo se quebrar depois)
    importIdForError = import_id ?? null;

    if (!import_id || !media_plan_id || !source_url || !Array.isArray(mappings)) {
      return new Response(JSON.stringify({ error: "Invalid request body fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting import for plan ${media_plan_id}, import ${import_id}`);
    console.log(`Source URL: ${source_url}`);
    console.log(`Mappings count: ${mappings.length}`);

    // Update import status to processing
    {
      const { error: updErr } = await supabase
        .from("report_imports")
        .update({ import_status: "processing" })
        .eq("id", import_id);

      if (updErr) {
        console.error("Failed to set import status to processing:", updErr);
        throw new Error(`Failed to set import status to processing: ${updErr.message}`);
      }
    }

    // Fetch file (XLSX or CSV)
    console.log("Fetching file...");
    const fileResponse = await fetch(source_url);

    if (!fileResponse.ok) {
      const ct = fileResponse.headers.get("content-type") ?? "unknown";
      throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText} (content-type: ${ct})`);
    }

    const contentType = fileResponse.headers.get("content-type") ?? "";
    const isCSV = contentType.includes("text/csv") || 
                  contentType.includes("text/plain") || 
                  source_url.includes("output=csv") ||
                  source_url.includes("output=tsv");

    const arrayBuffer = await fileResponse.arrayBuffer();
    console.log(`Downloaded ${arrayBuffer.byteLength} bytes, isCSV: ${isCSV}`);

    // Parse file
    const XLSX = await import("npm:xlsx@0.18.5");
    
    let workbook;
    if (isCSV) {
      // For CSV, decode as text first to preserve original values
      const decoder = new TextDecoder("utf-8");
      const csvText = decoder.decode(arrayBuffer);
      // Use raw: true to get strings as-is, avoiding locale number conversion
      workbook = XLSX.read(csvText, { type: "string", raw: true });
    } else {
      workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error("File has no sheets/data");

    const worksheet = workbook.Sheets[firstSheetName];
    // Use raw: true to preserve string values as-is (prevents auto-conversion)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as any[][];

    if (jsonData.length < 2) {
      throw new Error("File must have at least a header row and one data row");
    }

    const headers = (jsonData[0] as any[]).map((h) => (h ?? "").toString()) as string[];
    const dataRows = jsonData.slice(1);

    console.log(`Found ${headers.length} columns and ${dataRows.length} data rows`);

    // Build mapping index
    const mappingIndex: Record<string, string> = {};
    const dateFormatIndex: Record<string, string> = {};
    for (const mapping of mappings) {
      const sourceIndex = headers.findIndex(
        (h) => h.toLowerCase().trim() === mapping.source_column.toLowerCase().trim(),
      );
      if (sourceIndex !== -1) {
        mappingIndex[sourceIndex.toString()] = mapping.target_field;
        if (mapping.date_format) {
          dateFormatIndex[sourceIndex.toString()] = mapping.date_format;
        }
      }
    }

    // Find line_code column
    const lineCodeMapping = mappings.find((m) => m.target_field === "line_code");
    if (!lineCodeMapping) throw new Error("line_code mapping is required");

    const lineCodeIndex = headers.findIndex(
      (h) => h.toLowerCase().trim() === lineCodeMapping.source_column.toLowerCase().trim(),
    );
    if (lineCodeIndex === -1) {
      throw new Error(`Column "${lineCodeMapping.source_column}" not found in XLSX`);
    }

    // Fetch existing media lines
    const { data: mediaLines, error: mediaLinesErr } = await supabase
      .from("media_lines")
      .select("id, line_code")
      .eq("media_plan_id", media_plan_id);

    if (mediaLinesErr) throw new Error(`Failed to fetch media lines: ${mediaLinesErr.message}`);

    const lineCodeToId: Record<string, string> = {};
    for (const line of mediaLines || []) {
      if (line?.line_code) {
        lineCodeToId[String(line.line_code).toLowerCase().trim()] = line.id;
      }
    }

    // Delete previous report data
    {
      const { error: delErr } = await supabase.from("report_data").delete().eq("import_id", import_id);

      if (delErr) throw new Error(`Failed to delete previous report_data: ${delErr.message}`);
    }

    // Process rows
    const reportDataRows: Record<string, any>[] = [];
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const row of dataRows) {
      const lineCode = row[lineCodeIndex]?.toString?.()?.trim?.();
      if (!lineCode) continue;

      const reportRow: Record<string, any> = {
        import_id,
        media_plan_id,
        line_code: lineCode,
        raw_data: {},
      };

      for (const [indexStr, targetField] of Object.entries(mappingIndex)) {
        const index = parseInt(indexStr, 10);
        let value = row[index];

        const headerName = headers[index] ?? `col_${index}`;
        reportRow.raw_data[headerName] = value;

        if (targetField === "line_code") continue;

        if (value !== undefined && value !== null && value !== "") {
          // Handle date fields
          if (targetField === "period_start" || targetField === "period_end" || targetField === "period_date") {
            const dateFormat = dateFormatIndex[indexStr] || "auto";
            let parsedDate: Date | null = null;

            if (typeof value === "number") {
              // Excel serial date number
              const excelEpoch = new Date(1899, 11, 30);
              const msPerDay = 24 * 60 * 60 * 1000;
              parsedDate = new Date(excelEpoch.getTime() + value * msPerDay);
            } else if (typeof value === "string") {
              const trimmedValue = value.trim();

              if (dateFormat === "excel_serial" && /^\d+$/.test(trimmedValue)) {
                const serial = parseInt(trimmedValue);
                const excelEpoch = new Date(1899, 11, 30);
                const msPerDay = 24 * 60 * 60 * 1000;
                parsedDate = new Date(excelEpoch.getTime() + serial * msPerDay);
              } else if (dateFormat === "DD/MM/YYYY" || dateFormat === "auto") {
                // Try DD/MM/YYYY first
                const match = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (match) {
                  const [, day, month, year] = match;
                  parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
                }
              }

              if (!parsedDate && (dateFormat === "MM/DD/YYYY" || dateFormat === "auto")) {
                const match = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (match) {
                  const [, month, day, year] = match;
                  const candidate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
                  if (!isNaN(candidate.getTime())) parsedDate = candidate;
                }
              }

              if (!parsedDate && (dateFormat === "YYYY-MM-DD" || dateFormat === "auto")) {
                if (/^\d{4}-\d{2}-\d{2}/.test(trimmedValue)) {
                  parsedDate = new Date(trimmedValue.substring(0, 10) + 'T00:00:00Z');
                }
              }

              if (!parsedDate && (dateFormat === "DD-MM-YYYY" || dateFormat === "auto")) {
                const match = trimmedValue.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                if (match) {
                  const [, day, month, year] = match;
                  parsedDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
                }
              }

              if (!parsedDate && (dateFormat === "DD.MM.YYYY" || dateFormat === "auto")) {
                const match = trimmedValue.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
                if (match) {
                  const [, day, month, year] = match;
                  parsedDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
                }
              }

              if (!parsedDate && (dateFormat === "YYYY/MM/DD" || dateFormat === "auto")) {
                const match = trimmedValue.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
                if (match) {
                  const [, year, month, day] = match;
                  parsedDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
                }
              }

              // Last resort: generic Date parse
              if (!parsedDate && dateFormat === "auto") {
                const attempt = new Date(trimmedValue);
                if (!isNaN(attempt.getTime())) parsedDate = attempt;
              }
            }

            if (parsedDate && !isNaN(parsedDate.getTime())) {
              const dateStr = parsedDate.toISOString().split('T')[0];
              if (targetField === "period_date") {
                // Single date: set both start and end
                reportRow["period_start"] = dateStr;
                reportRow["period_end"] = dateStr;
              } else {
                reportRow[targetField] = dateStr;
              }
            }
            continue;
          }

          if (typeof value === "string" && value.includes("%")) {
            // Percentage: "50,5%" -> 0.505
            value = parseFloat(value.replace("%", "").replace(",", ".").trim()) / 100;
          } else if (typeof value === "string" && (value.includes("R$") || value.includes("$"))) {
            // Currency with thousand separators: "R$ 1.234,56" -> 1234.56
            value = parseFloat(
              value
                .replace(/[R$\s]/g, "")
                .replace(/\./g, "")
                .replace(",", "."),
            );
          } else if (typeof value === "string") {
            // Smart number parsing for Brazilian/European format
            const cleanValue = value.replace(/\s/g, "").trim();
            
            // Check if value has both dots and commas (e.g., "1.234,56" or "1,234.56")
            const hasDot = cleanValue.includes(".");
            const hasComma = cleanValue.includes(",");
            
            if (hasDot && hasComma) {
              // Both present: determine which is decimal separator
              const lastDotPos = cleanValue.lastIndexOf(".");
              const lastCommaPos = cleanValue.lastIndexOf(",");
              
              if (lastCommaPos > lastDotPos) {
                // Comma is decimal: "1.234,56" -> 1234.56
                value = parseFloat(cleanValue.replace(/\./g, "").replace(",", "."));
              } else {
                // Dot is decimal: "1,234.56" -> 1234.56
                value = parseFloat(cleanValue.replace(/,/g, ""));
              }
            } else if (hasComma && !hasDot) {
              // Only comma: could be decimal "278,28" or thousand "1,234"
              // If comma is followed by exactly 2 digits at end, treat as decimal
              const commaMatch = cleanValue.match(/,(\d+)$/);
              if (commaMatch && commaMatch[1].length <= 2) {
                // Decimal separator: "278,28" -> 278.28
                value = parseFloat(cleanValue.replace(",", "."));
              } else {
                // Thousand separator: "1,234" -> 1234
                value = parseFloat(cleanValue.replace(/,/g, ""));
              }
            } else if (hasDot && !hasComma) {
              // Only dot: standard float "278.28" -> 278.28
              value = parseFloat(cleanValue);
            } else {
              // No separators: just parse
              value = parseFloat(cleanValue);
            }
          }

          if (typeof value === "number" && Number.isFinite(value)) {
            reportRow[targetField] = value;
          }
        }
      }

      const normalizedLineCode = lineCode.toLowerCase().trim();
      const mediaLineId = lineCodeToId[normalizedLineCode];

      if (mediaLineId) {
        reportRow.media_line_id = mediaLineId;
        reportRow.match_status = "matched";
        matchedCount++;
      } else {
        reportRow.match_status = "unmatched";
        unmatchedCount++;
      }

      reportDataRows.push(reportRow);
    }

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < reportDataRows.length; i += batchSize) {
      const batch = reportDataRows.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from("report_data").insert(batch);
      if (insertError) {
        console.error("Insert error:", JSON.stringify(insertError, null, 2));
        throw new Error(`Insert error: ${insertError.message}`);
      }
    }

    // Success status
    {
      const { error: successUpdErr } = await supabase
        .from("report_imports")
        .update({
          import_status: "success",
          last_import_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", import_id);

      if (successUpdErr) throw new Error(`Failed to set import status to success: ${successUpdErr.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_rows: reportDataRows.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Import error:", errorMessage);

    // IMPORTANT: do not read req body here; use importIdForError captured earlier
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseServiceKey && importIdForError) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from("report_imports")
          .update({ import_status: "error", error_message: errorMessage })
          .eq("id", importIdForError);
      }
    } catch (e) {
      console.error("Failed to update import status:", e);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
