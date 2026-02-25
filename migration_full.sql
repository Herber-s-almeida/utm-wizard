-- =====================================================
-- MIGRATION COMPLETA: Lovable Cloud -> Supabase
-- Gerado em: 2026-02-25
-- =====================================================
-- INSTRUCOES:
-- 1. Crie um projeto Supabase
-- 2. Abra o SQL Editor
-- 3. Cole e execute este arquivo inteiro
-- 4. Veja MIGRATION_README.md para próximos passos
-- =====================================================

-- =====================================================
-- SECAO 1: ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE public.detail_category AS ENUM ('ooh', 'radio', 'tv', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.environment_permission_level AS ENUM ('none', 'view', 'edit', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.environment_role AS ENUM ('owner', 'admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.environment_section AS ENUM ('executive_dashboard', 'reports', 'finance', 'media_plans', 'media_resources', 'taxonomy', 'library');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.plan_permission_level AS ENUM ('none', 'view', 'edit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.system_role AS ENUM ('system_admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- SECAO 2: FUNCOES UTILITARIAS (sem dependencia de tabelas)
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_slug(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          TRANSLATE(
            COALESCE(input_text, ''),
            'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ',
            'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
          ),
          '\s+', '-', 'g'
        ),
        '[^a-zA-Z0-9-]', '', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_generate_slug()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.name IS NOT NULL AND (NEW.slug IS NULL OR OLD.name IS DISTINCT FROM NEW.name) THEN
    NEW.slug := public.generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_creative_id()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id TEXT;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
  exists_count INTEGER;
BEGIN
  LOOP
    new_id := '';
    FOR i IN 1..6 LOOP
      new_id := new_id || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT COUNT(*) INTO exists_count FROM public.media_creatives WHERE creative_id = new_id;
    IF exists_count = 0 THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_creative_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.creative_id IS NULL THEN
    NEW.creative_id := public.generate_creative_id();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.build_utm_campaign_string(p_line_code text, p_campaign_name text, p_subdivision_slug text, p_moment_slug text, p_funnel_slug text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_allocation_percentage()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  total_percentage DECIMAL(5,2);
BEGIN
  SELECT COALESCE(SUM(allocated_percentage), 0) INTO total_percentage
  FROM public.line_detail_line_links
  WHERE line_detail_id = NEW.line_detail_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  total_percentage := total_percentage + NEW.allocated_percentage;
  IF total_percentage > 100.01 THEN
    RAISE EXCEPTION 'Soma das alocacoes excede 100 porcento (atual: %)', total_percentage;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_line_detail_links_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- =====================================================
-- SECAO 3: TABELAS - NIVEL 0 (sem FK para public)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_system_user boolean DEFAULT false,
  company text,
  phone text
);

CREATE TABLE IF NOT EXISTS public.system_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.system_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.system_access_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  company text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.environments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  owner_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  company_name text,
  cnpj text,
  created_by uuid REFERENCES auth.users(id),
  logo_url text,
  address text
);

CREATE TABLE IF NOT EXISTS public.creative_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.file_extensions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_visibility_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_key text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, menu_key)
);

-- =====================================================
-- SECAO 4: TABELAS - NIVEL 1 (dependem do Nivel 0)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.environment_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_owner_id uuid NOT NULL,
  member_user_id uuid NOT NULL,
  environment_role public.environment_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  invited_at timestamp with time zone,
  accepted_at timestamp with time zone,
  invited_by uuid,
  perm_executive_dashboard public.environment_permission_level DEFAULT 'none',
  perm_reports public.environment_permission_level DEFAULT 'none',
  perm_finance public.environment_permission_level DEFAULT 'none',
  perm_media_plans public.environment_permission_level DEFAULT 'none',
  perm_media_resources public.environment_permission_level DEFAULT 'none',
  perm_taxonomy public.environment_permission_level DEFAULT 'none',
  perm_library public.environment_permission_level DEFAULT 'none',
  notify_media_resources boolean DEFAULT false,
  UNIQUE(environment_owner_id, member_user_id),
  CHECK (environment_owner_id <> member_user_id)
);

CREATE TABLE IF NOT EXISTS public.environment_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id uuid NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_environment_admin boolean NOT NULL DEFAULT false,
  role_read boolean NOT NULL DEFAULT true,
  role_edit boolean NOT NULL DEFAULT false,
  role_delete boolean NOT NULL DEFAULT false,
  role_invite boolean NOT NULL DEFAULT false,
  perm_executive_dashboard public.environment_permission_level DEFAULT 'none',
  perm_reports public.environment_permission_level DEFAULT 'none',
  perm_finance public.environment_permission_level DEFAULT 'none',
  perm_media_plans public.environment_permission_level DEFAULT 'none',
  perm_media_resources public.environment_permission_level DEFAULT 'none',
  perm_taxonomy public.environment_permission_level DEFAULT 'none',
  perm_library public.environment_permission_level DEFAULT 'none',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  invited_at timestamp with time zone,
  accepted_at timestamp with time zone,
  invited_by uuid,
  UNIQUE(environment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.invite_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  invite_type text NOT NULL,
  action text NOT NULL,
  invited_by uuid,
  target_user_id uuid,
  environment_owner_id uuid,
  environment_id uuid REFERENCES public.environments(id),
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pending_environment_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  environment_owner_id uuid,
  environment_id uuid REFERENCES public.environments(id),
  environment_role public.environment_role NOT NULL DEFAULT 'user',
  invited_by uuid,
  status text NOT NULL DEFAULT 'invited',
  token text NOT NULL DEFAULT gen_random_uuid()::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  perm_executive_dashboard public.environment_permission_level DEFAULT 'none',
  perm_reports public.environment_permission_level DEFAULT 'none',
  perm_finance public.environment_permission_level DEFAULT 'none',
  perm_media_plans public.environment_permission_level DEFAULT 'none',
  perm_media_resources public.environment_permission_level DEFAULT 'none',
  perm_taxonomy public.environment_permission_level DEFAULT 'none',
  perm_library public.environment_permission_level DEFAULT 'none'
);

CREATE TABLE IF NOT EXISTS public.mediums (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true,
  slug text,
  is_system boolean NOT NULL DEFAULT false,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name character varying(180) NOT NULL,
  description text,
  slug text,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  visible_for_media_plans boolean DEFAULT true,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.statuses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  description text,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer DEFAULT 0,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.moments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true,
  slug text,
  is_system boolean NOT NULL DEFAULT false,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.funnel_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true,
  slug text,
  is_system boolean NOT NULL DEFAULT false,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.formats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true,
  slug text,
  is_system boolean NOT NULL DEFAULT false,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.custom_kpis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  key text NOT NULL,
  unit text NOT NULL DEFAULT 'number',
  description text,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id),
  UNIQUE(user_id, key)
);

CREATE TABLE IF NOT EXISTS public.data_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  source_type text NOT NULL CHECK (source_type = ANY (ARRAY['google_sheets', 'csv_upload', 'google_ads_api', 'meta_api', 'manual'])),
  config jsonb,
  is_active boolean DEFAULT true,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.media_objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.line_detail_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category public.detail_category NOT NULL DEFAULT 'custom',
  description text,
  field_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  environment_id uuid REFERENCES public.environments(id),
  user_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL,
  granted_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_vendors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  document text,
  category text,
  payment_terms text,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.financial_alert_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  alert_type text NOT NULL,
  threshold_percentage numeric,
  threshold_days integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.financial_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  before_json jsonb,
  after_json jsonb,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.finance_account_managers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.finance_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.finance_campaign_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.finance_cost_centers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  full_name text,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.finance_document_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.finance_macro_classifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.finance_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.finance_request_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.finance_statuses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  description text,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.finance_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.behavioral_segmentations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true,
  environment_id uuid REFERENCES public.environments(id)
);

-- =====================================================
-- SECAO 5: TABELAS - NIVEL 2
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  medium_id uuid NOT NULL REFERENCES public.mediums(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true,
  slug text,
  is_system boolean NOT NULL DEFAULT false,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true,
  client_id uuid REFERENCES public.clients(id),
  age_range text,
  gender text,
  location text,
  interests text,
  behaviors text,
  custom_attributes jsonb,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.status_transitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_status_id uuid REFERENCES public.statuses(id),
  to_status_id uuid NOT NULL REFERENCES public.statuses(id),
  user_id uuid NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  required_roles text[] DEFAULT ARRAY['owner','editor'],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.finance_expense_classifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  macro_classification_id uuid REFERENCES public.finance_macro_classifications(id),
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.format_creative_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  format_id uuid NOT NULL REFERENCES public.formats(id),
  name text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.media_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  campaign text,
  start_date date,
  end_date date,
  total_budget numeric DEFAULT 0,
  status text DEFAULT 'Rascunho',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  slug text,
  client_id uuid REFERENCES public.clients(id),
  deleted_at timestamp with time zone,
  default_url text,
  objective text,
  notes text,
  budget_currency text DEFAULT 'BRL',
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.plan_subdivisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid REFERENCES public.media_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  parent_id uuid REFERENCES public.plan_subdivisions(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

-- =====================================================
-- SECAO 6: TABELAS - NIVEL 3
-- =====================================================

CREATE TABLE IF NOT EXISTS public.channels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true,
  slug text,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.creative_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) <= 25),
  format text NOT NULL,
  dimension text,
  duration text,
  message text,
  objective text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  dimensions jsonb DEFAULT '[]'::jsonb,
  creative_type_id uuid REFERENCES public.creative_types(id),
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.creative_type_specifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creative_type_id uuid NOT NULL REFERENCES public.format_creative_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  has_duration boolean DEFAULT false,
  duration_value numeric,
  duration_unit text,
  max_weight numeric,
  weight_unit text,
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.plan_budget_distributions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  allocated_budget numeric DEFAULT 0,
  parent_id uuid REFERENCES public.plan_budget_distributions(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.plan_custom_kpis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  custom_kpi_id uuid NOT NULL REFERENCES public.custom_kpis(id) ON DELETE CASCADE,
  target_value numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(media_plan_id, custom_kpi_id)
);

