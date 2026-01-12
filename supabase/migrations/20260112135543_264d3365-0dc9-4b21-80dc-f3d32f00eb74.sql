-- Add hierarchy_order column to media_plans table
-- This allows users to choose the order of budget divisions (subdivision, moment, funnel_stage)

ALTER TABLE public.media_plans 
ADD COLUMN hierarchy_order text[] DEFAULT ARRAY['subdivision', 'moment', 'funnel_stage'];

-- Update existing records to have the default order
UPDATE public.media_plans 
SET hierarchy_order = ARRAY['subdivision', 'moment', 'funnel_stage']
WHERE hierarchy_order IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.media_plans.hierarchy_order IS 'Order of budget hierarchy levels. Valid values: subdivision, moment, funnel_stage';