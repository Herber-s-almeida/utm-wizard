

# Fix: Editing Existing Data Sources for Column Mapping Review

## Problem

When clicking the edit button on an existing data source, the `ImportConfigDialog` jumps to step 3 (mapping) but the `headers` state is empty because the spreadsheet preview was never loaded. This means the mapping UI renders an empty list -- effectively broken.

## Root Cause

In `ImportConfigDialog.tsx`, line 62: `setStep(existingImportId ? 'mapping' : 'url')` skips the preview fetch entirely. The `headers` state stays as `[]`, so the mapping loop `headers.map(...)` renders nothing.

## Solution

When opening the dialog to edit an existing source:
1. Start at the URL step with the existing URL pre-filled
2. Auto-trigger a preview fetch so the headers load
3. Then allow the user to proceed to mapping with their existing mappings pre-applied
4. Also allow updating the source URL and name on the existing record (instead of creating a new one)

## Detailed Changes

### 1. `ImportConfigDialog.tsx` -- Fix edit flow

**useEffect (open):**
- Always start at `'url'` step, even when editing
- Pre-fill `sourceUrl` and `sourceName` from the existing import
- After a short delay, auto-trigger `handleFetchPreview` so the user sees the preview immediately
- When existing mappings are provided, apply them after headers load (merge with auto-detected)

**New: handleUpdateImportAndProceed function:**
- When `existingImportId` is set, UPDATE the existing `report_imports` row (URL, name) instead of creating a new one
- Then proceed to mapping step

**Modify handleCreateImportAndProceed:**
- If `existingImportId` exists, call update logic instead of insert
- Set `importId` from existing ID

**Mapping step adjustments:**
- Merge existing mappings with auto-detected ones (existing take priority)
- Show "Voltar" button to go back to preview

### 2. `MediaPlanReports.tsx` -- Pass source name to dialog

- Pass `existingName={selectedImport?.source_name}` prop so the name field is also pre-filled when editing

### 3. `useReportData.ts` -- Add update mutation

- Add `useUpdateReportImport` mutation that updates `source_url` and `source_name` on an existing `report_imports` row

## Technical Details

**Files to modify:**
- `src/components/reports/ImportConfigDialog.tsx` -- main fix: load preview when editing, update instead of create
- `src/pages/MediaPlanReports.tsx` -- pass `existingName` prop
- `src/hooks/useReportData.ts` -- add `useUpdateReportImport` mutation

**Flow after fix:**
1. User clicks edit on existing source
2. Dialog opens at URL step with URL and name pre-filled
3. User clicks "Carregar Preview" (or it auto-loads)
4. Preview shows with existing mappings pre-applied
5. User proceeds to mapping, adjusts if needed
6. "Importar Dados" updates the existing record and re-runs import
