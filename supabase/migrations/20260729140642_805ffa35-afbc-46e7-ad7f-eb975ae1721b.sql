-- 1. Section-scoped write permission helper
CREATE OR REPLACE FUNCTION public.can_write_user_data_section(_owner_user_id uuid, _sections text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _owner_user_id = auth.uid()
    OR public.is_system_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.environment_members em
      WHERE em.environment_owner_id = _owner_user_id
        AND em.member_user_id = auth.uid()
        AND em.accepted_at IS NOT NULL
        AND (
          em.environment_role = 'admin'
          OR ('library' = ANY(_sections) AND em.perm_library IN ('edit','admin'))
          OR ('media_plans' = ANY(_sections) AND em.perm_media_plans IN ('edit','admin'))
          OR ('media_resources' = ANY(_sections) AND em.perm_media_resources IN ('edit','admin'))
          OR ('taxonomy' = ANY(_sections) AND em.perm_taxonomy IN ('edit','admin'))
          OR ('finance' = ANY(_sections) AND em.perm_finance IN ('edit','admin'))
        )
    )
$$;

-- Recreate INSERT policies with per-section scoping
DROP POLICY IF EXISTS "Users can insert custom kpis in accessible environments" ON public.custom_kpis;
CREATE POLICY "Users can insert custom kpis in accessible environments" ON public.custom_kpis
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['media_plans']));

DROP POLICY IF EXISTS "Users can insert format creative types in accessible environmen" ON public.format_creative_types;
CREATE POLICY "Users can insert format creative types in accessible environmen" ON public.format_creative_types
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['library','media_plans']));

DROP POLICY IF EXISTS "Users can insert funnel stages in accessible environments" ON public.funnel_stages;
CREATE POLICY "Users can insert funnel stages in accessible environments" ON public.funnel_stages
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['library','media_plans']));

DROP POLICY IF EXISTS "Users can create insertions in accessible environments" ON public.line_detail_insertions;
CREATE POLICY "Users can create insertions in accessible environments" ON public.line_detail_insertions
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['media_plans']));

DROP POLICY IF EXISTS "Users can insert line detail items in accessible environments" ON public.line_detail_items;
CREATE POLICY "Users can insert line detail items in accessible environments" ON public.line_detail_items
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['media_plans']));

DROP POLICY IF EXISTS "Users can insert line detail types in accessible environments" ON public.line_detail_types;
CREATE POLICY "Users can insert line detail types in accessible environments" ON public.line_detail_types
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['library','media_plans']));

DROP POLICY IF EXISTS "Users can insert line details in accessible environments" ON public.line_details;
CREATE POLICY "Users can insert line details in accessible environments" ON public.line_details
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['media_plans']));

DROP POLICY IF EXISTS "Users can create line targets in accessible environments" ON public.line_targets;
CREATE POLICY "Users can create line targets in accessible environments" ON public.line_targets
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['media_plans']));

DROP POLICY IF EXISTS "Users can insert creatives in accessible environments" ON public.media_creatives;
CREATE POLICY "Users can insert creatives in accessible environments" ON public.media_creatives
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['media_resources','media_plans']));

DROP POLICY IF EXISTS "Users can insert monthly budgets in accessible environments" ON public.media_line_monthly_budgets;
CREATE POLICY "Users can insert monthly budgets in accessible environments" ON public.media_line_monthly_budgets
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['media_plans']));

DROP POLICY IF EXISTS "Users can insert media lines in accessible environments" ON public.media_lines;
CREATE POLICY "Users can insert media lines in accessible environments" ON public.media_lines
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['media_plans']));

DROP POLICY IF EXISTS "Users can insert objectives in accessible environments" ON public.media_objectives;
CREATE POLICY "Users can insert objectives in accessible environments" ON public.media_objectives
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['library','media_plans']));

DROP POLICY IF EXISTS "Users can insert media plans in accessible environments" ON public.media_plans;
CREATE POLICY "Users can insert media plans in accessible environments" ON public.media_plans
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['media_plans']));

DROP POLICY IF EXISTS "Users can create distributions in accessible environments" ON public.plan_budget_distributions;
CREATE POLICY "Users can create distributions in accessible environments" ON public.plan_budget_distributions
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['media_plans']));

DROP POLICY IF EXISTS "Users can create subdivisions in accessible environments" ON public.plan_subdivisions;
CREATE POLICY "Users can create subdivisions in accessible environments" ON public.plan_subdivisions
FOR INSERT TO authenticated WITH CHECK (public.can_write_user_data_section(user_id, ARRAY['library','media_plans']));

DROP FUNCTION IF EXISTS public.can_access_user_data_for_write(uuid);

