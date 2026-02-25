
-- Add color_scheme column to environments table
ALTER TABLE public.environments 
ADD COLUMN IF NOT EXISTS color_scheme text NOT NULL DEFAULT 'default';
