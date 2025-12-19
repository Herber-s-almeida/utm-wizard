-- Update media_lines table to reference library entities
ALTER TABLE public.media_lines
ADD COLUMN IF NOT EXISTS subdivision_id uuid REFERENCES public.plan_subdivisions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS moment_id uuid REFERENCES public.moments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS funnel_stage_id uuid REFERENCES public.funnel_stages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS medium_id uuid REFERENCES public.mediums(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS target_id uuid REFERENCES public.targets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS creative_template_id uuid REFERENCES public.creative_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS budget_allocation text DEFAULT 'campaign' CHECK (budget_allocation IN ('campaign', 'creative')),
ADD COLUMN IF NOT EXISTS percentage_of_plan numeric DEFAULT 0;

-- Create table for plan budget distributions (for wizard mode)
CREATE TABLE IF NOT EXISTS public.plan_budget_distributions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  distribution_type text NOT NULL CHECK (distribution_type IN ('subdivision', 'moment', 'funnel_stage', 'temporal')),
  reference_id uuid,
  parent_distribution_id uuid REFERENCES public.plan_budget_distributions(id) ON DELETE CASCADE,
  percentage numeric NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  amount numeric NOT NULL DEFAULT 0,
  temporal_period text,
  temporal_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on plan_budget_distributions
ALTER TABLE public.plan_budget_distributions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for plan_budget_distributions
CREATE POLICY "Users can CRUD own budget distributions"
ON public.plan_budget_distributions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add objective field to media_plans for storing campaign objectives
ALTER TABLE public.media_plans
ADD COLUMN IF NOT EXISTS objectives text[],
ADD COLUMN IF NOT EXISTS kpis jsonb DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_lines_subdivision ON public.media_lines(subdivision_id);
CREATE INDEX IF NOT EXISTS idx_media_lines_moment ON public.media_lines(moment_id);
CREATE INDEX IF NOT EXISTS idx_media_lines_funnel_stage ON public.media_lines(funnel_stage_id);
CREATE INDEX IF NOT EXISTS idx_media_lines_medium ON public.media_lines(medium_id);
CREATE INDEX IF NOT EXISTS idx_media_lines_vehicle ON public.media_lines(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_media_lines_target ON public.media_lines(target_id);
CREATE INDEX IF NOT EXISTS idx_budget_distributions_plan ON public.plan_budget_distributions(media_plan_id);
CREATE INDEX IF NOT EXISTS idx_budget_distributions_parent ON public.plan_budget_distributions(parent_distribution_id);