-- 2. creative_types: writes restricted to system admins
DROP POLICY IF EXISTS "Authenticated users can create creative types" ON public.creative_types;
DROP POLICY IF EXISTS "Authenticated users can update creative types" ON public.creative_types;
DROP POLICY IF EXISTS "Authenticated users can delete creative types" ON public.creative_types;
CREATE POLICY "System admins can create creative types" ON public.creative_types
FOR INSERT TO authenticated WITH CHECK (public.is_system_admin(auth.uid()));
CREATE POLICY "System admins can update creative types" ON public.creative_types
FOR UPDATE TO authenticated USING (public.is_system_admin(auth.uid())) WITH CHECK (public.is_system_admin(auth.uid()));
CREATE POLICY "System admins can delete creative types" ON public.creative_types
FOR DELETE TO authenticated USING (public.is_system_admin(auth.uid()));

-- 3. file_extensions: explicit admin-only update/delete
CREATE POLICY "System admins can update extensions" ON public.file_extensions
FOR UPDATE TO authenticated USING (public.is_system_admin(auth.uid())) WITH CHECK (public.is_system_admin(auth.uid()));
CREATE POLICY "System admins can delete extensions" ON public.file_extensions
FOR DELETE TO authenticated USING (public.is_system_admin(auth.uid()));

-- 4. Invite lookups via secure functions instead of open SELECT
DROP POLICY IF EXISTS "Anyone can check invites by email for registration" ON public.pending_environment_invites;

CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE(email text, environment_id uuid, environment_owner_id uuid, environment_name text, invite_type text, expires_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    pi.email,
    pi.environment_id,
    pi.environment_owner_id,
    COALESCE(e.name, p.company, p.full_name, 'Ambiente') AS environment_name,
    pi.invite_type,
    pi.expires_at
  FROM public.pending_environment_invites pi
  LEFT JOIN public.environments e ON e.id = pi.environment_id
  LEFT JOIN public.profiles p ON p.user_id = pi.environment_owner_id
  WHERE pi.invite_token = _token
    AND pi.status = 'invited'
    AND pi.expires_at > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_invite_by_email(_email text)
RETURNS TABLE(environment_id uuid, environment_owner_id uuid, environment_name text, invite_type text, expires_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    pi.environment_id,
    pi.environment_owner_id,
    COALESCE(e.name, p.company, p.full_name, 'Ambiente') AS environment_name,
    pi.invite_type,
    pi.expires_at
  FROM public.pending_environment_invites pi
  LEFT JOIN public.environments e ON e.id = pi.environment_id
  LEFT JOIN public.profiles p ON p.user_id = pi.environment_owner_id
  WHERE LOWER(pi.email) = LOWER(_email)
    AND pi.status = 'invited'
    AND pi.expires_at > now()
  LIMIT 1;
$$;

-- 5. Storage: scope logo writes to environment admins, restrict listing
CREATE OR REPLACE FUNCTION public.can_manage_environment_logo(_environment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_system_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.environment_roles er
      WHERE er.environment_id = _environment_id
        AND er.user_id = auth.uid()
        AND er.accepted_at IS NOT NULL
        AND er.is_environment_admin = true
    );
$$;

CREATE OR REPLACE FUNCTION public.can_read_environment_files(_environment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_system_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.environment_roles er
      WHERE er.environment_id = _environment_id
        AND er.user_id = auth.uid()
        AND er.accepted_at IS NOT NULL
    );
$$;

DROP POLICY IF EXISTS "Anyone can view environment logos" ON storage.objects;
DROP POLICY IF EXISTS "Environment admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Environment admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Environment admins can delete logos" ON storage.objects;

CREATE POLICY "Environment members can list logos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'environment-logos'
  AND public.can_read_environment_files(NULLIF((storage.foldername(name))[1], '')::uuid)
);

CREATE POLICY "Environment admins can upload logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'environment-logos'
  AND public.can_manage_environment_logo(NULLIF((storage.foldername(name))[1], '')::uuid)
);

CREATE POLICY "Environment admins can update logos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'environment-logos'
  AND public.can_manage_environment_logo(NULLIF((storage.foldername(name))[1], '')::uuid)
)
WITH CHECK (
  bucket_id = 'environment-logos'
  AND public.can_manage_environment_logo(NULLIF((storage.foldername(name))[1], '')::uuid)
);

CREATE POLICY "Environment admins can delete logos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'environment-logos'
  AND public.can_manage_environment_logo(NULLIF((storage.foldername(name))[1], '')::uuid)
);

-- 6. Lock down internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_pending_invites() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_version_on_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_log_creative_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_generate_line_utm() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_auto_backup_on_line_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_auto_backup_on_plan_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_environment_id_from_media_line() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_environment_id_from_media_plan() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_removal() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_environment_member_limit() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_auto_backups() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_pending_invites() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_auto_backup_snapshot(uuid, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_environment_members_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_environment_members_with_details(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_all_environments() FROM anon;

-- Remove anon execute from all remaining public functions, keeping only the invite lookups
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname NOT IN ('get_invite_by_token', 'get_invite_by_email')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_by_email(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_user_data_section(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_environment_logo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_environment_files(uuid) TO authenticated;