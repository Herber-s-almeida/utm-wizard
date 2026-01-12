-- Add visibility column for media plans
ALTER TABLE public.clients 
ADD COLUMN visible_for_media_plans boolean DEFAULT true;

-- Update all existing clients to be visible for media plans
UPDATE public.clients SET visible_for_media_plans = true WHERE visible_for_media_plans IS NULL;