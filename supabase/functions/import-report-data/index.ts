import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ColumnMapping {
  source_column: string;
  target_field: string;
}

interface ImportRequest {
  import_id: string;
  media_plan_id: string;
  source_url: string;
  mappings: ColumnMapping[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ImportRequest = await req.json();
    const { import_id, media_plan_id, source_url, mappings } = body;

    console.log(`Starting import for plan ${media_plan_id}, import ${import_id}`);
    console.log(`Source URL: ${source_url}`);
    console.log(`Mappings count: ${mappings.length}`);

    // Update import status to processing
    await supabase
      .from("report_imports")
      .update({ import_status: "processing" })
      .eq("id", import_id);

    // Fetch XLSX from URL
    console.log("Fetching XLSX file...");
    const xlsxResponse = await fetch(source_url);
    
    if (!xlsxResponse.ok) {
      throw new Error(`Failed to fetch XLSX: ${xlsxResponse.status} ${xlsxResponse.statusText}`);
    }

    const arrayBuffer = await xlsxResponse.arrayBuffer();
    console.log(`Downloaded ${arrayBuffer.byteLength} bytes`);

    // Parse XLSX using SheetJS via CDN
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (jsonData.length < 2) {
      throw new Error("XLSX file must have at least a header row and one data row");
    }

    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1);

    console.log(`Found ${headers.length} columns and ${dataRows.length} data rows`);
    console.log(`Headers: ${headers.join(", ")}`);

    // Build mapping index
    const mappingIndex: Record<string, string> = {};
    for (const mapping of mappings) {
      const sourceIndex = headers.findIndex(
        (h) => h?.toString().toLowerCase().trim() === mapping.source_column.toLowerCase().trim()
      );
      if (sourceIndex !== -1) {
        mappingIndex[sourceIndex.toString()] = mapping.target_field;
      }
    }

    // Find line_code column
    const lineCodeMapping = mappings.find((m) => m.target_field === "line_code");
    if (!lineCodeMapping) {
      throw new Error("line_code mapping is required");
    }
    const lineCodeIndex = headers.findIndex(
      (h) => h?.toString().toLowerCase().trim() === lineCodeMapping.source_column.toLowerCase().trim()
    );

    if (lineCodeIndex === -1) {
      throw new Error(`Column "${lineCodeMapping.source_column}" not found in XLSX`);
    }

    // Fetch existing media lines for matching
    const { data: mediaLines } = await supabase
      .from("media_lines")
      .select("id, line_code")
      .eq("media_plan_id", media_plan_id);

    const lineCodeToId: Record<string, string> = {};
    for (const line of mediaLines || []) {
      if (line.line_code) {
        lineCodeToId[line.line_code.toLowerCase().trim()] = line.id;
      }
    }

    console.log(`Found ${Object.keys(lineCodeToId).length} media lines with line_code`);

    // Delete previous report data for this import
    await supabase
      .from("report_data")
      .delete()
      .eq("import_id", import_id);

    // Process each row
    const reportDataRows = [];
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const row of dataRows) {
      const lineCode = row[lineCodeIndex]?.toString()?.trim();
      if (!lineCode) continue;

      const reportRow: Record<string, any> = {
        import_id,
        media_plan_id,
        line_code: lineCode,
        raw_data: {},
      };

      // Extract values based on mappings
      for (const [indexStr, targetField] of Object.entries(mappingIndex)) {
        const index = parseInt(indexStr);
        let value = row[index];
        
        // Store raw value
        reportRow.raw_data[headers[index]] = value;

        // Skip line_code as it's already set
        if (targetField === "line_code") continue;

        // Parse numeric values
        if (value !== undefined && value !== null && value !== "") {
          // Handle percentage strings
          if (typeof value === "string" && value.includes("%")) {
            value = parseFloat(value.replace("%", "").replace(",", ".")) / 100;
          }
          // Handle currency strings
          else if (typeof value === "string" && (value.includes("R$") || value.includes("$"))) {
            value = parseFloat(value.replace(/[R$\s.]/g, "").replace(",", "."));
          }
          // Handle regular numbers with comma as decimal separator
          else if (typeof value === "string") {
            value = parseFloat(value.replace(",", "."));
          }
          
          if (!isNaN(value)) {
            reportRow[targetField] = value;
          }
        }
      }

      // Try to match with media line
      const normalizedLineCode = lineCode.toLowerCase().trim();
      if (lineCodeToId[normalizedLineCode]) {
        reportRow.media_line_id = lineCodeToId[normalizedLineCode];
        reportRow.match_status = "matched";
        matchedCount++;
      } else {
        reportRow.match_status = "unmatched";
        unmatchedCount++;
      }

      reportDataRows.push(reportRow);
    }

    console.log(`Processed ${reportDataRows.length} rows: ${matchedCount} matched, ${unmatchedCount} unmatched`);

    // Insert report data in batches
    const batchSize = 100;
    for (let i = 0; i < reportDataRows.length; i += batchSize) {
      const batch = reportDataRows.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from("report_data")
        .insert(batch);

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
    }

    // Update import status to success
    await supabase
      .from("report_imports")
      .update({
        import_status: "success",
        last_import_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", import_id);

    console.log("Import completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        total_rows: reportDataRows.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Import error:", errorMessage);

    // Try to update import status to error
    try {
      const body = await req.clone().json();
      if (body.import_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase
          .from("report_imports")
          .update({
            import_status: "error",
            error_message: errorMessage,
          })
          .eq("id", body.import_id);
      }
    } catch (e) {
      console.error("Failed to update import status:", e);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});