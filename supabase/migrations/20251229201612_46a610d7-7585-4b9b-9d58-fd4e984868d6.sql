
-- Create function to generate slugs
CREATE OR REPLACE FUNCTION public.generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          TRANSLATE(
            COALESCE(input_text, ''),
            'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ',
            'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
          ),
          '\s+', '-', 'g'
        ),
        '[^a-zA-Z0-9-]', '', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Add slug columns to all library tables
ALTER TABLE public.plan_subdivisions ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.moments ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.funnel_stages ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.mediums ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.formats ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add UTM validation fields to media_lines
ALTER TABLE public.media_lines ADD COLUMN IF NOT EXISTS utm_validated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.media_lines ADD COLUMN IF NOT EXISTS utm_validated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.media_lines ADD COLUMN IF NOT EXISTS utm_validated_by UUID;

-- Create trigger function to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION public.auto_generate_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL AND (NEW.slug IS NULL OR OLD.name IS DISTINCT FROM NEW.name) THEN
    NEW.slug := public.generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for each table
DROP TRIGGER IF EXISTS auto_slug_plan_subdivisions ON public.plan_subdivisions;
CREATE TRIGGER auto_slug_plan_subdivisions
  BEFORE INSERT OR UPDATE ON public.plan_subdivisions
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_slug();

DROP TRIGGER IF EXISTS auto_slug_moments ON public.moments;
CREATE TRIGGER auto_slug_moments
  BEFORE INSERT OR UPDATE ON public.moments
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_slug();

DROP TRIGGER IF EXISTS auto_slug_funnel_stages ON public.funnel_stages;
CREATE TRIGGER auto_slug_funnel_stages
  BEFORE INSERT OR UPDATE ON public.funnel_stages
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_slug();

DROP TRIGGER IF EXISTS auto_slug_mediums ON public.mediums;
CREATE TRIGGER auto_slug_mediums
  BEFORE INSERT OR UPDATE ON public.mediums
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_slug();

DROP TRIGGER IF EXISTS auto_slug_vehicles ON public.vehicles;
CREATE TRIGGER auto_slug_vehicles
  BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_slug();

DROP TRIGGER IF EXISTS auto_slug_channels ON public.channels;
CREATE TRIGGER auto_slug_channels
  BEFORE INSERT OR UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_slug();

DROP TRIGGER IF EXISTS auto_slug_targets ON public.targets;
CREATE TRIGGER auto_slug_targets
  BEFORE INSERT OR UPDATE ON public.targets
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_slug();

DROP TRIGGER IF EXISTS auto_slug_formats ON public.formats;
CREATE TRIGGER auto_slug_formats
  BEFORE INSERT OR UPDATE ON public.formats
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_slug();

-- Migrate existing data - populate slugs for existing records
UPDATE public.plan_subdivisions SET slug = public.generate_slug(name) WHERE slug IS NULL;
UPDATE public.moments SET slug = public.generate_slug(name) WHERE slug IS NULL;
UPDATE public.funnel_stages SET slug = public.generate_slug(name) WHERE slug IS NULL;
UPDATE public.mediums SET slug = public.generate_slug(name) WHERE slug IS NULL;
UPDATE public.vehicles SET slug = public.generate_slug(name) WHERE slug IS NULL;
UPDATE public.channels SET slug = public.generate_slug(name) WHERE slug IS NULL;
UPDATE public.targets SET slug = public.generate_slug(name) WHERE slug IS NULL;
UPDATE public.formats SET slug = public.generate_slug(name) WHERE slug IS NULL;

-- Update existing media_plans without campaign to have a default (so we can make it required)
UPDATE public.media_plans SET campaign = name WHERE campaign IS NULL OR campaign = '';
