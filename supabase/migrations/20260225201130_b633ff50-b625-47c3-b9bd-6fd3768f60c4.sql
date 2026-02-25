-- Add source_category column to report_imports
ALTER TABLE public.report_imports 
ADD COLUMN IF NOT EXISTS source_category text NOT NULL DEFAULT 'media';

-- Update existing data based on source_name
UPDATE public.report_imports SET source_category = 'analytics' WHERE LOWER(source_name) LIKE '%analytics%';
UPDATE public.report_imports SET source_category = 'media' WHERE LOWER(source_name) LIKE '%ads%' OR LOWER(source_name) LIKE '%meta%' OR LOWER(source_name) LIKE '%facebook%' OR LOWER(source_name) LIKE '%google ads%';
UPDATE public.report_imports SET source_category = 'conversions' WHERE LOWER(source_name) LIKE '%crm%' OR LOWER(source_name) LIKE '%lead%' OR LOWER(source_name) LIKE '%venda%';
UPDATE public.report_imports SET source_category = 'social_organic' WHERE LOWER(source_name) LIKE '%orgânico%' OR LOWER(source_name) LIKE '%organic%';