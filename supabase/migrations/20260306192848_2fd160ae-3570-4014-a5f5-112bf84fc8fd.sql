
-- Fix search_path for the two new functions
CREATE OR REPLACE FUNCTION public.set_environment_id_from_media_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.environment_id IS NULL AND NEW.media_plan_id IS NOT NULL THEN
    SELECT environment_id INTO NEW.environment_id
    FROM public.media_plans
    WHERE id = NEW.media_plan_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_environment_id_from_media_line()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.environment_id IS NULL AND NEW.media_line_id IS NOT NULL THEN
    SELECT environment_id INTO NEW.environment_id
    FROM public.media_lines
    WHERE id = NEW.media_line_id;
  END IF;
  RETURN NEW;
END;
$$;
