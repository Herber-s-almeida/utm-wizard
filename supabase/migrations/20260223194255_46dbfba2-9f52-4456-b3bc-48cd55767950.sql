
-- Update create_plan_version_snapshot to include line_details and line_detail_line_links
CREATE OR REPLACE FUNCTION public.create_plan_version_snapshot(_plan_id uuid, _user_id uuid, _change_log text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _version_id UUID;
  _next_version INTEGER;
  _snapshot JSONB;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO _next_version
  FROM media_plan_versions
  WHERE media_plan_id = _plan_id;

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
    ), '[]'::jsonb),
    'line_details', COALESCE((
      SELECT jsonb_agg(row_to_json(ld))
      FROM line_details ld
      WHERE ld.media_plan_id = _plan_id
    ), '[]'::jsonb),
    'line_detail_items', COALESCE((
      SELECT jsonb_agg(row_to_json(ldi))
      FROM line_detail_items ldi
      JOIN line_details ld ON ld.id = ldi.line_detail_id
      WHERE ld.media_plan_id = _plan_id
    ), '[]'::jsonb),
    'line_detail_links', COALESCE((
      SELECT jsonb_agg(row_to_json(ldl))
      FROM line_detail_line_links ldl
      JOIN line_details ld ON ld.id = ldl.line_detail_id
      WHERE ld.media_plan_id = _plan_id
    ), '[]'::jsonb)
  ) INTO _snapshot
  FROM media_plans p
  WHERE p.id = _plan_id;

  IF _snapshot IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE media_plan_versions
  SET is_active = false
  WHERE media_plan_id = _plan_id
    AND is_active = true
    AND is_auto_backup = false;

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
$function$;

-- Update create_auto_backup_snapshot to include line_details and line_detail_line_links
CREATE OR REPLACE FUNCTION public.create_auto_backup_snapshot(_plan_id uuid, _user_id uuid, _change_description text DEFAULT 'Alteração automática'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _version_id UUID;
  _snapshot JSONB;
  _last_backup TIMESTAMPTZ;
  _next_version INTEGER;
BEGIN
  SELECT created_at INTO _last_backup
  FROM media_plan_versions
  WHERE media_plan_id = _plan_id
    AND is_auto_backup = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF _last_backup IS NOT NULL AND _last_backup > NOW() - INTERVAL '30 seconds' THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO _next_version
  FROM media_plan_versions
  WHERE media_plan_id = _plan_id;

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
    ), '[]'::jsonb),
    'line_details', COALESCE((
      SELECT jsonb_agg(row_to_json(ld))
      FROM line_details ld
      WHERE ld.media_plan_id = _plan_id
    ), '[]'::jsonb),
    'line_detail_items', COALESCE((
      SELECT jsonb_agg(row_to_json(ldi))
      FROM line_detail_items ldi
      JOIN line_details ld ON ld.id = ldi.line_detail_id
      WHERE ld.media_plan_id = _plan_id
    ), '[]'::jsonb),
    'line_detail_links', COALESCE((
      SELECT jsonb_agg(row_to_json(ldl))
      FROM line_detail_line_links ldl
      JOIN line_details ld ON ld.id = ldl.line_detail_id
      WHERE ld.media_plan_id = _plan_id
    ), '[]'::jsonb)
  ) INTO _snapshot
  FROM media_plans p
  WHERE p.id = _plan_id;

  IF _snapshot IS NULL THEN
    RETURN NULL;
  END IF;

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
$function$;
