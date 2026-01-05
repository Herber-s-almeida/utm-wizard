-- Add default_url column to media_plans
ALTER TABLE public.media_plans 
ADD COLUMN IF NOT EXISTS default_url TEXT;