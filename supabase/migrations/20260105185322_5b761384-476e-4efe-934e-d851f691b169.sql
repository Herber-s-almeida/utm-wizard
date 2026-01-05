-- Function to build utm_campaign from line data
CREATE OR REPLACE FUNCTION public.build_utm_campaign_string(
  p_line_code TEXT,
  p_campaign_name TEXT,
  p_subdivision_slug TEXT,
  p_moment_slug TEXT,
  p_funnel_slug TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN LOWER(
    CONCAT_WS('_',
      NULLIF(TRIM(COALESCE(p_line_code, '')), ''),
      NULLIF(public.generate_slug(COALESCE(p_campaign_name, '')), ''),
      NULLIF(TRIM(COALESCE(p_subdivision_slug, '')), ''),
      NULLIF(TRIM(COALESCE(p_moment_slug, '')), ''),
      NULLIF(TRIM(COALESCE(p_funnel_slug, '')), '')
    )
  );
END;
$$;

-- Trigger function to auto-generate UTM fields on media_lines
CREATE OR REPLACE FUNCTION public.auto_generate_line_utm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vehicle_slug TEXT;
  v_channel_slug TEXT;
  v_subdivision_slug TEXT;
  v_moment_slug TEXT;
  v_funnel_slug TEXT;
  v_campaign_name TEXT;
BEGIN
  -- Get vehicle slug
  IF NEW.vehicle_id IS NOT NULL THEN
    SELECT slug INTO v_vehicle_slug FROM public.vehicles WHERE id = NEW.vehicle_id;
  END IF;
  
  -- Get channel slug
  IF NEW.channel_id IS NOT NULL THEN
    SELECT slug INTO v_channel_slug FROM public.channels WHERE id = NEW.channel_id;
  END IF;
  
  -- Get subdivision slug
  IF NEW.subdivision_id IS NOT NULL THEN
    SELECT slug INTO v_subdivision_slug FROM public.plan_subdivisions WHERE id = NEW.subdivision_id;
  END IF;
  
  -- Get moment slug
  IF NEW.moment_id IS NOT NULL THEN
    SELECT slug INTO v_moment_slug FROM public.moments WHERE id = NEW.moment_id;
  END IF;
  
  -- Get funnel stage slug
  IF NEW.funnel_stage_id IS NOT NULL THEN
    SELECT slug INTO v_funnel_slug FROM public.funnel_stages WHERE id = NEW.funnel_stage_id;
  END IF;
  
  -- Get campaign name from media plan
  SELECT campaign INTO v_campaign_name FROM public.media_plans WHERE id = NEW.media_plan_id;
  
  -- Set UTM source from vehicle slug
  NEW.utm_source := COALESCE(v_vehicle_slug, NEW.utm_source);
  
  -- Set UTM medium from channel slug
  NEW.utm_medium := COALESCE(v_channel_slug, NEW.utm_medium);
  
  -- Build and set UTM campaign
  NEW.utm_campaign := public.build_utm_campaign_string(
    NEW.line_code,
    v_campaign_name,
    v_subdivision_slug,
    v_moment_slug,
    v_funnel_slug
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto UTM generation
DROP TRIGGER IF EXISTS trigger_auto_generate_utm ON public.media_lines;
CREATE TRIGGER trigger_auto_generate_utm
  BEFORE INSERT OR UPDATE ON public.media_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_line_utm();