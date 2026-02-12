
-- Add detail_category enum type
DO $$ BEGIN
  CREATE TYPE public.detail_category AS ENUM ('ooh', 'radio', 'tv', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add detail_category column to line_detail_types
ALTER TABLE public.line_detail_types 
  ADD COLUMN IF NOT EXISTS detail_category public.detail_category DEFAULT 'custom';

-- Add days_of_week column to line_detail_items for multi-select weekdays
ALTER TABLE public.line_detail_items 
  ADD COLUMN IF NOT EXISTS days_of_week text[] DEFAULT NULL;

-- Add period columns to line_detail_items
ALTER TABLE public.line_detail_items 
  ADD COLUMN IF NOT EXISTS period_start date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS period_end date DEFAULT NULL;

-- Add format/creative reference columns to line_detail_items
ALTER TABLE public.line_detail_items 
  ADD COLUMN IF NOT EXISTS format_id uuid DEFAULT NULL REFERENCES public.formats(id),
  ADD COLUMN IF NOT EXISTS creative_id uuid DEFAULT NULL REFERENCES public.media_creatives(id) ON DELETE SET NULL;

-- Add status reference column to line_detail_items
ALTER TABLE public.line_detail_items 
  ADD COLUMN IF NOT EXISTS status_id uuid DEFAULT NULL REFERENCES public.statuses(id);

-- Create index on detail_category for efficient filtering
CREATE INDEX IF NOT EXISTS idx_line_detail_types_category ON public.line_detail_types(detail_category);
