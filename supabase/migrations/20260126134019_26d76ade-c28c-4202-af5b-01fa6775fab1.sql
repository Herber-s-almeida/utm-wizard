-- 1) Prevent null snapshot_data writes during cascaded deletes
-- If the plan row no longer exists (hard delete in progress), skip snapshot creation.

CREATE OR REPLACE FUNCTION public.create_auto_backup_snapshot(
  _plan_id uuid,
  _user_id uuid,
  _change_description text DEFAULT 'Alteração automática'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _version_id UUID;
  _snapshot JSONB;
  _last_backup TIMESTAMPTZ;
  _next_version INTEGER;
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

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO _next_version
  FROM media_plan_versions
  WHERE media_plan_id = _plan_id;

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

  -- If plan is missing (e.g. cascaded hard-delete), do NOT attempt to insert a version
  IF _snapshot IS NULL THEN
    RETURN NULL;
  END IF;

  -- Insert auto-backup version with conflict handling
  INSERT INTO media_plan_versions (
    media_plan_id,
    created_by,
    version_number,
    snapshot_data,
    change_log,
    is_auto_backup,
    is_active
  )
  VALUES (
    _plan_id,
    _user_id,
    _next_version,
    _snapshot,
    _change_description,
    true,
    false
  )
  ON CONFLICT (media_plan_id, version_number) DO NOTHING
  RETURNING id INTO _version_id;

  RETURN _version_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_plan_version_snapshot(
  _plan_id uuid,
  _user_id uuid,
  _change_log text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _version_id UUID;
  _next_version INTEGER;
  _snapshot JSONB;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO _next_version
  FROM media_plan_versions
  WHERE media_plan_id = _plan_id;

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

  -- If plan is missing, skip
  IF _snapshot IS NULL THEN
    RETURN NULL;
  END IF;

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
  ON CONFLICT (media_plan_id, version_number) DO UPDATE SET
    snapshot_data = EXCLUDED.snapshot_data,
    change_log = EXCLUDED.change_log,
    is_active = EXCLUDED.is_active,
    created_at = now()
  RETURNING id INTO _version_id;

  RETURN _version_id;
END;
$$;

-- 2) Fix linter: RLS enabled but no policies (plan_custom_kpis)
-- Access should follow plan permissions.

DROP POLICY IF EXISTS "Users can view plan custom kpis" ON public.plan_custom_kpis;
DROP POLICY IF EXISTS "Users can insert plan custom kpis" ON public.plan_custom_kpis;
DROP POLICY IF EXISTS "Users can update plan custom kpis" ON public.plan_custom_kpis;
DROP POLICY IF EXISTS "Users can delete plan custom kpis" ON public.plan_custom_kpis;

CREATE POLICY "Users can view plan custom kpis"
ON public.plan_custom_kpis
FOR SELECT
USING (public.can_view_plan(media_plan_id));

CREATE POLICY "Users can insert plan custom kpis"
ON public.plan_custom_kpis
FOR INSERT
WITH CHECK (public.can_edit_plan(media_plan_id));

CREATE POLICY "Users can update plan custom kpis"
ON public.plan_custom_kpis
FOR UPDATE
USING (public.can_edit_plan(media_plan_id))
WITH CHECK (public.can_edit_plan(media_plan_id));

CREATE POLICY "Users can delete plan custom kpis"
ON public.plan_custom_kpis
FOR DELETE
USING (public.can_edit_plan(media_plan_id));

-- 3) Fix linter: RLS policy always true (system_access_requests)
-- Allow public creation but with a strict check to avoid permissive WITH CHECK (true)

DROP POLICY IF EXISTS "Anyone can create access requests" ON public.system_access_requests;

CREATE POLICY "Anyone can create access requests"
ON public.system_access_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND email IS NOT NULL
  AND full_name IS NOT NULL
);
