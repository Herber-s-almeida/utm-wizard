-- Disable auto-backup trigger on DELETE operations to prevent snapshot creation during deletion
-- The trigger should only fire on UPDATE, not DELETE

DROP TRIGGER IF EXISTS trigger_auto_backup_on_plan_change ON public.media_plans;

CREATE TRIGGER trigger_auto_backup_on_plan_change
AFTER UPDATE ON public.media_plans
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION public.trigger_auto_backup_on_plan_change();

-- Also ensure media_plan_versions cascade delete when media_plan is deleted
ALTER TABLE public.media_plan_versions
DROP CONSTRAINT IF EXISTS media_plan_versions_media_plan_id_fkey;

ALTER TABLE public.media_plan_versions
ADD CONSTRAINT media_plan_versions_media_plan_id_fkey
FOREIGN KEY (media_plan_id)
REFERENCES public.media_plans(id)
ON DELETE CASCADE;