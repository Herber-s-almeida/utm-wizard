-- Corrige a exclusão de ambientes para não falhar no gatilho de último administrador
-- Quando a linha de environment_roles está sendo removida por causa da exclusão do ambiente pai,
-- a validação deve ser ignorada.

CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_count INTEGER;
  environment_still_exists BOOLEAN;
BEGIN
  -- Se o ambiente já está sendo removido, não bloquear a exclusão em cascata dos papéis
  SELECT EXISTS (
    SELECT 1
    FROM public.environments
    WHERE id = OLD.environment_id
  ) INTO environment_still_exists;

  IF NOT environment_still_exists THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  -- Se está removendo ou rebaixando um admin, garantir que reste ao menos outro admin aceito
  IF (TG_OP = 'DELETE' AND OLD.is_environment_admin = true)
     OR (TG_OP = 'UPDATE' AND OLD.is_environment_admin = true AND NEW.is_environment_admin = false) THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.environment_roles
    WHERE environment_id = OLD.environment_id
      AND user_id != OLD.user_id
      AND is_environment_admin = true
      AND accepted_at IS NOT NULL;

    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Não é possível remover o último administrador do ambiente';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;