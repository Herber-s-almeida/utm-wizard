-- Add description fields to configuration tables
ALTER TABLE public.plan_subdivisions 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.moments 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.funnel_stages 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.mediums 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update targets table for more detailed geolocation
-- geolocation will store: { city, state, radius, radiusUnit } arrays

-- Update creative_templates for multiple dimensions
ALTER TABLE public.creative_templates 
ADD COLUMN IF NOT EXISTS dimensions JSONB DEFAULT '[]'::jsonb;
-- dimensions will store array of { width, height, unit }

-- Add secundagem (duration) as a field already exists as 'duration'
-- Add required fields indicators - using existing fields