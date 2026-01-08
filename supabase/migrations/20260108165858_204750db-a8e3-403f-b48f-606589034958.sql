-- Add slug column to media_plans
ALTER TABLE public.media_plans 
ADD COLUMN slug TEXT;

-- Create unique index for slug per user (allowing different users to have same slug)
CREATE UNIQUE INDEX idx_media_plans_user_slug 
ON public.media_plans (user_id, slug) 
WHERE deleted_at IS NULL;

-- Function to generate unique slug for media plans
CREATE OR REPLACE FUNCTION public.generate_unique_plan_slug(p_user_id UUID, p_name TEXT, p_current_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
  exists_count INTEGER;
BEGIN
  -- Generate base slug from name
  base_slug := public.generate_slug(p_name);
  
  -- If empty, use 'plano'
  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'plano';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add suffix if needed
  LOOP
    SELECT COUNT(*) INTO exists_count 
    FROM public.media_plans 
    WHERE user_id = p_user_id 
      AND slug = final_slug 
      AND deleted_at IS NULL
      AND (p_current_id IS NULL OR id != p_current_id);
    
    IF exists_count = 0 THEN
      RETURN final_slug;
    END IF;
    
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
END;
$$;

-- Trigger function to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION public.auto_generate_plan_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Generate slug if name changed or slug is null
  IF NEW.slug IS NULL OR OLD.name IS DISTINCT FROM NEW.name THEN
    NEW.slug := public.generate_unique_plan_slug(NEW.user_id, NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating slug
CREATE TRIGGER auto_generate_media_plan_slug
BEFORE INSERT OR UPDATE ON public.media_plans
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_plan_slug();

-- Update existing plans with slugs
DO $$
DECLARE
  plan_record RECORD;
BEGIN
  FOR plan_record IN 
    SELECT id, user_id, name FROM public.media_plans WHERE slug IS NULL
  LOOP
    UPDATE public.media_plans 
    SET slug = public.generate_unique_plan_slug(plan_record.user_id, plan_record.name, plan_record.id)
    WHERE id = plan_record.id;
  END LOOP;
END;
$$;