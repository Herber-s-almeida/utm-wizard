-- Add column to distinguish auto-backups from manual versions
ALTER TABLE public.media_plan_versions 
ADD COLUMN is_auto_backup BOOLEAN NOT NULL DEFAULT false;

-- Add index for efficient cleanup queries
CREATE INDEX idx_media_plan_versions_auto_backup_date 
ON public.media_plan_versions (is_auto_backup, created_at) 
WHERE is_auto_backup = true;

-- Function to create auto-backup snapshot (similar to manual but marked as auto)
CREATE OR REPLACE FUNCTION public.create_auto_backup_snapshot(
  _plan_id UUID,
  _user_id UUID,
  _change_description TEXT DEFAULT 'Alteração automática'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _version_id UUID;
  _snapshot JSONB;
  _last_backup TIMESTAMPTZ;
BEGIN
  -- Check if there was a backup in the last 30 seconds to avoid duplicates
  SELECT created_at INTO _last_backup
  FROM media_plan_versions
  WHERE media_plan_id = _plan_id
    AND is_auto_backup = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF _last_backup IS NOT NULL AND _last_backup > NOW() - INTERVAL '30 seconds' THEN
    -- Skip if recent backup exists
    RETURN NULL;
  END IF;

  -- Build snapshot
  SELECT jsonb_build_object(
    'plan', row_to_json(p),
    'lines', COALESCE((
      SELECT jsonb_agg(row_to_json(l))
      FROM media_lines l
      WHERE l.media_plan_id = _plan_id
    ), '[]'::jsonb),
    'distributions', COALESCE((
      SELECT jsonb_agg(row_to_json(d))
      FROM plan_budget_distributions d
      WHERE d.media_plan_id = _plan_id
    ), '[]'::jsonb),
    'monthly_budgets', COALESCE((
      SELECT jsonb_agg(row_to_json(mb))
      FROM media_line_monthly_budgets mb
      JOIN media_lines ml ON mb.media_line_id = ml.id
      WHERE ml.media_plan_id = _plan_id
    ), '[]'::jsonb)
  ) INTO _snapshot
  FROM media_plans p
  WHERE p.id = _plan_id;

  -- Insert auto-backup version
  INSERT INTO media_plan_versions (
    media_plan_id,
    created_by,
    snapshot_data,
    change_log,
    is_auto_backup,
    is_active
  )
  VALUES (
    _plan_id,
    _user_id,
    _snapshot,
    _change_description,
    true,
    false
  )
  RETURNING id INTO _version_id;

  RETURN _version_id;
END;
$$;

-- Function to cleanup old auto-backups (older than 15 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_auto_backups()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted_count INTEGER;
BEGIN
  DELETE FROM media_plan_versions
  WHERE is_auto_backup = true
    AND created_at < NOW() - INTERVAL '15 days';
  
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  RETURN _deleted_count;
END;
$$;

-- Trigger function for media_plans changes
CREATE OR REPLACE FUNCTION public.trigger_auto_backup_on_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _change_desc TEXT;
BEGIN
  -- Build change description based on what changed
  _change_desc := 'Plano atualizado';
  
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    _change_desc := 'Nome do plano alterado';
  ELSIF OLD.total_budget IS DISTINCT FROM NEW.total_budget THEN
    _change_desc := 'Orçamento total alterado';
  ELSIF OLD.start_date IS DISTINCT FROM NEW.start_date OR OLD.end_date IS DISTINCT FROM NEW.end_date THEN
    _change_desc := 'Datas do plano alteradas';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    _change_desc := 'Status alterado para ' || COALESCE(NEW.status, 'indefinido');
  ELSIF OLD.default_url IS DISTINCT FROM NEW.default_url THEN
    _change_desc := 'URL padrão alterada';
  END IF;

  -- Create auto-backup (async via background, but for now sync)
  PERFORM create_auto_backup_snapshot(NEW.id, NEW.user_id, _change_desc);
  
  RETURN NEW;
END;
$$;

-- Trigger function for media_lines changes
CREATE OR REPLACE FUNCTION public.trigger_auto_backup_on_line_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan_id UUID;
  _user_id UUID;
  _change_desc TEXT;
BEGIN
  -- Get plan_id and user_id
  IF TG_OP = 'DELETE' THEN
    _plan_id := OLD.media_plan_id;
    _user_id := OLD.user_id;
    _change_desc := 'Linha de mídia removida';
  ELSE
    _plan_id := NEW.media_plan_id;
    _user_id := NEW.user_id;
    
    IF TG_OP = 'INSERT' THEN
      _change_desc := 'Nova linha de mídia criada';
    ELSE
      -- UPDATE
      IF OLD.budget IS DISTINCT FROM NEW.budget THEN
        _change_desc := 'Orçamento da linha alterado';
      ELSIF OLD.start_date IS DISTINCT FROM NEW.start_date OR OLD.end_date IS DISTINCT FROM NEW.end_date THEN
        _change_desc := 'Datas da linha alteradas';
      ELSIF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
        _change_desc := 'Status da linha alterado';
      ELSE
        _change_desc := 'Linha de mídia atualizada';
      END IF;
    END IF;
  END IF;

  -- Create auto-backup
  PERFORM create_auto_backup_snapshot(_plan_id, _user_id, _change_desc);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers
CREATE TRIGGER auto_backup_on_plan_update
AFTER UPDATE ON public.media_plans
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION trigger_auto_backup_on_plan_change();

CREATE TRIGGER auto_backup_on_line_change
AFTER INSERT OR UPDATE OR DELETE ON public.media_lines
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_backup_on_line_change();

-- Update the manual version creation function to mark as non-auto-backup
CREATE OR REPLACE FUNCTION public.create_plan_version_snapshot(
  _plan_id UUID,
  _user_id UUID,
  _change_log TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _version_id UUID;
  _next_version INTEGER;
  _snapshot JSONB;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO _next_version
  FROM media_plan_versions
  WHERE media_plan_id = _plan_id
    AND is_auto_backup = false;

  -- Build snapshot
  SELECT jsonb_build_object(
    'plan', row_to_json(p),
    'lines', COALESCE((
      SELECT jsonb_agg(row_to_json(l))
      FROM media_lines l
      WHERE l.media_plan_id = _plan_id
    ), '[]'::jsonb),
    'distributions', COALESCE((
      SELECT jsonb_agg(row_to_json(d))
      FROM plan_budget_distributions d
      WHERE d.media_plan_id = _plan_id
    ), '[]'::jsonb),
    'monthly_budgets', COALESCE((
      SELECT jsonb_agg(row_to_json(mb))
      FROM media_line_monthly_budgets mb
      JOIN media_lines ml ON mb.media_line_id = ml.id
      WHERE ml.media_plan_id = _plan_id
    ), '[]'::jsonb)
  ) INTO _snapshot
  FROM media_plans p
  WHERE p.id = _plan_id;

  -- Mark previous active version as inactive
  UPDATE media_plan_versions
  SET is_active = false
  WHERE media_plan_id = _plan_id
    AND is_active = true
    AND is_auto_backup = false;

  -- Insert new manual version
  INSERT INTO media_plan_versions (
    media_plan_id,
    created_by,
    version_number,
    snapshot_data,
    change_log,
    is_active,
    is_auto_backup
  )
  VALUES (
    _plan_id,
    _user_id,
    _next_version,
    _snapshot,
    _change_log,
    true,
    false
  )
  RETURNING id INTO _version_id;

  RETURN _version_id;
END;
$$;