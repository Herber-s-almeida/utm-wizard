
-- Fix null environment_id in plan_budget_distributions by inheriting from parent media_plan
UPDATE plan_budget_distributions pbd
SET environment_id = mp.environment_id
FROM media_plans mp
WHERE pbd.media_plan_id = mp.id
AND pbd.environment_id IS NULL;

-- Fix null environment_id in media_line_monthly_budgets by inheriting from parent media_line
UPDATE media_line_monthly_budgets mlmb
SET environment_id = ml.environment_id
FROM media_lines ml
WHERE mlmb.media_line_id = ml.id
AND mlmb.environment_id IS NULL;

-- Fix null environment_id in media_creatives by inheriting from parent media_line
UPDATE media_creatives mc
SET environment_id = ml.environment_id
FROM media_lines ml
WHERE mc.media_line_id = ml.id
AND mc.environment_id IS NULL;

-- Create trigger to auto-populate environment_id on plan_budget_distributions
CREATE OR REPLACE FUNCTION public.set_environment_id_from_media_plan()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_set_env_id_plan_budget_distributions ON public.plan_budget_distributions;
CREATE TRIGGER trg_set_env_id_plan_budget_distributions
  BEFORE INSERT ON public.plan_budget_distributions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_environment_id_from_media_plan();

-- Create trigger to auto-populate environment_id on media_line_monthly_budgets from media_line
CREATE OR REPLACE FUNCTION public.set_environment_id_from_media_line()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_set_env_id_media_line_monthly_budgets ON public.media_line_monthly_budgets;
CREATE TRIGGER trg_set_env_id_media_line_monthly_budgets
  BEFORE INSERT ON public.media_line_monthly_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_environment_id_from_media_line();

DROP TRIGGER IF EXISTS trg_set_env_id_media_creatives ON public.media_creatives;
CREATE TRIGGER trg_set_env_id_media_creatives
  BEFORE INSERT ON public.media_creatives
  FOR EACH ROW
  EXECUTE FUNCTION public.set_environment_id_from_media_line();