CREATE TABLE IF NOT EXISTS public.plan_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level public.plan_permission_level NOT NULL DEFAULT 'view',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(media_plan_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.plan_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_plan_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  created_by uuid NOT NULL,
  snapshot_data jsonb NOT NULL,
  change_log text,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_auto_backup boolean DEFAULT false,
  UNIQUE(media_plan_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.media_plan_followers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(media_plan_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.media_plan_notification_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  last_notified_version integer,
  last_notified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(media_plan_id)
);

CREATE TABLE IF NOT EXISTS public.financial_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id),
  vendor_id uuid REFERENCES public.financial_vendors(id),
  vendor_name text,
  document_type text NOT NULL DEFAULT 'invoice',
  document_number text,
  amount numeric NOT NULL,
  currency text DEFAULT 'BRL',
  issue_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  attachment_urls jsonb,
  related_dimensions_json jsonb,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  expense_classification text,
  macro_classification text,
  cost_center_code text,
  cost_center_name text,
  financial_account text,
  campaign_project text,
  team text,
  account_manager text,
  package text,
  product text,
  request_type text,
  competency_month text,
  competency_month_erp text,
  contract_reference text,
  service_description text,
  rir_task_number text,
  cms_sent_date date,
  invoice_received_date date,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.financial_actuals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  actual_amount numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  dimensions_json jsonb,
  import_batch_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.financial_forecasts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  planned_amount numeric NOT NULL DEFAULT 0,
  granularity text NOT NULL DEFAULT 'monthly',
  source text NOT NULL DEFAULT 'manual',
  version integer DEFAULT 1,
  is_locked boolean DEFAULT false,
  reason text,
  dimensions_json jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.financial_revenues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  media_plan_id uuid REFERENCES public.media_plans(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  revenue_amount numeric NOT NULL DEFAULT 0,
  source text,
  product_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.report_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  media_plan_id uuid REFERENCES public.media_plans(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  row_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  errors jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.report_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

-- =====================================================
-- SECAO 7: TABELAS - NIVEL 4
-- =====================================================

CREATE TABLE IF NOT EXISTS public.media_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  line_code text,
  medium_id uuid REFERENCES public.mediums(id),
  vehicle_id uuid REFERENCES public.vehicles(id),
  channel_id uuid REFERENCES public.channels(id),
  format_id uuid REFERENCES public.formats(id),
  target_id uuid REFERENCES public.targets(id),
  moment_id uuid REFERENCES public.moments(id),
  funnel_stage_id uuid REFERENCES public.funnel_stages(id),
  creative_template_id uuid REFERENCES public.creative_templates(id),
  status_id uuid REFERENCES public.statuses(id),
  objective_id uuid REFERENCES public.media_objectives(id),
  subdivision_id uuid REFERENCES public.plan_subdivisions(id),
  budget numeric DEFAULT 0,
  start_date date,
  end_date date,
  impressions numeric DEFAULT 0,
  clicks numeric DEFAULT 0,
  views numeric DEFAULT 0,
  reach numeric DEFAULT 0,
  frequency numeric DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  cpv numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  vtr numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  cost_per_conversion numeric DEFAULT 0,
  custom_kpis jsonb DEFAULT '{}'::jsonb,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  negotiation_type text,
  unit_cost numeric DEFAULT 0,
  quantity numeric DEFAULT 0,
  discount_percentage numeric DEFAULT 0,
  gross_cost numeric DEFAULT 0,
  bonus_percentage numeric DEFAULT 0,
  net_cost numeric DEFAULT 0,
  distribution_id uuid REFERENCES public.plan_budget_distributions(id),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.specification_copy_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specification_id uuid NOT NULL REFERENCES public.creative_type_specifications(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  max_chars integer,
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.specification_dimensions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specification_id uuid NOT NULL REFERENCES public.creative_type_specifications(id) ON DELETE CASCADE,
  width integer NOT NULL,
  height integer NOT NULL,
  unit text DEFAULT 'px',
  label text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.specification_extensions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specification_id uuid NOT NULL REFERENCES public.creative_type_specifications(id) ON DELETE CASCADE,
  file_extension_id uuid NOT NULL REFERENCES public.file_extensions(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  financial_document_id uuid NOT NULL REFERENCES public.financial_documents(id) ON DELETE CASCADE,
  planned_amount numeric NOT NULL,
  planned_payment_date date NOT NULL,
  paid_amount numeric,
  actual_payment_date date,
  payment_method text,
  installment_number integer,
  status text NOT NULL DEFAULT 'pending',
  proof_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.report_column_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_import_id uuid NOT NULL REFERENCES public.report_imports(id) ON DELETE CASCADE,
  source_column text NOT NULL,
  target_field text NOT NULL,
  transformation text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source_id uuid REFERENCES public.data_sources(id),
  report_period_id uuid REFERENCES public.report_periods(id) ON DELETE CASCADE,
  media_line_id uuid REFERENCES public.media_lines(id) ON DELETE CASCADE,
  media_plan_id uuid REFERENCES public.media_plans(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  impressions numeric DEFAULT 0,
  clicks numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  spend numeric DEFAULT 0,
  reach numeric DEFAULT 0,
  video_views numeric DEFAULT 0,
  custom_metrics jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- SECAO 8: TABELAS - NIVEL 5
-- =====================================================

CREATE TABLE IF NOT EXISTS public.media_line_monthly_budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_line_id uuid NOT NULL REFERENCES public.media_lines(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id),
  UNIQUE(media_line_id, month_year)
);

CREATE TABLE IF NOT EXISTS public.line_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_line_id uuid NOT NULL REFERENCES public.media_lines(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.targets(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id),
  UNIQUE(media_line_id, target_id)
);

CREATE TABLE IF NOT EXISTS public.media_creatives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_line_id uuid NOT NULL REFERENCES public.media_lines(id) ON DELETE CASCADE,
  creative_id text,
  creative_name text,
  format_id uuid REFERENCES public.formats(id),
  dimension text,
  duration text,
  weight text,
  piece_link text,
  production_status text DEFAULT 'pending',
  received_date date,
  approved_date date,
  notes text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.performance_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  media_line_id uuid REFERENCES public.media_lines(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  message text NOT NULL,
  metric_name text,
  expected_value numeric,
  actual_value numeric,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

CREATE TABLE IF NOT EXISTS public.report_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  media_line_id uuid REFERENCES public.media_lines(id) ON DELETE SET NULL,
  report_import_id uuid REFERENCES public.report_imports(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  dimensions jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.line_details (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  detail_type_id uuid NOT NULL REFERENCES public.line_detail_types(id),
  name text NOT NULL,
  user_id uuid NOT NULL,
  environment_id uuid REFERENCES public.environments(id),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- SECAO 9: TABELAS - NIVEL 6
-- =====================================================

CREATE TABLE IF NOT EXISTS public.creative_change_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creative_id uuid NOT NULL REFERENCES public.media_creatives(id) ON DELETE CASCADE,
  change_date timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  change_type text DEFAULT 'comment'
);

CREATE TABLE IF NOT EXISTS public.line_detail_line_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_detail_id uuid NOT NULL REFERENCES public.line_details(id) ON DELETE CASCADE,
  media_line_id uuid NOT NULL REFERENCES public.media_lines(id) ON DELETE CASCADE,
  allocated_percentage numeric(5,2) NOT NULL DEFAULT 100,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id),
  UNIQUE(line_detail_id, media_line_id)
);

CREATE TABLE IF NOT EXISTS public.line_detail_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_detail_id uuid NOT NULL REFERENCES public.line_details(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id),
  status_id uuid REFERENCES public.statuses(id),
  format_id uuid REFERENCES public.formats(id),
  creative_id uuid REFERENCES public.media_creatives(id),
  period_start date,
  period_end date,
  total_gross numeric,
  total_net numeric,
  total_insertions integer,
  days_of_week text[]
);

-- =====================================================
-- SECAO 10: TABELAS - NIVEL 7
-- =====================================================

CREATE TABLE IF NOT EXISTS public.line_detail_insertions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_detail_item_id uuid NOT NULL REFERENCES public.line_detail_items(id) ON DELETE CASCADE,
  insertion_date date NOT NULL,
  quantity integer DEFAULT 1,
  notes text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  environment_id uuid REFERENCES public.environments(id)
);

-- =====================================================
-- SECAO 11: INDICES (nao-PK)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_behavioral_segmentations_active ON public.behavioral_segmentations USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_behavioral_segmentations_environment ON public.behavioral_segmentations USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_channels_active ON public.channels USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_channels_environment ON public.channels USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON public.clients USING btree (deleted_at);
CREATE INDEX IF NOT EXISTS idx_clients_environment ON public.clients USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_creative_change_logs_date ON public.creative_change_logs USING btree (change_date);
CREATE INDEX IF NOT EXISTS idx_creative_templates_active ON public.creative_templates USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_creative_templates_environment ON public.creative_templates USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_creative_type_specifications_active ON public.creative_type_specifications USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_creative_type_specifications_environment ON public.creative_type_specifications USING btree (environment_id);
CREATE UNIQUE INDEX IF NOT EXISTS creative_types_name_unique ON public.creative_types USING btree (lower(name));
CREATE INDEX IF NOT EXISTS idx_custom_kpis_environment ON public.custom_kpis USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_custom_kpis_user_id ON public.custom_kpis USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_environment ON public.data_sources USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_environment_members_member ON public.environment_members USING btree (member_user_id);
CREATE INDEX IF NOT EXISTS idx_environment_members_owner ON public.environment_members USING btree (environment_owner_id);
CREATE INDEX IF NOT EXISTS idx_environment_roles_environment ON public.environment_roles USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_environment_roles_user ON public.environment_roles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_environments_owner ON public.environments USING btree (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_finance_account_managers_environment ON public.finance_account_managers USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_environment ON public.finance_accounts USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_campaign_projects_environment ON public.finance_campaign_projects USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_cost_centers_environment ON public.finance_cost_centers USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_document_types_environment ON public.finance_document_types USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_expense_classifications_environment ON public.finance_expense_classifications USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_macro_classifications_environment ON public.finance_macro_classifications USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_packages_environment ON public.finance_packages USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_request_types_environment ON public.finance_request_types USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_statuses_environment ON public.finance_statuses USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_teams_environment ON public.finance_teams USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_actuals_environment ON public.financial_actuals USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_actuals_plan ON public.financial_actuals USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_financial_alert_configs_environment ON public.financial_alert_configs USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_entity ON public.financial_audit_log USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_environment ON public.financial_audit_log USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_environment ON public.financial_documents USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_plan ON public.financial_documents USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_status ON public.financial_documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_financial_documents_vendor ON public.financial_documents USING btree (vendor_id);
CREATE INDEX IF NOT EXISTS idx_financial_forecasts_environment ON public.financial_forecasts USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_forecasts_plan ON public.financial_forecasts USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_financial_payments_document ON public.financial_payments USING btree (financial_document_id);
CREATE INDEX IF NOT EXISTS idx_financial_payments_environment ON public.financial_payments USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_revenues_environment ON public.financial_revenues USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_vendors_environment ON public.financial_vendors USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_format_creative_types_active ON public.format_creative_types USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_format_creative_types_environment ON public.format_creative_types USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_formats_active ON public.formats USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_formats_environment ON public.formats USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_funnel_stages_active ON public.funnel_stages USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_funnel_stages_environment ON public.funnel_stages USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_invite_audit_log_email ON public.invite_audit_log USING btree (email);
CREATE INDEX IF NOT EXISTS idx_invite_audit_log_environment ON public.invite_audit_log USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_insertions_environment ON public.line_detail_insertions USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_insertions_item ON public.line_detail_insertions USING btree (line_detail_item_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_items_detail ON public.line_detail_items USING btree (line_detail_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_items_environment ON public.line_detail_items USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_line_links_detail ON public.line_detail_line_links USING btree (line_detail_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_line_links_environment ON public.line_detail_line_links USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_line_links_line ON public.line_detail_line_links USING btree (media_line_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_types_environment ON public.line_detail_types USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_details_environment ON public.line_details USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_details_plan ON public.line_details USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_line_targets_environment ON public.line_targets USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_targets_line ON public.line_targets USING btree (media_line_id);
CREATE INDEX IF NOT EXISTS idx_media_creatives_environment ON public.media_creatives USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_media_creatives_line ON public.media_creatives USING btree (media_line_id);
CREATE INDEX IF NOT EXISTS idx_media_line_monthly_budgets_environment ON public.media_line_monthly_budgets USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_media_line_monthly_budgets_line ON public.media_line_monthly_budgets USING btree (media_line_id);
CREATE INDEX IF NOT EXISTS idx_media_lines_environment ON public.media_lines USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_media_lines_plan ON public.media_lines USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_media_objectives_active ON public.media_objectives USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_media_objectives_environment ON public.media_objectives USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_media_plan_followers_plan ON public.media_plan_followers USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_media_plan_followers_user ON public.media_plan_followers USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_media_plan_versions_plan ON public.media_plan_versions USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_media_plans_environment ON public.media_plans USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_media_plans_slug ON public.media_plans USING btree (user_id, slug);
CREATE INDEX IF NOT EXISTS idx_media_plans_user ON public.media_plans USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_mediums_active ON public.mediums USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_mediums_environment ON public.mediums USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_moments_active ON public.moments USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_moments_environment ON public.moments USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON public.pending_environment_invites USING btree (email);
CREATE INDEX IF NOT EXISTS idx_pending_invites_environment ON public.pending_environment_invites USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_pending_invites_token ON public.pending_environment_invites USING btree (token);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_environment ON public.performance_alerts USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_plan ON public.performance_alerts USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_budget_distributions_environment ON public.plan_budget_distributions USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_plan_budget_distributions_plan ON public.plan_budget_distributions USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_permissions_plan ON public.plan_permissions USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_permissions_user ON public.plan_permissions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_plan_subdivisions_environment ON public.plan_subdivisions USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_plan_subdivisions_plan ON public.plan_subdivisions USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_report_data_plan ON public.report_data USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_report_imports_environment ON public.report_imports USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_report_metrics_date ON public.report_metrics USING btree (metric_date);
CREATE INDEX IF NOT EXISTS idx_report_metrics_line ON public.report_metrics USING btree (media_line_id);
CREATE INDEX IF NOT EXISTS idx_report_periods_environment ON public.report_periods USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_report_periods_plan ON public.report_periods USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_specification_copy_fields_spec ON public.specification_copy_fields USING btree (specification_id);
CREATE INDEX IF NOT EXISTS idx_specification_dimensions_spec ON public.specification_dimensions USING btree (specification_id);
CREATE INDEX IF NOT EXISTS idx_specification_extensions_spec ON public.specification_extensions USING btree (specification_id);
CREATE INDEX IF NOT EXISTS idx_status_transitions_environment ON public.status_transitions USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_statuses_active ON public.statuses USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_statuses_environment ON public.statuses USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_system_access_requests_status ON public.system_access_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_system_access_requests_user ON public.system_access_requests USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_system_roles_user ON public.system_roles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_targets_active ON public.targets USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_targets_environment ON public.targets USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON public.vehicles USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_vehicles_environment ON public.vehicles USING btree (environment_id);

-- =====================================================
-- SECAO 12: HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.behavioral_segmentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_type_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environment_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_account_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_campaign_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expense_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_macro_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_request_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.format_creative_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_detail_insertions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_detail_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_detail_line_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_detail_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_line_monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_plan_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_plan_notification_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mediums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_visibility_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_environment_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_budget_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_custom_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_subdivisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_column_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specification_copy_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specification_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specification_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECAO 13: FUNCOES QUE DEPENDEM DE TABELAS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.system_roles
    WHERE user_id = _user_id AND role = 'system_admin'
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_environment_owner(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT is_system_user FROM public.profiles WHERE user_id = _user_id),
    false
  )
$function$;

CREATE OR REPLACE FUNCTION public.can_access_user_data(_owner_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    _owner_user_id = auth.uid()
    OR public.is_environment_member(_owner_user_id, auth.uid())
    OR public.is_system_admin(auth.uid())
$function$;

CREATE OR REPLACE FUNCTION public.can_access_user_data_for_write(_owner_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    _owner_user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.environment_members
        WHERE environment_owner_id = _owner_user_id
          AND member_user_id = auth.uid()
          AND accepted_at IS NOT NULL
          AND environment_role = 'admin'
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.environment_members
        WHERE environment_owner_id = _owner_user_id
          AND member_user_id = auth.uid()
          AND accepted_at IS NOT NULL
          AND (
            perm_library IN ('edit', 'admin')
            OR perm_media_plans IN ('edit', 'admin')
            OR perm_media_resources IN ('edit', 'admin')
            OR perm_taxonomy IN ('edit', 'admin')
            OR perm_finance IN ('edit', 'admin')
          )
      )
    )
    OR public.is_system_admin(auth.uid())
$function$;

CREATE OR REPLACE FUNCTION public.is_environment_member(_environment_owner_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.environment_members
    WHERE environment_owner_id = _environment_owner_id
      AND member_user_id = _user_id
      AND accepted_at IS NOT NULL
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_environment_admin(_environment_owner_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.environment_members
    WHERE environment_owner_id = _environment_owner_id
      AND member_user_id = _user_id
      AND accepted_at IS NOT NULL
      AND (
        perm_executive_dashboard = 'admin' OR
        perm_reports = 'admin' OR
        perm_finance = 'admin' OR
        perm_media_plans = 'admin' OR
        perm_media_resources = 'admin' OR
        perm_taxonomy = 'admin' OR
        perm_library = 'admin'
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_environment_owner_of(_environment_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.environments e
    WHERE e.id = _environment_id
      AND e.owner_user_id = _user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_environment_role(_environment_id uuid, _user_id uuid)
 RETURNS environment_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  _is_admin BOOLEAN;
BEGIN
  IF public.is_system_admin(_user_id) THEN
    RETURN 'admin';
  END IF;
  SELECT is_environment_admin INTO _is_admin
  FROM public.environment_roles
  WHERE environment_id = _environment_id 
    AND user_id = _user_id
    AND accepted_at IS NOT NULL;
  IF _is_admin IS NULL THEN
    RETURN NULL;
  ELSIF _is_admin THEN
    RETURN 'admin';
  ELSE
    RETURN 'user';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_environment_permission(_environment_owner_id uuid, _user_id uuid, _section text)
 RETURNS environment_permission_level
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _permission public.environment_permission_level;
BEGIN
  IF _environment_owner_id = _user_id THEN
    RETURN 'admin'::public.environment_permission_level;
  END IF;
  IF public.is_system_admin(_user_id) THEN
    RETURN 'admin'::public.environment_permission_level;
  END IF;
  EXECUTE format(
    'SELECT perm_%I FROM public.environment_members 
     WHERE environment_owner_id = $1 AND member_user_id = $2 AND accepted_at IS NOT NULL',
    _section
  ) INTO _permission USING _environment_owner_id, _user_id;
  RETURN COALESCE(_permission, 'none'::public.environment_permission_level);
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_environment_permission(_environment_owner_id uuid, _user_id uuid, _section text, _min_level environment_permission_level)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _current_level public.environment_permission_level;
  _level_order INTEGER;
  _min_level_order INTEGER;
BEGIN
  _current_level := public.get_environment_permission(_environment_owner_id, _user_id, _section);
  _level_order := CASE _current_level
    WHEN 'none' THEN 0 WHEN 'view' THEN 1 WHEN 'edit' THEN 2 WHEN 'admin' THEN 3
  END;
  _min_level_order := CASE _min_level
    WHEN 'none' THEN 0 WHEN 'view' THEN 1 WHEN 'edit' THEN 2 WHEN 'admin' THEN 3
  END;
  RETURN _level_order >= _min_level_order;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_environment_access(_environment_id uuid, _permission text DEFAULT 'read')
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  _user_id UUID := auth.uid();
BEGIN
  IF _environment_id IS NULL THEN RETURN false; END IF;
  IF public.is_system_admin(_user_id) THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.environment_roles er
    WHERE er.environment_id = _environment_id
      AND er.user_id = _user_id
      AND er.accepted_at IS NOT NULL
      AND (
        (_permission = 'read' AND er.role_read = true) OR
        (_permission = 'edit' AND er.role_edit = true) OR
        (_permission = 'delete' AND er.role_delete = true) OR
        (_permission = 'invite' AND er.role_invite = true)
      )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_environment_section_access(_environment_id uuid, _section text, _required_level text DEFAULT 'view')
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  _user_id UUID := auth.uid();
  _perm_level TEXT;
BEGIN
  IF _environment_id IS NULL THEN RETURN false; END IF;
  IF public.is_system_admin(_user_id) THEN RETURN true; END IF;
  SELECT 
    CASE _section
      WHEN 'library' THEN perm_library::TEXT
      WHEN 'media_plans' THEN perm_media_plans::TEXT
      WHEN 'media_resources' THEN perm_media_resources::TEXT
      WHEN 'taxonomy' THEN perm_taxonomy::TEXT
      WHEN 'finance' THEN perm_finance::TEXT
      WHEN 'reports' THEN perm_reports::TEXT
      WHEN 'executive_dashboard' THEN perm_executive_dashboard::TEXT
      ELSE 'none'
    END INTO _perm_level
  FROM public.environment_roles er
  WHERE er.environment_id = _environment_id
    AND er.user_id = _user_id
    AND er.accepted_at IS NOT NULL;
  IF _perm_level IS NULL THEN RETURN false; END IF;
  IF _required_level = 'view' THEN
    RETURN _perm_level IN ('view', 'edit', 'admin');
  ELSIF _required_level = 'edit' THEN
    RETURN _perm_level IN ('edit', 'admin');
  ELSIF _required_level = 'admin' THEN
    RETURN _perm_level = 'admin';
  END IF;
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_invite_to_environment(_environment_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  _is_admin BOOLEAN;
BEGIN
  IF public.is_system_admin(_user_id) THEN RETURN true; END IF;
  SELECT is_environment_admin INTO _is_admin
  FROM public.environment_roles
  WHERE environment_id = _environment_id
    AND user_id = _user_id
    AND accepted_at IS NOT NULL;
  RETURN COALESCE(_is_admin, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_invite_environment_member(_environment_owner_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.count_environment_members(_environment_owner_id) < 30;
$function$;

CREATE OR REPLACE FUNCTION public.count_environment_members(_environment_owner_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.environment_members
  WHERE environment_owner_id = _environment_owner_id;
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_member_role(_environment_id uuid, _manager_user_id uuid, _target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  _manager_is_admin BOOLEAN;
BEGIN
  IF public.is_system_admin(_manager_user_id) THEN RETURN true; END IF;
  SELECT is_environment_admin INTO _manager_is_admin
  FROM public.environment_roles
  WHERE environment_id = _environment_id
    AND user_id = _manager_user_id
    AND accepted_at IS NOT NULL;
  IF _manager_is_admin = true THEN
    RETURN _manager_user_id != _target_user_id;
  END IF;
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_remove_environment_member(_environment_id uuid, _remover_user_id uuid, _target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  _remover_is_admin BOOLEAN;
BEGIN
  IF public.is_system_admin(_remover_user_id) THEN RETURN true; END IF;
  SELECT is_environment_admin INTO _remover_is_admin
  FROM public.environment_roles
  WHERE environment_id = _environment_id
    AND user_id = _remover_user_id
    AND accepted_at IS NOT NULL;
  IF _remover_is_admin = true THEN RETURN true; END IF;
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_count INTEGER;
BEGIN
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
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_environment_member_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.count_environment_members(NEW.environment_owner_id) >= 30 THEN
    RAISE EXCEPTION 'Limite de 30 membros por ambiente atingido';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_environments(_user_id uuid)
 RETURNS TABLE(environment_owner_id uuid, environment_name text, environment_role environment_role, is_own_environment boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id as environment_owner_id,
    COALESCE(p.company, p.full_name, 'Meu Ambiente') as environment_name,
    'owner'::public.environment_role as environment_role,
    true as is_own_environment
  FROM public.profiles p
  WHERE p.user_id = _user_id 
    AND p.is_system_user = true
  UNION ALL
  SELECT 
    em.environment_owner_id,
    COALESCE(p.company, p.full_name, 'Ambiente') as environment_name,
    em.environment_role,
    false as is_own_environment
  FROM public.environment_members em
  JOIN public.profiles p ON p.user_id = em.environment_owner_id
  WHERE em.member_user_id = _user_id
    AND em.accepted_at IS NOT NULL
  ORDER BY is_own_environment DESC, environment_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_environments_v2(_user_id uuid)
 RETURNS TABLE(environment_id uuid, environment_name text, environment_owner_id uuid, is_own_environment boolean, is_environment_admin boolean, role_read boolean, role_edit boolean, role_delete boolean, role_invite boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    e.id AS environment_id,
    e.name AS environment_name,
    e.owner_user_id AS environment_owner_id,
    er.is_environment_admin AS is_own_environment,
    er.is_environment_admin,
    er.role_read,
    er.role_edit,
    er.role_delete,
    er.role_invite
  FROM public.environments e
  INNER JOIN public.environment_roles er ON er.environment_id = e.id
  WHERE er.user_id = _user_id
    AND er.accepted_at IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_environment_members_with_details(p_environment_id uuid)
 RETURNS TABLE(user_id uuid, email text, full_name text, is_environment_admin boolean, perm_executive_dashboard text, perm_reports text, perm_finance text, perm_media_plans text, perm_media_resources text, perm_taxonomy text, perm_library text, role_read boolean, role_edit boolean, role_delete boolean, role_invite boolean, accepted_at timestamp with time zone, invited_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  IF NOT (
    is_system_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM environment_roles er 
      WHERE er.environment_id = p_environment_id 
      AND er.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to environment';
  END IF;
  RETURN QUERY
  SELECT 
    er.user_id,
    au.email::TEXT,
    p.full_name,
    er.is_environment_admin,
    er.perm_executive_dashboard::TEXT,
    er.perm_reports::TEXT,
    er.perm_finance::TEXT,
    er.perm_media_plans::TEXT,
    er.perm_media_resources::TEXT,
    er.perm_taxonomy::TEXT,
    er.perm_library::TEXT,
    er.role_read,
    er.role_edit,
    er.role_delete,
    er.role_invite,
    er.accepted_at,
    er.invited_at
  FROM public.environment_roles er
  LEFT JOIN auth.users au ON au.id = er.user_id
  LEFT JOIN public.profiles p ON p.user_id = er.user_id
  WHERE er.environment_id = p_environment_id
  ORDER BY er.is_environment_admin DESC, p.full_name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_environment_members_admin(p_environment_id uuid)
 RETURNS TABLE(user_id uuid, email text, full_name text, is_environment_admin boolean, accepted_at timestamp with time zone, invited_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  IF NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores do sistema';
  END IF;
  RETURN QUERY
  SELECT 
    er.user_id,
    au.email::TEXT,
    p.full_name,
    er.is_environment_admin,
    er.accepted_at,
    er.invited_at
  FROM public.environment_roles er
  LEFT JOIN auth.users au ON au.id = er.user_id
  LEFT JOIN public.profiles p ON p.user_id = er.user_id
  WHERE er.environment_id = p_environment_id
    AND er.accepted_at IS NOT NULL
  ORDER BY er.is_environment_admin DESC, p.full_name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_all_environments()
 RETURNS TABLE(id uuid, name text, company_name text, cnpj text, created_at timestamp with time zone, created_by uuid, admin_count bigint, member_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  IF NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores do sistema podem listar todos os ambientes';
  END IF;
  RETURN QUERY
  SELECT 
    e.id, e.name, e.company_name, e.cnpj, e.created_at, e.created_by,
    COUNT(CASE WHEN er.is_environment_admin = true THEN 1 END) AS admin_count,
    COUNT(er.user_id) AS member_count
  FROM public.environments e
  LEFT JOIN public.environment_roles er ON er.environment_id = e.id AND er.accepted_at IS NOT NULL
  GROUP BY e.id, e.name, e.company_name, e.cnpj, e.created_at, e.created_by
  ORDER BY e.name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.expire_pending_invites()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _expired_count INTEGER;
BEGIN
  UPDATE public.pending_environment_invites
  SET status = 'expired'
  WHERE status = 'invited'
    AND expires_at < NOW();
  GET DIAGNOSTICS _expired_count = ROW_COUNT;
  RETURN _expired_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_plan_role(_plan_id uuid, _user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM public.media_plans WHERE id = _plan_id AND user_id = _user_id) 
        THEN 'owner'
      ELSE (SELECT role::text FROM public.plan_roles WHERE media_plan_id = _plan_id AND user_id = _user_id)
    END
$function$;

CREATE OR REPLACE FUNCTION public.can_transition_status(_plan_id uuid, _from_status text, _to_status text, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM status_transitions st
    JOIN statuses to_s ON to_s.id = st.to_status_id
    LEFT JOIN statuses from_s ON from_s.id = st.from_status_id
    WHERE (
      (st.from_status_id IS NULL AND _from_status IS NULL)
      OR from_s.name = _from_status
    )
    AND to_s.name = _to_status
    AND (
      st.is_system = true 
      OR st.user_id = _user_id
    )
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_effective_plan_permission(_plan_id uuid, _user_id uuid DEFAULT auth.uid())
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _environment_id UUID;
  _env_permission text;
  _plan_restriction text;
  _is_env_admin boolean;
BEGIN
  SELECT environment_id INTO _environment_id
  FROM public.media_plans
  WHERE id = _plan_id;
  IF _environment_id IS NULL THEN RETURN 'none'; END IF;
  SELECT er.is_environment_admin INTO _is_env_admin
  FROM public.environment_roles er
  WHERE er.environment_id = _environment_id AND er.user_id = _user_id;
  IF _is_env_admin = true THEN RETURN 'edit'; END IF;
  SELECT 
    CASE er.perm_media_plans
      WHEN 'edit' THEN 'edit' WHEN 'view' THEN 'view' ELSE 'none'
    END INTO _env_permission
  FROM public.environment_roles er
  WHERE er.environment_id = _environment_id AND er.user_id = _user_id;
  IF _env_permission IS NULL OR _env_permission = 'none' THEN RETURN 'none'; END IF;
  SELECT pp.permission_level::text INTO _plan_restriction
  FROM public.plan_permissions pp
  WHERE pp.media_plan_id = _plan_id AND pp.user_id = _user_id;
  IF _plan_restriction IS NULL THEN RETURN _env_permission; END IF;
  IF _plan_restriction = 'none' THEN RETURN 'none';
  ELSIF _plan_restriction = 'view' THEN RETURN 'view';
  ELSE RETURN _env_permission;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_edit_plan(_plan_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.get_effective_plan_permission(_plan_id, auth.uid()) = 'edit';
$function$;

CREATE OR REPLACE FUNCTION public.can_view_plan(_plan_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.get_effective_plan_permission(_plan_id, auth.uid()) IN ('view', 'edit');
$function$;

CREATE OR REPLACE FUNCTION public.can_view_environment_roles(_environment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.environment_roles
    WHERE environment_id = _environment_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_finance_role(check_user_id uuid, required_roles text[] DEFAULT NULL)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.financial_roles
    WHERE user_id = check_user_id
    AND (required_roles IS NULL OR role = ANY(required_roles))
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_environment_id_for_user(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.environments WHERE owner_user_id = _user_id LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, is_system_user)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE((NEW.raw_user_meta_data ->> 'is_system_user')::boolean, false)
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_pending_invites()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  INSERT INTO public.environment_roles (
    environment_id, user_id, invited_by, invited_at, accepted_at,
    role_read, role_edit, role_delete, role_invite,
    perm_executive_dashboard, perm_reports, perm_finance,
    perm_media_plans, perm_media_resources, perm_taxonomy, perm_library
  )
  SELECT 
    COALESCE(pi.environment_id, (SELECT id FROM public.environments WHERE owner_user_id = pi.environment_owner_id LIMIT 1)),
    NEW.id, pi.invited_by, pi.created_at, NOW(),
    true,
    CASE WHEN pi.environment_role = 'admin' THEN true ELSE false END,
    CASE WHEN pi.environment_role = 'admin' THEN true ELSE false END,
    CASE WHEN pi.environment_role = 'admin' THEN true ELSE false END,
    pi.perm_executive_dashboard, pi.perm_reports, pi.perm_finance,
    pi.perm_media_plans, pi.perm_media_resources, pi.perm_taxonomy, pi.perm_library
  FROM public.pending_environment_invites pi
  WHERE LOWER(pi.email) = LOWER(NEW.email)
    AND pi.status = 'invited'
    AND pi.expires_at > NOW();
  UPDATE public.pending_environment_invites 
  SET status = 'accepted'
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'invited';
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_unique_plan_slug(p_user_id uuid, p_name text, p_current_id uuid DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
  exists_count INTEGER;
BEGIN
  base_slug := public.generate_slug(p_name);
  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'plano';
  END IF;
  final_slug := base_slug;
  LOOP
    SELECT COUNT(*) INTO exists_count 
    FROM public.media_plans 
    WHERE user_id = p_user_id 
      AND slug = final_slug 
      AND deleted_at IS NULL
      AND (p_current_id IS NULL OR id != p_current_id);
    IF exists_count = 0 THEN RETURN final_slug; END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_generate_plan_slug()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.slug IS NULL OR OLD.name IS DISTINCT FROM NEW.name THEN
    NEW.slug := public.generate_unique_plan_slug(NEW.user_id, NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_generate_line_utm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_vehicle_slug TEXT;
  v_channel_slug TEXT;
  v_subdivision_slug TEXT;
  v_moment_slug TEXT;
  v_funnel_slug TEXT;
  v_campaign_name TEXT;
BEGIN
  IF NEW.vehicle_id IS NOT NULL THEN
    SELECT slug INTO v_vehicle_slug FROM public.vehicles WHERE id = NEW.vehicle_id;
  END IF;
  IF NEW.channel_id IS NOT NULL THEN
    SELECT slug INTO v_channel_slug FROM public.channels WHERE id = NEW.channel_id;
  END IF;
  IF NEW.subdivision_id IS NOT NULL THEN
    SELECT slug INTO v_subdivision_slug FROM public.plan_subdivisions WHERE id = NEW.subdivision_id;
  END IF;
  IF NEW.moment_id IS NOT NULL THEN
    SELECT slug INTO v_moment_slug FROM public.moments WHERE id = NEW.moment_id;
  END IF;
  IF NEW.funnel_stage_id IS NOT NULL THEN
    SELECT slug INTO v_funnel_slug FROM public.funnel_stages WHERE id = NEW.funnel_stage_id;
  END IF;
  SELECT campaign INTO v_campaign_name FROM public.media_plans WHERE id = NEW.media_plan_id;
  NEW.utm_source := COALESCE(v_vehicle_slug, NEW.utm_source);
  NEW.utm_medium := COALESCE(v_channel_slug, NEW.utm_medium);
  NEW.utm_campaign := public.build_utm_campaign_string(
    NEW.line_code, v_campaign_name, v_subdivision_slug, v_moment_slug, v_funnel_slug
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_plan_version_snapshot(_plan_id uuid, _user_id uuid, _change_log text DEFAULT NULL)
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
  FROM media_plan_versions WHERE media_plan_id = _plan_id;

  SELECT jsonb_build_object(
    'plan', row_to_json(p),
    'lines', COALESCE((SELECT jsonb_agg(row_to_json(l)) FROM media_lines l WHERE l.media_plan_id = _plan_id), '[]'::jsonb),
    'distributions', COALESCE((SELECT jsonb_agg(row_to_json(d)) FROM plan_budget_distributions d WHERE d.media_plan_id = _plan_id), '[]'::jsonb),
    'monthly_budgets', COALESCE((SELECT jsonb_agg(row_to_json(mb)) FROM media_line_monthly_budgets mb JOIN media_lines ml ON mb.media_line_id = ml.id WHERE ml.media_plan_id = _plan_id), '[]'::jsonb),
    'line_details', COALESCE((SELECT jsonb_agg(row_to_json(ld)) FROM line_details ld WHERE ld.media_plan_id = _plan_id), '[]'::jsonb),
    'line_detail_items', COALESCE((SELECT jsonb_agg(row_to_json(ldi)) FROM line_detail_items ldi JOIN line_details ld ON ld.id = ldi.line_detail_id WHERE ld.media_plan_id = _plan_id), '[]'::jsonb),
    'line_detail_links', COALESCE((SELECT jsonb_agg(row_to_json(ldl)) FROM line_detail_line_links ldl JOIN line_details ld ON ld.id = ldl.line_detail_id WHERE ld.media_plan_id = _plan_id), '[]'::jsonb)
  ) INTO _snapshot FROM media_plans p WHERE p.id = _plan_id;

  IF _snapshot IS NULL THEN RETURN NULL; END IF;

  UPDATE media_plan_versions SET is_active = false
  WHERE media_plan_id = _plan_id AND is_active = true AND is_auto_backup = false;

  INSERT INTO media_plan_versions (media_plan_id, created_by, version_number, snapshot_data, change_log, is_active, is_auto_backup)
  VALUES (_plan_id, _user_id, _next_version, _snapshot, _change_log, true, false)
  ON CONFLICT (media_plan_id, version_number) DO UPDATE SET
    snapshot_data = EXCLUDED.snapshot_data, change_log = EXCLUDED.change_log,
    is_active = EXCLUDED.is_active, created_at = now()
  RETURNING id INTO _version_id;

  RETURN _version_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_auto_backup_snapshot(_plan_id uuid, _user_id uuid, _change_description text DEFAULT 'Alteração automática')
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
  WHERE media_plan_id = _plan_id AND is_auto_backup = true
  ORDER BY created_at DESC LIMIT 1;
  
  IF _last_backup IS NOT NULL AND _last_backup > NOW() - INTERVAL '30 seconds' THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO _next_version
  FROM media_plan_versions WHERE media_plan_id = _plan_id;

  SELECT jsonb_build_object(
    'plan', row_to_json(p),
    'lines', COALESCE((SELECT jsonb_agg(row_to_json(l)) FROM media_lines l WHERE l.media_plan_id = _plan_id), '[]'::jsonb),
    'distributions', COALESCE((SELECT jsonb_agg(row_to_json(d)) FROM plan_budget_distributions d WHERE d.media_plan_id = _plan_id), '[]'::jsonb),
    'monthly_budgets', COALESCE((SELECT jsonb_agg(row_to_json(mb)) FROM media_line_monthly_budgets mb JOIN media_lines ml ON mb.media_line_id = ml.id WHERE ml.media_plan_id = _plan_id), '[]'::jsonb),
    'line_details', COALESCE((SELECT jsonb_agg(row_to_json(ld)) FROM line_details ld WHERE ld.media_plan_id = _plan_id), '[]'::jsonb),
    'line_detail_items', COALESCE((SELECT jsonb_agg(row_to_json(ldi)) FROM line_detail_items ldi JOIN line_details ld ON ld.id = ldi.line_detail_id WHERE ld.media_plan_id = _plan_id), '[]'::jsonb),
    'line_detail_links', COALESCE((SELECT jsonb_agg(row_to_json(ldl)) FROM line_detail_line_links ldl JOIN line_details ld ON ld.id = ldl.line_detail_id WHERE ld.media_plan_id = _plan_id), '[]'::jsonb)
  ) INTO _snapshot FROM media_plans p WHERE p.id = _plan_id;

  IF _snapshot IS NULL THEN RETURN NULL; END IF;

  INSERT INTO media_plan_versions (media_plan_id, created_by, version_number, snapshot_data, change_log, is_auto_backup, is_active)
  VALUES (_plan_id, _user_id, _next_version, _snapshot, _change_description, true, false)
  ON CONFLICT (media_plan_id, version_number) DO NOTHING
  RETURNING id INTO _version_id;

  RETURN _version_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_auto_backups()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _deleted_count INTEGER;
BEGIN
  DELETE FROM media_plan_versions
  WHERE is_auto_backup = true AND created_at < NOW() - INTERVAL '15 days';
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  RETURN _deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_version_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.create_plan_version_snapshot(
      NEW.id, auth.uid(),
      'Status alterado de ' || COALESCE(OLD.status, 'null') || ' para ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_auto_backup_on_plan_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _change_desc TEXT;
BEGIN
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
  PERFORM create_auto_backup_snapshot(NEW.id, NEW.user_id, _change_desc);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_auto_backup_on_line_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _plan_id UUID;
  _user_id UUID;
  _change_desc TEXT;
BEGIN
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
  PERFORM create_auto_backup_snapshot(_plan_id, _user_id, _change_desc);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_log_creative_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  change_notes TEXT := '';
  log_type TEXT := 'status';
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.creative_change_logs (creative_id, change_date, notes, user_id, change_type)
    VALUES (NEW.id, now(), 'Criativo criado', NEW.user_id, 'status');
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.production_status IS DISTINCT FROM NEW.production_status THEN
      change_notes := 'Status alterado de "' || COALESCE(OLD.production_status, 'nenhum') || '" para "' || COALESCE(NEW.production_status, 'nenhum') || '"';
    END IF;
    IF OLD.piece_link IS DISTINCT FROM NEW.piece_link THEN
      IF change_notes != '' THEN change_notes := change_notes || '; '; END IF;
      IF NEW.piece_link IS NOT NULL AND OLD.piece_link IS NULL THEN
        change_notes := change_notes || 'Link da peça adicionado';
      ELSIF NEW.piece_link IS NULL AND OLD.piece_link IS NOT NULL THEN
        change_notes := change_notes || 'Link da peça removido';
      ELSE
        change_notes := change_notes || 'Link da peça atualizado';
      END IF;
    END IF;
    IF OLD.approved_date IS DISTINCT FROM NEW.approved_date THEN
      IF change_notes != '' THEN change_notes := change_notes || '; '; END IF;
      IF NEW.approved_date IS NOT NULL AND OLD.approved_date IS NULL THEN
        change_notes := change_notes || 'Criativo aprovado';
      ELSIF NEW.approved_date IS NULL AND OLD.approved_date IS NOT NULL THEN
        change_notes := change_notes || 'Aprovação removida';
      END IF;
    END IF;
    IF OLD.received_date IS DISTINCT FROM NEW.received_date THEN
      IF change_notes != '' THEN change_notes := change_notes || '; '; END IF;
      IF NEW.received_date IS NOT NULL AND OLD.received_date IS NULL THEN
        change_notes := change_notes || 'Data de recebimento registrada';
      END IF;
    END IF;
    IF change_notes != '' THEN
      INSERT INTO public.creative_change_logs (creative_id, change_date, notes, user_id, change_type)
      VALUES (NEW.id, now(), change_notes, NEW.user_id, 'status');
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NULL;
END;
$function$;

-- =====================================================
-- SECAO 14: RLS POLICIES
-- =====================================================

-- behavioral_segmentations
CREATE POLICY "Environment delete access for behavioral_segmentations" ON public.behavioral_segmentations FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for behavioral_segmentations" ON public.behavioral_segmentations FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for behavioral_segmentations" ON public.behavioral_segmentations FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for behavioral_segmentations" ON public.behavioral_segmentations FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- channels
CREATE POLICY "Environment delete access for channels" ON public.channels FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for channels" ON public.channels FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for channels" ON public.channels FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for channels" ON public.channels FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- clients
CREATE POLICY "Environment delete access for clients" ON public.clients FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for clients" ON public.clients FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for clients" ON public.clients FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for clients" ON public.clients FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- creative_change_logs
CREATE POLICY "Users can CRUD own change logs" ON public.creative_change_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert own change logs" ON public.creative_change_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view accessible change logs" ON public.creative_change_logs FOR SELECT USING (can_access_user_data(user_id));

-- creative_templates
CREATE POLICY "Environment delete access for creative_templates" ON public.creative_templates FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for creative_templates" ON public.creative_templates FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for creative_templates" ON public.creative_templates FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for creative_templates" ON public.creative_templates FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- creative_type_specifications
CREATE POLICY "Environment delete access for creative_type_specifications" ON public.creative_type_specifications FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for creative_type_specifications" ON public.creative_type_specifications FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for creative_type_specifications" ON public.creative_type_specifications FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for creative_type_specifications" ON public.creative_type_specifications FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- creative_types
CREATE POLICY "Anyone can view creative types" ON public.creative_types FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create creative types" ON public.creative_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete creative types" ON public.creative_types FOR DELETE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update creative types" ON public.creative_types FOR UPDATE USING (auth.uid() IS NOT NULL);

-- custom_kpis
CREATE POLICY "Environment delete access for custom_kpis" ON public.custom_kpis FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for custom_kpis" ON public.custom_kpis FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for custom_kpis" ON public.custom_kpis FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for custom_kpis" ON public.custom_kpis FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Users can delete own kpis" ON public.custom_kpis FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Users can insert custom kpis in accessible environments" ON public.custom_kpis FOR INSERT WITH CHECK ((user_id = auth.uid()) OR can_access_user_data_for_write(user_id));
CREATE POLICY "Users can insert own kpis" ON public.custom_kpis FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can manage own custom KPIs" ON public.custom_kpis FOR ALL USING ((user_id = auth.uid()) OR is_system_admin(auth.uid())) WITH CHECK ((user_id = auth.uid()) OR is_system_admin(auth.uid()));
CREATE POLICY "Users can update own kpis" ON public.custom_kpis FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can view accessible kpis" ON public.custom_kpis FOR SELECT USING (can_access_user_data(user_id));

-- data_sources
CREATE POLICY "Environment delete access for data_sources" ON public.data_sources FOR DELETE USING (has_environment_section_access(environment_id, 'reports', 'admin'));
CREATE POLICY "Environment insert access for data_sources" ON public.data_sources FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'reports', 'edit'));
CREATE POLICY "Environment read access for data_sources" ON public.data_sources FOR SELECT USING (has_environment_section_access(environment_id, 'reports', 'view'));
CREATE POLICY "Environment update access for data_sources" ON public.data_sources FOR UPDATE USING (has_environment_section_access(environment_id, 'reports', 'edit'));
CREATE POLICY "Users can create their own data sources" ON public.data_sources FOR INSERT WITH CHECK (auth.uid() = user_id);

-- environment_members
CREATE POLICY "Environment owners can add members" ON public.environment_members FOR INSERT WITH CHECK (((environment_owner_id = auth.uid()) AND can_invite_environment_member(environment_owner_id)) OR is_system_admin(auth.uid()));
CREATE POLICY "Environment owners can remove members" ON public.environment_members FOR DELETE USING ((environment_owner_id = auth.uid()) OR is_system_admin(auth.uid()));
CREATE POLICY "Environment owners can update members" ON public.environment_members FOR UPDATE USING ((environment_owner_id = auth.uid()) OR is_system_admin(auth.uid())) WITH CHECK ((environment_owner_id = auth.uid()) OR is_system_admin(auth.uid()));
CREATE POLICY "Users can view environment members" ON public.environment_members FOR SELECT USING ((environment_owner_id = auth.uid()) OR (member_user_id = auth.uid()) OR is_system_admin(auth.uid()));

-- environment_roles
CREATE POLICY "Environment owners can delete roles" ON public.environment_roles FOR DELETE TO authenticated USING (is_system_admin(auth.uid()) OR is_environment_owner_of(environment_id, auth.uid()));
CREATE POLICY "Environment owners can insert roles" ON public.environment_roles FOR INSERT TO authenticated WITH CHECK (is_system_admin(auth.uid()) OR is_environment_owner_of(environment_id, auth.uid()));
CREATE POLICY "Environment owners can update roles" ON public.environment_roles FOR UPDATE TO authenticated USING (is_system_admin(auth.uid()) OR is_environment_owner_of(environment_id, auth.uid())) WITH CHECK (is_system_admin(auth.uid()) OR is_environment_owner_of(environment_id, auth.uid()));
CREATE POLICY "Users can view environment roles" ON public.environment_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR is_system_admin(auth.uid()) OR is_environment_owner_of(environment_id, auth.uid()));

-- environments
CREATE POLICY "Environment admins can update environments" ON public.environments FOR UPDATE TO authenticated USING (is_system_admin(auth.uid()) OR (EXISTS (SELECT 1 FROM environment_roles er WHERE er.environment_id = environments.id AND er.user_id = auth.uid() AND er.is_environment_admin = true AND er.accepted_at IS NOT NULL)));
CREATE POLICY "Members can view their environments" ON public.environments FOR SELECT TO authenticated USING (is_system_admin(auth.uid()) OR (EXISTS (SELECT 1 FROM environment_roles er WHERE er.environment_id = environments.id AND er.user_id = auth.uid() AND er.accepted_at IS NOT NULL)));
CREATE POLICY "System admins can insert environments" ON public.environments FOR INSERT TO authenticated WITH CHECK (is_system_admin(auth.uid()));

-- file_extensions
CREATE POLICY "Anyone can view file extensions" ON public.file_extensions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage file extensions" ON public.file_extensions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- finance library tables (all use finance section access)
CREATE POLICY "Environment delete access for finance_account_managers" ON public.finance_account_managers FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));
CREATE POLICY "Environment insert access for finance_account_managers" ON public.finance_account_managers FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment read access for finance_account_managers" ON public.finance_account_managers FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment update access for finance_account_managers" ON public.finance_account_managers FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for finance_accounts" ON public.finance_accounts FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));
CREATE POLICY "Environment insert access for finance_accounts" ON public.finance_accounts FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment read access for finance_accounts" ON public.finance_accounts FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment update access for finance_accounts" ON public.finance_accounts FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for finance_campaign_projects" ON public.finance_campaign_projects FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));
CREATE POLICY "Environment insert access for finance_campaign_projects" ON public.finance_campaign_projects FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment read access for finance_campaign_projects" ON public.finance_campaign_projects FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment update access for finance_campaign_projects" ON public.finance_campaign_projects FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for finance_cost_centers" ON public.finance_cost_centers FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));
CREATE POLICY "Environment insert access for finance_cost_centers" ON public.finance_cost_centers FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment read access for finance_cost_centers" ON public.finance_cost_centers FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment update access for finance_cost_centers" ON public.finance_cost_centers FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for finance_document_types" ON public.finance_document_types FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));
CREATE POLICY "Environment insert access for finance_document_types" ON public.finance_document_types FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment read access for finance_document_types" ON public.finance_document_types FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment update access for finance_document_types" ON public.finance_document_types FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for finance_expense_classifications" ON public.finance_expense_classifications FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));
CREATE POLICY "Environment insert access for finance_expense_classifications" ON public.finance_expense_classifications FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment read access for finance_expense_classifications" ON public.finance_expense_classifications FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment update access for finance_expense_classifications" ON public.finance_expense_classifications FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for finance_macro_classifications" ON public.finance_macro_classifications FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));
CREATE POLICY "Environment insert access for finance_macro_classifications" ON public.finance_macro_classifications FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment read access for finance_macro_classifications" ON public.finance_macro_classifications FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment update access for finance_macro_classifications" ON public.finance_macro_classifications FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for finance_packages" ON public.finance_packages FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));
CREATE POLICY "Environment insert access for finance_packages" ON public.finance_packages FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment read access for finance_packages" ON public.finance_packages FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment update access for finance_packages" ON public.finance_packages FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for finance_request_types" ON public.finance_request_types FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));
CREATE POLICY "Environment insert access for finance_request_types" ON public.finance_request_types FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment read access for finance_request_types" ON public.finance_request_types FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment update access for finance_request_types" ON public.finance_request_types FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for finance_statuses" ON public.finance_statuses FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));
CREATE POLICY "Environment insert access for finance_statuses" ON public.finance_statuses FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment read access for finance_statuses" ON public.finance_statuses FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment update access for finance_statuses" ON public.finance_statuses FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for finance_teams" ON public.finance_teams FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));
CREATE POLICY "Environment insert access for finance_teams" ON public.finance_teams FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment read access for finance_teams" ON public.finance_teams FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment update access for finance_teams" ON public.finance_teams FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));

-- financial tables
CREATE POLICY "Environment read access for financial_actuals" ON public.financial_actuals FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment insert access for financial_actuals" ON public.financial_actuals FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment update access for financial_actuals" ON public.financial_actuals FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment delete access for financial_actuals" ON public.financial_actuals FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));

CREATE POLICY "Environment read access for financial_alert_configs" ON public.financial_alert_configs FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment insert access for financial_alert_configs" ON public.financial_alert_configs FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment update access for financial_alert_configs" ON public.financial_alert_configs FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment delete access for financial_alert_configs" ON public.financial_alert_configs FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));

CREATE POLICY "Environment read access for financial_audit_log" ON public.financial_audit_log FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment insert access for financial_audit_log" ON public.financial_audit_log FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment read access for financial_documents" ON public.financial_documents FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment insert access for financial_documents" ON public.financial_documents FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment update access for financial_documents" ON public.financial_documents FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment delete access for financial_documents" ON public.financial_documents FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));

CREATE POLICY "Environment read access for financial_forecasts" ON public.financial_forecasts FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment insert access for financial_forecasts" ON public.financial_forecasts FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment update access for financial_forecasts" ON public.financial_forecasts FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment delete access for financial_forecasts" ON public.financial_forecasts FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));

CREATE POLICY "Environment read access for financial_payments" ON public.financial_payments FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment insert access for financial_payments" ON public.financial_payments FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment update access for financial_payments" ON public.financial_payments FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment delete access for financial_payments" ON public.financial_payments FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));

CREATE POLICY "Environment read access for financial_revenues" ON public.financial_revenues FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment insert access for financial_revenues" ON public.financial_revenues FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment update access for financial_revenues" ON public.financial_revenues FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment delete access for financial_revenues" ON public.financial_revenues FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));

CREATE POLICY "Users can view own financial roles" ON public.financial_roles FOR SELECT USING (user_id = auth.uid() OR is_system_admin(auth.uid()));
CREATE POLICY "System admins can manage financial roles" ON public.financial_roles FOR ALL USING (is_system_admin(auth.uid())) WITH CHECK (is_system_admin(auth.uid()));

CREATE POLICY "Environment read access for financial_vendors" ON public.financial_vendors FOR SELECT USING (has_environment_section_access(environment_id, 'finance', 'view'));
CREATE POLICY "Environment insert access for financial_vendors" ON public.financial_vendors FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment update access for financial_vendors" ON public.financial_vendors FOR UPDATE USING (has_environment_section_access(environment_id, 'finance', 'edit'));
CREATE POLICY "Environment delete access for financial_vendors" ON public.financial_vendors FOR DELETE USING (has_environment_section_access(environment_id, 'finance', 'admin'));

-- format_creative_types
CREATE POLICY "Environment delete access for format_creative_types" ON public.format_creative_types FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for format_creative_types" ON public.format_creative_types FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for format_creative_types" ON public.format_creative_types FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for format_creative_types" ON public.format_creative_types FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- formats
CREATE POLICY "Environment delete access for formats" ON public.formats FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for formats" ON public.formats FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for formats" ON public.formats FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for formats" ON public.formats FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- funnel_stages
CREATE POLICY "Environment delete access for funnel_stages" ON public.funnel_stages FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for funnel_stages" ON public.funnel_stages FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for funnel_stages" ON public.funnel_stages FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for funnel_stages" ON public.funnel_stages FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- invite_audit_log
CREATE POLICY "System admins can view invite audit log" ON public.invite_audit_log FOR SELECT USING (is_system_admin(auth.uid()));
CREATE POLICY "Authenticated users can insert audit log" ON public.invite_audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- line_detail tables
CREATE POLICY "Environment read access for line_detail_insertions" ON public.line_detail_insertions FOR SELECT USING (has_environment_section_access(environment_id, 'media_plans', 'view'));
CREATE POLICY "Environment insert access for line_detail_insertions" ON public.line_detail_insertions FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment update access for line_detail_insertions" ON public.line_detail_insertions FOR UPDATE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment delete access for line_detail_insertions" ON public.line_detail_insertions FOR DELETE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment read access for line_detail_items" ON public.line_detail_items FOR SELECT USING (has_environment_section_access(environment_id, 'media_plans', 'view'));
CREATE POLICY "Environment insert access for line_detail_items" ON public.line_detail_items FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment update access for line_detail_items" ON public.line_detail_items FOR UPDATE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment delete access for line_detail_items" ON public.line_detail_items FOR DELETE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment read access for line_detail_line_links" ON public.line_detail_line_links FOR SELECT USING (has_environment_section_access(environment_id, 'media_plans', 'view'));
CREATE POLICY "Environment insert access for line_detail_line_links" ON public.line_detail_line_links FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment update access for line_detail_line_links" ON public.line_detail_line_links FOR UPDATE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment delete access for line_detail_line_links" ON public.line_detail_line_links FOR DELETE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment read access for line_detail_types" ON public.line_detail_types FOR SELECT USING (has_environment_section_access(environment_id, 'media_plans', 'view'));
CREATE POLICY "Environment insert access for line_detail_types" ON public.line_detail_types FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment update access for line_detail_types" ON public.line_detail_types FOR UPDATE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment delete access for line_detail_types" ON public.line_detail_types FOR DELETE USING (has_environment_section_access(environment_id, 'media_plans', 'admin'));

CREATE POLICY "Environment read access for line_details" ON public.line_details FOR SELECT USING (has_environment_section_access(environment_id, 'media_plans', 'view'));
CREATE POLICY "Environment insert access for line_details" ON public.line_details FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment update access for line_details" ON public.line_details FOR UPDATE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment delete access for line_details" ON public.line_details FOR DELETE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));

-- line_targets
CREATE POLICY "Environment read access for line_targets" ON public.line_targets FOR SELECT USING (has_environment_section_access(environment_id, 'media_plans', 'view'));
CREATE POLICY "Environment insert access for line_targets" ON public.line_targets FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment delete access for line_targets" ON public.line_targets FOR DELETE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));

-- media_creatives
CREATE POLICY "Environment read access for media_creatives" ON public.media_creatives FOR SELECT USING (has_environment_section_access(environment_id, 'media_plans', 'view'));
CREATE POLICY "Environment insert access for media_creatives" ON public.media_creatives FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment update access for media_creatives" ON public.media_creatives FOR UPDATE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment delete access for media_creatives" ON public.media_creatives FOR DELETE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));

-- media_line_monthly_budgets
CREATE POLICY "Environment read access for media_line_monthly_budgets" ON public.media_line_monthly_budgets FOR SELECT USING (has_environment_section_access(environment_id, 'media_plans', 'view'));
CREATE POLICY "Environment insert access for media_line_monthly_budgets" ON public.media_line_monthly_budgets FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment update access for media_line_monthly_budgets" ON public.media_line_monthly_budgets FOR UPDATE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment delete access for media_line_monthly_budgets" ON public.media_line_monthly_budgets FOR DELETE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));

-- media_lines
CREATE POLICY "Environment read access for media_lines" ON public.media_lines FOR SELECT USING (has_environment_section_access(environment_id, 'media_plans', 'view'));
CREATE POLICY "Environment insert access for media_lines" ON public.media_lines FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment update access for media_lines" ON public.media_lines FOR UPDATE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment delete access for media_lines" ON public.media_lines FOR DELETE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));

-- media_objectives
CREATE POLICY "Environment delete access for media_objectives" ON public.media_objectives FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for media_objectives" ON public.media_objectives FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for media_objectives" ON public.media_objectives FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for media_objectives" ON public.media_objectives FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- media_plan_followers
CREATE POLICY "Users can view plan followers" ON public.media_plan_followers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage own follows" ON public.media_plan_followers FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- media_plan_notification_state
CREATE POLICY "Users can manage notification state" ON public.media_plan_notification_state FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- media_plan_versions
CREATE POLICY "Users can view plan versions" ON public.media_plan_versions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert plan versions" ON public.media_plan_versions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update plan versions" ON public.media_plan_versions FOR UPDATE USING (auth.uid() IS NOT NULL);

-- media_plans
CREATE POLICY "Environment read access for media_plans" ON public.media_plans FOR SELECT USING (has_environment_section_access(environment_id, 'media_plans', 'view'));
CREATE POLICY "Environment insert access for media_plans" ON public.media_plans FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment update access for media_plans" ON public.media_plans FOR UPDATE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment delete access for media_plans" ON public.media_plans FOR DELETE USING (has_environment_section_access(environment_id, 'media_plans', 'admin'));

-- mediums
CREATE POLICY "Environment delete access for mediums" ON public.mediums FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for mediums" ON public.mediums FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for mediums" ON public.mediums FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for mediums" ON public.mediums FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- menu_visibility_settings
CREATE POLICY "Users can manage own menu settings" ON public.menu_visibility_settings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- moments
CREATE POLICY "Environment delete access for moments" ON public.moments FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for moments" ON public.moments FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for moments" ON public.moments FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for moments" ON public.moments FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- pending_environment_invites
CREATE POLICY "Admins can view pending invites" ON public.pending_environment_invites FOR SELECT USING (is_system_admin(auth.uid()) OR invited_by = auth.uid());
CREATE POLICY "Admins can insert pending invites" ON public.pending_environment_invites FOR INSERT WITH CHECK (is_system_admin(auth.uid()) OR auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update pending invites" ON public.pending_environment_invites FOR UPDATE USING (is_system_admin(auth.uid()) OR invited_by = auth.uid());
CREATE POLICY "Anyone can view by token" ON public.pending_environment_invites FOR SELECT USING (true);

-- performance_alerts
CREATE POLICY "Environment read access for performance_alerts" ON public.performance_alerts FOR SELECT USING (has_environment_section_access(environment_id, 'reports', 'view'));
CREATE POLICY "Environment insert access for performance_alerts" ON public.performance_alerts FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'reports', 'edit'));
CREATE POLICY "Environment update access for performance_alerts" ON public.performance_alerts FOR UPDATE USING (has_environment_section_access(environment_id, 'reports', 'edit'));

-- plan_budget_distributions
CREATE POLICY "Environment read access for plan_budget_distributions" ON public.plan_budget_distributions FOR SELECT USING (has_environment_section_access(environment_id, 'media_plans', 'view'));
CREATE POLICY "Environment insert access for plan_budget_distributions" ON public.plan_budget_distributions FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment update access for plan_budget_distributions" ON public.plan_budget_distributions FOR UPDATE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment delete access for plan_budget_distributions" ON public.plan_budget_distributions FOR DELETE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));

-- plan_custom_kpis
CREATE POLICY "Users can manage plan custom kpis" ON public.plan_custom_kpis FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- plan_permissions
CREATE POLICY "Users can view plan permissions" ON public.plan_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage plan permissions" ON public.plan_permissions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- plan_status_history
CREATE POLICY "Users can view status history" ON public.plan_status_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert status history" ON public.plan_status_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- plan_subdivisions
CREATE POLICY "Environment read access for plan_subdivisions" ON public.plan_subdivisions FOR SELECT USING (has_environment_section_access(environment_id, 'media_plans', 'view'));
CREATE POLICY "Environment insert access for plan_subdivisions" ON public.plan_subdivisions FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment update access for plan_subdivisions" ON public.plan_subdivisions FOR UPDATE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));
CREATE POLICY "Environment delete access for plan_subdivisions" ON public.plan_subdivisions FOR DELETE USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));

-- profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- report tables
CREATE POLICY "Environment read access for report_column_mappings" ON public.report_column_mappings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Environment insert access for report_column_mappings" ON public.report_column_mappings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Environment read access for report_data" ON public.report_data FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Environment insert access for report_data" ON public.report_data FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Environment delete access for report_data" ON public.report_data FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Environment read access for report_imports" ON public.report_imports FOR SELECT USING (has_environment_section_access(environment_id, 'reports', 'view'));
CREATE POLICY "Environment insert access for report_imports" ON public.report_imports FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'reports', 'edit'));
CREATE POLICY "Environment update access for report_imports" ON public.report_imports FOR UPDATE USING (has_environment_section_access(environment_id, 'reports', 'edit'));

CREATE POLICY "Environment read access for report_metrics" ON public.report_metrics FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Environment insert access for report_metrics" ON public.report_metrics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Environment update access for report_metrics" ON public.report_metrics FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Environment read access for report_periods" ON public.report_periods FOR SELECT USING (has_environment_section_access(environment_id, 'reports', 'view'));
CREATE POLICY "Environment insert access for report_periods" ON public.report_periods FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'reports', 'edit'));
CREATE POLICY "Environment update access for report_periods" ON public.report_periods FOR UPDATE USING (has_environment_section_access(environment_id, 'reports', 'edit'));
CREATE POLICY "Environment delete access for report_periods" ON public.report_periods FOR DELETE USING (has_environment_section_access(environment_id, 'reports', 'edit'));

-- specification tables (inherit environment from parent)
CREATE POLICY "Anyone can view specification_copy_fields" ON public.specification_copy_fields FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage specification_copy_fields" ON public.specification_copy_fields FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view specification_dimensions" ON public.specification_dimensions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage specification_dimensions" ON public.specification_dimensions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view specification_extensions" ON public.specification_extensions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage specification_extensions" ON public.specification_extensions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- status_transitions
CREATE POLICY "Environment read access for status_transitions" ON public.status_transitions FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment insert access for status_transitions" ON public.status_transitions FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment delete access for status_transitions" ON public.status_transitions FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));

-- statuses
CREATE POLICY "Environment delete access for statuses" ON public.statuses FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for statuses" ON public.statuses FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for statuses" ON public.statuses FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for statuses" ON public.statuses FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- system_access_requests
CREATE POLICY "Users can view own requests" ON public.system_access_requests FOR SELECT USING (user_id = auth.uid() OR is_system_admin(auth.uid()));
CREATE POLICY "Users can insert requests" ON public.system_access_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update requests" ON public.system_access_requests FOR UPDATE USING (is_system_admin(auth.uid()));

-- system_roles
CREATE POLICY "System admins can view roles" ON public.system_roles FOR SELECT USING (is_system_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "System admins can manage roles" ON public.system_roles FOR ALL USING (is_system_admin(auth.uid())) WITH CHECK (is_system_admin(auth.uid()));

-- targets
CREATE POLICY "Environment delete access for targets" ON public.targets FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for targets" ON public.targets FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for targets" ON public.targets FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for targets" ON public.targets FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- vehicles
CREATE POLICY "Environment delete access for vehicles" ON public.vehicles FOR DELETE USING (has_environment_section_access(environment_id, 'library', 'admin'));
CREATE POLICY "Environment insert access for vehicles" ON public.vehicles FOR INSERT WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));
CREATE POLICY "Environment read access for vehicles" ON public.vehicles FOR SELECT USING (has_environment_section_access(environment_id, 'library', 'view'));
CREATE POLICY "Environment update access for vehicles" ON public.vehicles FOR UPDATE USING (has_environment_section_access(environment_id, 'library', 'edit'));

-- =====================================================
-- SECAO 15: TRIGGERS
-- =====================================================

-- updated_at triggers
CREATE TRIGGER update_behavioral_segmentations_updated_at BEFORE UPDATE ON public.behavioral_segmentations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creative_templates_updated_at BEFORE UPDATE ON public.creative_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creative_type_specifications_updated_at BEFORE UPDATE ON public.creative_type_specifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creative_types_updated_at BEFORE UPDATE ON public.creative_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_kpis_updated_at BEFORE UPDATE ON public.custom_kpis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_environment_members_updated_at BEFORE UPDATE ON public.environment_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_actuals_updated_at BEFORE UPDATE ON public.financial_actuals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_alert_configs_updated_at BEFORE UPDATE ON public.financial_alert_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_documents_updated_at BEFORE UPDATE ON public.financial_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_forecasts_updated_at BEFORE UPDATE ON public.financial_forecasts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_payments_updated_at BEFORE UPDATE ON public.financial_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_revenues_updated_at BEFORE UPDATE ON public.financial_revenues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_vendors_updated_at BEFORE UPDATE ON public.financial_vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_format_creative_types_updated_at BEFORE UPDATE ON public.format_creative_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_formats_updated_at BEFORE UPDATE ON public.formats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_funnel_stages_updated_at BEFORE UPDATE ON public.funnel_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_lines_updated_at BEFORE UPDATE ON public.media_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_plans_updated_at BEFORE UPDATE ON public.media_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mediums_updated_at BEFORE UPDATE ON public.mediums FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_moments_updated_at BEFORE UPDATE ON public.moments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_statuses_updated_at BEFORE UPDATE ON public.statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-slug triggers
CREATE TRIGGER auto_slug_channels BEFORE INSERT ON public.channels FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE TRIGGER auto_generate_clients_slug BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE TRIGGER auto_slug_formats BEFORE INSERT ON public.formats FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE TRIGGER auto_slug_funnel_stages BEFORE INSERT ON public.funnel_stages FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE TRIGGER auto_slug_mediums BEFORE INSERT ON public.mediums FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE TRIGGER auto_slug_moments BEFORE INSERT ON public.moments FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE TRIGGER auto_slug_vehicles BEFORE INSERT ON public.vehicles FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE TRIGGER auto_slug_plan_subdivisions BEFORE INSERT ON public.plan_subdivisions FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();

-- Plan slug trigger
CREATE TRIGGER auto_plan_slug BEFORE INSERT OR UPDATE ON public.media_plans FOR EACH ROW EXECUTE FUNCTION auto_generate_plan_slug();

-- UTM auto-generation trigger
CREATE TRIGGER auto_line_utm BEFORE INSERT OR UPDATE ON public.media_lines FOR EACH ROW EXECUTE FUNCTION auto_generate_line_utm();

-- Creative ID trigger
CREATE TRIGGER set_creative_id_trigger BEFORE INSERT ON public.media_creatives FOR EACH ROW EXECUTE FUNCTION set_creative_id();

-- Creative change logging trigger
CREATE TRIGGER auto_log_creative_changes_trigger AFTER INSERT OR UPDATE ON public.media_creatives FOR EACH ROW EXECUTE FUNCTION auto_log_creative_changes();

-- Environment member limit trigger
CREATE TRIGGER enforce_member_limit BEFORE INSERT ON public.environment_members FOR EACH ROW EXECUTE FUNCTION enforce_environment_member_limit();

-- Prevent last admin removal trigger
CREATE TRIGGER check_last_admin BEFORE DELETE OR UPDATE ON public.environment_roles FOR EACH ROW EXECUTE FUNCTION prevent_last_admin_removal();

-- Line detail links triggers
CREATE TRIGGER update_line_detail_links_timestamp BEFORE UPDATE ON public.line_detail_line_links FOR EACH ROW EXECUTE FUNCTION update_line_detail_links_updated_at();
CREATE TRIGGER validate_allocation_on_link BEFORE INSERT OR UPDATE ON public.line_detail_line_links FOR EACH ROW EXECUTE FUNCTION validate_allocation_percentage();

-- Auto backup triggers
CREATE TRIGGER auto_backup_on_plan_change AFTER UPDATE ON public.media_plans FOR EACH ROW EXECUTE FUNCTION trigger_auto_backup_on_plan_change();
CREATE TRIGGER auto_backup_on_line_change AFTER INSERT OR UPDATE OR DELETE ON public.media_lines FOR EACH ROW EXECUTE FUNCTION trigger_auto_backup_on_line_change();

-- Version on status change trigger
CREATE TRIGGER version_on_status_change AFTER UPDATE ON public.media_plans FOR EACH ROW EXECUTE FUNCTION auto_version_on_status_change();

-- =====================================================
-- SECAO 16: TRIGGERS EM auth.users
-- =====================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_user_process_pending_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.process_pending_invites();

-- =====================================================
-- SECAO 17: STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('environment-logos', 'environment-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view environment logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'environment-logos');

CREATE POLICY "Environment admins can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'environment-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Environment admins can update logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'environment-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Environment admins can delete logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'environment-logos' AND auth.role() = 'authenticated');

-- =====================================================
-- FIM DA MIGRACAO
-- =====================================================
