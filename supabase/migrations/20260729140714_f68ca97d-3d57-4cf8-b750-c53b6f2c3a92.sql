DO $$
DECLARE
  r RECORD;
  internal_names text[] := ARRAY[
    'cleanup_old_auto_backups',
    'expire_pending_invites',
    'create_auto_backup_snapshot',
    'get_environment_members_admin',
    'list_all_environments'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig,
           p.proname,
           pg_catalog.pg_get_function_result(p.oid) AS restype
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);

    IF r.restype <> 'trigger'
       AND NOT (r.proname = ANY(internal_names)) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;

    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invite_by_email(text) TO anon;