import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  LayoutDashboard,
  ArrowLeft,
  Database,
  Shield,
  Key,
  Server,
  Code,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileCode,
  Globe,
  Lock,
  Layers,
  Table,
  FunctionSquare,
  Workflow,
  HardDrive,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ===== SQL Sections =====

const ENUMS_SQL = `-- =============================================
-- SEÇÃO 1: ENUMS
-- =============================================

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
END $$;`;

const UTILITY_FUNCTIONS_SQL = `-- =============================================
-- SEÇÃO 2: FUNÇÕES UTILITÁRIAS (sem dependência de tabelas)
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_slug(input_text text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
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
          '\\s+', '-', 'g'
        ),
        '[^a-zA-Z0-9-]', '', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.name IS NOT NULL AND (NEW.slug IS NULL OR OLD.name IS DISTINCT FROM NEW.name) THEN
    NEW.slug := public.generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_creative_id()
RETURNS text LANGUAGE plpgsql SET search_path TO 'public' AS $$
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
    IF exists_count = 0 THEN RETURN new_id; END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_creative_id()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.creative_id IS NULL THEN
    NEW.creative_id := public.generate_creative_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.build_utm_campaign_string(p_line_code text, p_campaign_name text, p_subdivision_slug text, p_moment_slug text, p_funnel_slug text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_plan_slug(p_user_id uuid, p_name text, p_current_id uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
  exists_count INTEGER;
BEGIN
  base_slug := public.generate_slug(p_name);
  IF base_slug IS NULL OR base_slug = '' THEN base_slug := 'plano'; END IF;
  final_slug := base_slug;
  LOOP
    SELECT COUNT(*) INTO exists_count FROM public.media_plans
    WHERE user_id = p_user_id AND slug = final_slug AND deleted_at IS NULL
      AND (p_current_id IS NULL OR id != p_current_id);
    IF exists_count = 0 THEN RETURN final_slug; END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_plan_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.slug IS NULL OR OLD.name IS DISTINCT FROM NEW.name THEN
    NEW.slug := public.generate_unique_plan_slug(NEW.user_id, NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_allocation_percentage()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_line_detail_links_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;`;

const TABLES_L0_SQL = `-- =============================================
-- SEÇÃO 3: TABELAS NÍVEL 0 (sem FK para public)
-- =============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  company TEXT,
  avatar_url TEXT,
  is_system_user BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.system_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.system_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.system_access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.environments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  cnpj TEXT,
  address TEXT,
  logo_url TEXT,
  color_scheme TEXT NOT NULL DEFAULT 'default',
  owner_user_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creative_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.file_extensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_visibility_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_key TEXT NOT NULL UNIQUE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const TABLES_L1_SQL = `-- =============================================
-- SEÇÃO 4: TABELAS NÍVEL 1
-- =============================================

CREATE TABLE IF NOT EXISTS public.environment_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_owner_id UUID NOT NULL,
  member_user_id UUID NOT NULL,
  environment_role public.environment_role NOT NULL DEFAULT 'user',
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  perm_executive_dashboard public.environment_permission_level DEFAULT 'none',
  perm_reports public.environment_permission_level DEFAULT 'none',
  perm_finance public.environment_permission_level DEFAULT 'none',
  perm_media_plans public.environment_permission_level DEFAULT 'none',
  perm_media_resources public.environment_permission_level DEFAULT 'none',
  perm_taxonomy public.environment_permission_level DEFAULT 'none',
  perm_library public.environment_permission_level DEFAULT 'none',
  notify_media_resources BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_membership CHECK (environment_owner_id <> member_user_id)
);

CREATE TABLE IF NOT EXISTS public.environment_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_read BOOLEAN NOT NULL DEFAULT true,
  role_edit BOOLEAN NOT NULL DEFAULT false,
  role_delete BOOLEAN NOT NULL DEFAULT false,
  role_invite BOOLEAN NOT NULL DEFAULT false,
  is_environment_admin BOOLEAN NOT NULL DEFAULT false,
  perm_executive_dashboard public.environment_permission_level DEFAULT 'none',
  perm_reports public.environment_permission_level DEFAULT 'none',
  perm_finance public.environment_permission_level DEFAULT 'none',
  perm_media_plans public.environment_permission_level DEFAULT 'none',
  perm_media_resources public.environment_permission_level DEFAULT 'none',
  perm_taxonomy public.environment_permission_level DEFAULT 'none',
  perm_library public.environment_permission_level DEFAULT 'none',
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(environment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.invite_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID REFERENCES environments(id) ON DELETE SET NULL,
  invite_type TEXT NOT NULL,
  email TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invite_audit_log_invite_type_check CHECK (invite_type IN ('system_user', 'environment_member')),
  CONSTRAINT invite_audit_log_action_check CHECK (action IN ('invited', 'accepted', 'expired', 'revoked', 'resent'))
);

CREATE TABLE IF NOT EXISTS public.pending_environment_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID REFERENCES environments(id),
  environment_owner_id UUID,
  email TEXT NOT NULL,
  invite_type TEXT NOT NULL DEFAULT 'environment_member',
  environment_role public.environment_role DEFAULT 'user',
  invited_by UUID,
  status TEXT NOT NULL DEFAULT 'invited',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  perm_executive_dashboard public.environment_permission_level DEFAULT 'none',
  perm_reports public.environment_permission_level DEFAULT 'none',
  perm_finance public.environment_permission_level DEFAULT 'none',
  perm_media_plans public.environment_permission_level DEFAULT 'none',
  perm_media_resources public.environment_permission_level DEFAULT 'none',
  perm_taxonomy public.environment_permission_level DEFAULT 'none',
  perm_library public.environment_permission_level DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pending_environment_invites_invite_type_check CHECK (invite_type IN ('system_user', 'environment_member')),
  CONSTRAINT pending_environment_invites_status_check CHECK (status IN ('invited', 'accepted', 'expired', 'revoked'))
);

CREATE TABLE IF NOT EXISTS public.mediums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  slug TEXT,
  is_active BOOLEAN DEFAULT true,
  visible_for_media_plans BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(25) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT statuses_name_max_length CHECK (char_length(name::text) <= 25)
);

CREATE TABLE IF NOT EXISTS public.moments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.funnel_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.formats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '%',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT data_sources_source_type_check CHECK (source_type IN ('google_sheets', 'csv_upload', 'google_ads_api', 'meta_api', 'manual'))
);

CREATE TABLE IF NOT EXISTS public.media_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.line_detail_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category public.detail_category NOT NULL DEFAULT 'custom',
  field_schema JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_roles_role_check CHECK (role IN ('finance_admin', 'finance_editor', 'finance_viewer', 'finance_approver')),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.financial_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  document TEXT,
  category TEXT,
  payment_terms TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_alert_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  threshold_percentage NUMERIC DEFAULT 10,
  threshold_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT financial_alert_configs_alert_type_check CHECK (alert_type IN ('overspend', 'underspend', 'overdue', 'variance'))
);

CREATE TABLE IF NOT EXISTS public.financial_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  reason TEXT,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT financial_audit_log_entity_type_check CHECK (entity_type IN ('forecast', 'actual', 'document', 'payment', 'vendor', 'revenue')),
  CONSTRAINT financial_audit_log_action_check CHECK (action IN ('create', 'update', 'delete', 'approve', 'lock', 'unlock'))
);

-- Finance library tables (all Nível 1 - depend on environments only)
CREATE TABLE IF NOT EXISTS public.finance_account_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_campaign_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  full_name TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_document_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_macro_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_request_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.behavioral_segmentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const TABLES_L2_SQL = `-- =============================================
-- SEÇÃO 5: TABELAS NÍVEL 2
-- =============================================

CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  medium_id UUID REFERENCES mediums(id) ON DELETE CASCADE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  age_range TEXT,
  gender TEXT,
  geo_location TEXT,
  interests TEXT,
  behavioral_segmentation_id UUID,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.status_transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_status_id UUID REFERENCES statuses(id),
  to_status_id UUID NOT NULL REFERENCES statuses(id),
  is_system BOOLEAN DEFAULT false,
  required_roles TEXT[] DEFAULT '{}',
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_expense_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  macro_classification_id UUID REFERENCES finance_macro_classifications(id),
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.format_creative_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  format_id UUID NOT NULL REFERENCES formats(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign TEXT,
  description TEXT,
  slug TEXT,
  start_date DATE,
  end_date DATE,
  total_budget NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  default_url TEXT,
  client_id UUID REFERENCES clients(id),
  environment_id UUID REFERENCES environments(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT media_plans_status_check CHECK (status IN ('draft', 'active', 'completed', 'paused'))
);

CREATE TABLE IF NOT EXISTS public.plan_subdivisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  parent_id UUID REFERENCES plan_subdivisions(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const TABLES_L3_SQL = `-- =============================================
-- SEÇÃO 6: TABELAS NÍVEL 3
-- =============================================

CREATE TABLE IF NOT EXISTS public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creative_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  format TEXT NOT NULL,
  dimension TEXT,
  duration TEXT,
  message TEXT,
  objective TEXT,
  dimensions JSONB DEFAULT '[]'::jsonb,
  creative_type_id UUID REFERENCES creative_types(id),
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT creative_templates_name_max_length CHECK (char_length(name) <= 25)
);

CREATE TABLE IF NOT EXISTS public.creative_type_specifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creative_type_id UUID NOT NULL REFERENCES format_creative_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  has_duration BOOLEAN DEFAULT false,
  duration_value NUMERIC,
  duration_unit TEXT,
  max_weight NUMERIC,
  weight_unit TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_budget_distributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  distribution_type TEXT NOT NULL,
  reference_id UUID,
  reference_name TEXT,
  percentage NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  parent_distribution_id UUID REFERENCES plan_budget_distributions(id) ON DELETE CASCADE,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plan_budget_distributions_distribution_type_check CHECK (distribution_type IN ('subdivision', 'moment', 'funnel_stage', 'temporal'))
);

CREATE TABLE IF NOT EXISTS public.plan_custom_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  custom_kpi_id UUID NOT NULL REFERENCES custom_kpis(id) ON DELETE CASCADE,
  target_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(media_plan_id, custom_kpi_id)
);

CREATE TABLE IF NOT EXISTS public.plan_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level public.plan_permission_level NOT NULL DEFAULT 'view',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(media_plan_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.plan_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_plan_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  created_by UUID,
  version_number INTEGER NOT NULL,
  snapshot_data JSONB,
  change_log TEXT,
  is_active BOOLEAN DEFAULT false,
  is_auto_backup BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(media_plan_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.media_plan_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(media_plan_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.media_plan_notification_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_seen_version INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(media_plan_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.financial_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES financial_vendors(id),
  vendor_name TEXT,
  document_type TEXT NOT NULL DEFAULT 'invoice',
  document_number TEXT,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'received',
  related_dimensions_json JSONB DEFAULT '{}'::jsonb,
  attachment_urls JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  -- Extended fields
  competency_month TEXT,
  competency_month_erp TEXT,
  account_manager TEXT,
  campaign_project TEXT,
  product TEXT,
  cost_center_name TEXT,
  cost_center_code TEXT,
  team TEXT,
  financial_account TEXT,
  package TEXT,
  service_description TEXT,
  macro_classification TEXT,
  expense_classification TEXT,
  cms_sent_date TEXT,
  contract_reference TEXT,
  request_type TEXT,
  invoice_received_date TEXT,
  rir_task_number TEXT,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT financial_documents_document_type_check CHECK (document_type IN ('invoice', 'boleto', 'receipt', 'credit_note', 'other')),
  CONSTRAINT financial_documents_status_check CHECK (status IN ('received', 'verified', 'approved', 'scheduled', 'paid', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.financial_actuals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  dimensions_json JSONB DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'manual',
  import_batch_id TEXT,
  notes TEXT,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT financial_actuals_source_check CHECK (source IN ('manual', 'import', 'api'))
);

CREATE TABLE IF NOT EXISTS public.financial_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  granularity TEXT NOT NULL DEFAULT 'month',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  planned_amount NUMERIC NOT NULL DEFAULT 0,
  dimensions_json JSONB DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'derived_from_plan',
  is_locked BOOLEAN DEFAULT false,
  reason TEXT,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT financial_forecasts_granularity_check CHECK (granularity IN ('day', 'week', 'month')),
  CONSTRAINT financial_forecasts_source_check CHECK (source IN ('derived_from_plan', 'manual_adjustment'))
);

CREATE TABLE IF NOT EXISTS public.financial_revenues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_plan_id UUID REFERENCES media_plans(id) ON DELETE SET NULL,
  product_name TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  revenue_amount NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT financial_revenues_source_check CHECK (source IN ('crm', 'manual', 'import'))
);

CREATE TABLE IF NOT EXISTS public.report_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_plan_id UUID REFERENCES media_plans(id) ON DELETE CASCADE,
  file_name TEXT,
  status TEXT DEFAULT 'pending',
  row_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);`;

const TABLES_L4_SQL = `-- =============================================
-- SEÇÃO 7: TABELAS NÍVEL 4
-- =============================================

CREATE TABLE IF NOT EXISTS public.media_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  line_code TEXT,
  name TEXT,
  description TEXT,
  budget NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  impressions NUMERIC,
  clicks NUMERIC,
  ctr NUMERIC,
  cpc NUMERIC,
  cpm NUMERIC,
  frequency NUMERIC,
  reach NUMERIC,
  views NUMERIC,
  cpv NUMERIC,
  conversions NUMERIC,
  conversion_rate NUMERIC,
  cpa NUMERIC,
  engagement NUMERIC,
  engagement_rate NUMERIC,
  funnel_stage TEXT,
  budget_allocation TEXT DEFAULT 'campaign',
  medium_id UUID REFERENCES mediums(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  target_id UUID REFERENCES targets(id) ON DELETE SET NULL,
  moment_id UUID REFERENCES moments(id) ON DELETE SET NULL,
  funnel_stage_id UUID REFERENCES funnel_stages(id) ON DELETE SET NULL,
  creative_template_id UUID REFERENCES creative_templates(id) ON DELETE SET NULL,
  status_id UUID REFERENCES statuses(id),
  objective_id UUID REFERENCES media_objectives(id),
  subdivision_id UUID REFERENCES plan_subdivisions(id) ON DELETE SET NULL,
  -- UTM fields
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  destination_url TEXT,
  -- Metadata
  position INTEGER,
  custom_kpi_values JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT media_lines_budget_allocation_check CHECK (budget_allocation IN ('campaign', 'creative')),
  CONSTRAINT media_lines_funnel_stage_check CHECK (funnel_stage IN ('top', 'middle', 'bottom'))
);

CREATE TABLE IF NOT EXISTS public.specification_copy_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specification_id UUID NOT NULL REFERENCES creative_type_specifications(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  max_characters INTEGER,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.specification_dimensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specification_id UUID NOT NULL REFERENCES creative_type_specifications(id) ON DELETE CASCADE,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  unit TEXT DEFAULT 'px',
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.specification_extensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specification_id UUID NOT NULL REFERENCES creative_type_specifications(id) ON DELETE CASCADE,
  extension_id UUID NOT NULL REFERENCES file_extensions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  financial_document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL DEFAULT 1,
  planned_payment_date DATE NOT NULL,
  actual_payment_date DATE,
  planned_amount NUMERIC NOT NULL,
  paid_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'scheduled',
  payment_method TEXT,
  proof_url TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT financial_payments_status_check CHECK (status IN ('scheduled', 'paid', 'partial', 'cancelled', 'overdue')),
  CONSTRAINT financial_payments_payment_method_check CHECK (payment_method IN ('pix', 'boleto', 'transfer', 'card', 'other'))
);

CREATE TABLE IF NOT EXISTS public.report_column_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES report_imports(id) ON DELETE CASCADE,
  source_column TEXT NOT NULL,
  target_field TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_period_id UUID NOT NULL REFERENCES report_periods(id) ON DELETE CASCADE,
  data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
  media_line_id UUID REFERENCES media_lines(id) ON DELETE SET NULL,
  impressions NUMERIC DEFAULT 0,
  clicks NUMERIC DEFAULT 0,
  conversions NUMERIC DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  custom_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);`;

const TABLES_L5_SQL = `-- =============================================
-- SEÇÃO 8: TABELAS NÍVEL 5
-- =============================================

CREATE TABLE IF NOT EXISTS public.media_line_monthly_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_line_id UUID NOT NULL REFERENCES media_lines(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(media_line_id, year_month)
);

CREATE TABLE IF NOT EXISTS public.line_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_line_id UUID NOT NULL REFERENCES media_lines(id) ON DELETE CASCADE,
  kpi_key TEXT NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 0,
  target_type TEXT NOT NULL DEFAULT 'min',
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT line_targets_target_type_check CHECK (target_type IN ('min', 'max', 'exact'))
);

CREATE TABLE IF NOT EXISTS public.media_creatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_line_id UUID NOT NULL REFERENCES media_lines(id) ON DELETE CASCADE,
  creative_id TEXT,
  name TEXT,
  format_id UUID REFERENCES formats(id) ON DELETE SET NULL,
  format_name TEXT,
  dimension TEXT,
  file_type TEXT,
  piece_link TEXT,
  production_status TEXT DEFAULT 'requested',
  requested_date TIMESTAMPTZ DEFAULT now(),
  received_date TIMESTAMPTZ,
  approved_date TIMESTAMPTZ,
  budget NUMERIC DEFAULT 0,
  utm_content TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.performance_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  media_line_id UUID REFERENCES media_lines(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT performance_alerts_severity_check CHECK (severity IN ('info', 'warning', 'critical'))
);

CREATE TABLE IF NOT EXISTS public.report_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  media_line_id UUID REFERENCES media_lines(id) ON DELETE SET NULL,
  import_id UUID REFERENCES report_imports(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  impressions NUMERIC DEFAULT 0,
  clicks NUMERIC DEFAULT 0,
  conversions NUMERIC DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  views NUMERIC DEFAULT 0,
  engagement NUMERIC DEFAULT 0,
  reach NUMERIC DEFAULT 0,
  custom_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.line_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  detail_type_id UUID NOT NULL REFERENCES line_detail_types(id),
  media_line_id UUID REFERENCES media_lines(id) ON DELETE CASCADE,
  name TEXT,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const TABLES_L6_SQL = `-- =============================================
-- SEÇÃO 9: TABELAS NÍVEL 6
-- =============================================

CREATE TABLE IF NOT EXISTS public.creative_change_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creative_id UUID NOT NULL REFERENCES media_creatives(id) ON DELETE CASCADE,
  change_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  user_id UUID NOT NULL,
  change_type TEXT DEFAULT 'comment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.line_detail_line_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_detail_id UUID NOT NULL REFERENCES line_details(id) ON DELETE CASCADE,
  media_line_id UUID NOT NULL REFERENCES media_lines(id) ON DELETE CASCADE,
  allocated_percentage NUMERIC(5,2) NOT NULL DEFAULT 100,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.line_detail_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_detail_id UUID NOT NULL REFERENCES line_details(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget NUMERIC DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  status_id UUID REFERENCES statuses(id),
  format_id UUID REFERENCES formats(id),
  creative_id UUID REFERENCES media_creatives(id) ON DELETE SET NULL,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  position INTEGER DEFAULT 0,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const TABLES_L7_SQL = `-- =============================================
-- SEÇÃO 10: TABELAS NÍVEL 7
-- =============================================

CREATE TABLE IF NOT EXISTS public.line_detail_insertions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_detail_item_id UUID NOT NULL REFERENCES line_detail_items(id) ON DELETE CASCADE,
  insertion_date DATE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  notes TEXT,
  environment_id UUID REFERENCES environments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const INDEXES_SQL = `-- =============================================
-- SEÇÃO 11: ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_behavioral_segmentations_active ON public.behavioral_segmentations USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_behavioral_segmentations_environment ON public.behavioral_segmentations USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_channels_active ON public.channels USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_channels_environment ON public.channels USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON public.clients USING btree (deleted_at);
CREATE INDEX IF NOT EXISTS idx_clients_environment ON public.clients USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_creative_change_logs_date ON public.creative_change_logs USING btree (change_date);
CREATE INDEX IF NOT EXISTS idx_creative_templates_active ON public.creative_templates USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_creative_templates_environment ON public.creative_templates USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_creative_type_specifications_active ON public.creative_type_specifications USING btree (user_id) WHERE deleted_at IS NULL;
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
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_environment ON public.financial_audit_log USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_environment ON public.financial_documents USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_plan ON public.financial_documents USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_financial_forecasts_environment ON public.financial_forecasts USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_forecasts_plan ON public.financial_forecasts USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_financial_payments_document ON public.financial_payments USING btree (financial_document_id);
CREATE INDEX IF NOT EXISTS idx_financial_payments_environment ON public.financial_payments USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_revenues_environment ON public.financial_revenues USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_revenues_plan ON public.financial_revenues USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_financial_vendors_environment ON public.financial_vendors USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_format_creative_types_active ON public.format_creative_types USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_format_creative_types_environment ON public.format_creative_types USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_formats_active ON public.formats USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_formats_environment ON public.formats USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_funnel_stages_active ON public.funnel_stages USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_funnel_stages_environment ON public.funnel_stages USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_invite_audit_log_email ON public.invite_audit_log USING btree (email);
CREATE INDEX IF NOT EXISTS idx_invite_audit_log_environment ON public.invite_audit_log USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_insertions_environment ON public.line_detail_insertions USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_insertions_item ON public.line_detail_insertions USING btree (line_detail_item_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_items_environment ON public.line_detail_items USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_line_links_detail ON public.line_detail_line_links USING btree (line_detail_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_line_links_environment ON public.line_detail_line_links USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_line_links_line ON public.line_detail_line_links USING btree (media_line_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_types_active ON public.line_detail_types USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_line_detail_types_environment ON public.line_detail_types USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_details_environment ON public.line_details USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_details_plan ON public.line_details USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_line_targets_environment ON public.line_targets USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_line_targets_line ON public.line_targets USING btree (media_line_id);
CREATE INDEX IF NOT EXISTS idx_media_creatives_active ON public.media_creatives USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_creatives_environment ON public.media_creatives USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_media_creatives_line ON public.media_creatives USING btree (media_line_id);
CREATE INDEX IF NOT EXISTS idx_media_line_monthly_budgets_environment ON public.media_line_monthly_budgets USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_media_line_monthly_budgets_line ON public.media_line_monthly_budgets USING btree (media_line_id);
CREATE INDEX IF NOT EXISTS idx_media_lines_active ON public.media_lines USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_lines_environment ON public.media_lines USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_media_lines_plan ON public.media_lines USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_media_objectives_active ON public.media_objectives USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_objectives_environment ON public.media_objectives USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_media_plan_followers_plan ON public.media_plan_followers USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_media_plan_followers_user ON public.media_plan_followers USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_media_plan_notification_state_plan ON public.media_plan_notification_state USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_media_plan_versions_plan ON public.media_plan_versions USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_media_plans_active ON public.media_plans USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_plans_environment ON public.media_plans USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_media_plans_slug ON public.media_plans USING btree (slug);
CREATE INDEX IF NOT EXISTS idx_mediums_active ON public.mediums USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mediums_environment ON public.mediums USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_moments_active ON public.moments USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_moments_environment ON public.moments USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON public.pending_environment_invites USING btree (email);
CREATE INDEX IF NOT EXISTS idx_pending_invites_environment ON public.pending_environment_invites USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_environment ON public.performance_alerts USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_plan ON public.performance_alerts USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_budget_distributions_environment ON public.plan_budget_distributions USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_plan_budget_distributions_plan ON public.plan_budget_distributions USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_subdivisions_active ON public.plan_subdivisions USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_plan_subdivisions_environment ON public.plan_subdivisions USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_report_data_plan ON public.report_data USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_report_imports_environment ON public.report_imports USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_report_metrics_period ON public.report_metrics USING btree (report_period_id);
CREATE INDEX IF NOT EXISTS idx_report_periods_environment ON public.report_periods USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_report_periods_plan ON public.report_periods USING btree (media_plan_id);
CREATE INDEX IF NOT EXISTS idx_status_transitions_environment ON public.status_transitions USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_statuses_active ON public.statuses USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_statuses_environment ON public.statuses USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_targets_active ON public.targets USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_targets_environment ON public.targets USING btree (environment_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON public.vehicles USING btree (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_environment ON public.vehicles USING btree (environment_id);`;

const RLS_ENABLE_NOTE = `-- =============================================
-- SEÇÃO 12: HABILITAR RLS EM TODAS AS TABELAS
-- =============================================
-- (RLS é habilitado em todas as 76 tabelas)
-- Veja o arquivo migration_full.sql para as ~450+ políticas RLS completas.`;

const STORAGE_SQL = `-- =============================================
-- SEÇÃO 17: STORAGE
-- =============================================

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
USING (bucket_id = 'environment-logos' AND auth.role() = 'authenticated');`;

const TRIGGERS_SQL = `-- =============================================
-- SEÇÃO 15: TRIGGERS
-- =============================================

-- Auth triggers
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE TRIGGER on_user_process_pending_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION process_pending_invites();

-- Auto-slug triggers
CREATE OR REPLACE TRIGGER auto_slug_channels BEFORE INSERT OR UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE OR REPLACE TRIGGER auto_generate_clients_slug BEFORE INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE OR REPLACE TRIGGER auto_slug_formats BEFORE INSERT OR UPDATE ON public.formats FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE OR REPLACE TRIGGER auto_slug_format_creative_types BEFORE INSERT OR UPDATE ON public.format_creative_types FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE OR REPLACE TRIGGER auto_slug_funnel_stages BEFORE INSERT OR UPDATE ON public.funnel_stages FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE OR REPLACE TRIGGER auto_slug_media_objectives BEFORE INSERT OR UPDATE ON public.media_objectives FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE OR REPLACE TRIGGER auto_slug_mediums BEFORE INSERT OR UPDATE ON public.mediums FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE OR REPLACE TRIGGER auto_slug_moments BEFORE INSERT OR UPDATE ON public.moments FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE OR REPLACE TRIGGER auto_slug_plan_subdivisions BEFORE INSERT OR UPDATE ON public.plan_subdivisions FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE OR REPLACE TRIGGER auto_slug_targets BEFORE INSERT OR UPDATE ON public.targets FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
CREATE OR REPLACE TRIGGER auto_slug_vehicles BEFORE INSERT OR UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();

-- Auto-plan-slug trigger
CREATE OR REPLACE TRIGGER auto_plan_slug BEFORE INSERT OR UPDATE ON public.media_plans FOR EACH ROW EXECUTE FUNCTION auto_generate_plan_slug();

-- UTM generation trigger
CREATE OR REPLACE TRIGGER auto_line_utm BEFORE INSERT OR UPDATE ON public.media_lines FOR EACH ROW EXECUTE FUNCTION auto_generate_line_utm();

-- Creative ID trigger
CREATE OR REPLACE TRIGGER set_creative_id_trigger BEFORE INSERT ON public.media_creatives FOR EACH ROW EXECUTE FUNCTION set_creative_id();

-- Creative change log trigger
CREATE OR REPLACE TRIGGER auto_log_creative_changes_trigger AFTER INSERT OR UPDATE ON public.media_creatives FOR EACH ROW EXECUTE FUNCTION auto_log_creative_changes();

-- Environment member limit trigger
CREATE OR REPLACE TRIGGER enforce_member_limit BEFORE INSERT ON public.environment_members FOR EACH ROW EXECUTE FUNCTION enforce_environment_member_limit();

-- Prevent last admin removal trigger
CREATE OR REPLACE TRIGGER check_last_admin BEFORE DELETE OR UPDATE ON public.environment_roles FOR EACH ROW EXECUTE FUNCTION prevent_last_admin_removal();

-- Auto version on status change
CREATE OR REPLACE TRIGGER auto_version_status AFTER UPDATE ON public.media_plans FOR EACH ROW EXECUTE FUNCTION auto_version_on_status_change();

-- Auto backup triggers
CREATE OR REPLACE TRIGGER auto_backup_plan AFTER UPDATE ON public.media_plans FOR EACH ROW EXECUTE FUNCTION trigger_auto_backup_on_plan_change();
CREATE OR REPLACE TRIGGER auto_backup_line AFTER INSERT OR UPDATE OR DELETE ON public.media_lines FOR EACH ROW EXECUTE FUNCTION trigger_auto_backup_on_line_change();

-- Validate allocation percentage
CREATE OR REPLACE TRIGGER validate_allocation BEFORE INSERT OR UPDATE ON public.line_detail_line_links FOR EACH ROW EXECUTE FUNCTION validate_allocation_percentage();

-- Update link timestamps
CREATE OR REPLACE TRIGGER update_links_updated_at BEFORE UPDATE ON public.line_detail_line_links FOR EACH ROW EXECUTE FUNCTION update_line_detail_links_updated_at();

-- Updated_at triggers for all tables
CREATE OR REPLACE TRIGGER update_behavioral_segmentations_updated_at BEFORE UPDATE ON public.behavioral_segmentations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_creative_templates_updated_at BEFORE UPDATE ON public.creative_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_creative_type_specifications_updated_at BEFORE UPDATE ON public.creative_type_specifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_creative_types_updated_at BEFORE UPDATE ON public.creative_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_custom_kpis_updated_at BEFORE UPDATE ON public.custom_kpis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_environment_members_updated_at BEFORE UPDATE ON public.environment_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_financial_actuals_updated_at BEFORE UPDATE ON public.financial_actuals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_financial_alert_configs_updated_at BEFORE UPDATE ON public.financial_alert_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_financial_documents_updated_at BEFORE UPDATE ON public.financial_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_financial_forecasts_updated_at BEFORE UPDATE ON public.financial_forecasts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_financial_payments_updated_at BEFORE UPDATE ON public.financial_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_financial_revenues_updated_at BEFORE UPDATE ON public.financial_revenues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_financial_vendors_updated_at BEFORE UPDATE ON public.financial_vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_formats_updated_at BEFORE UPDATE ON public.formats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_funnel_stages_updated_at BEFORE UPDATE ON public.funnel_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_line_detail_types_updated_at BEFORE UPDATE ON public.line_detail_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_media_lines_updated_at BEFORE UPDATE ON public.media_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_media_objectives_updated_at BEFORE UPDATE ON public.media_objectives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_media_plans_updated_at BEFORE UPDATE ON public.media_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_mediums_updated_at BEFORE UPDATE ON public.mediums FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_moments_updated_at BEFORE UPDATE ON public.moments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_plan_subdivisions_updated_at BEFORE UPDATE ON public.plan_subdivisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_statuses_updated_at BEFORE UPDATE ON public.statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_targets_updated_at BEFORE UPDATE ON public.targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`;

// ===== Migration steps data =====

const migrationSteps = [
  {
    number: 1,
    title: 'Criar Projeto no Supabase',
    icon: Server,
    content: `1. Acesse supabase.com/dashboard e crie um novo projeto.\n2. Escolha a região mais próxima dos seus usuários.\n3. Anote a URL do projeto e a anon key (encontradas em Settings → API).`,
  },
  {
    number: 2,
    title: 'Executar o Script SQL',
    icon: Database,
    content: `1. Abra o SQL Editor no dashboard do Supabase.\n2. Cole o conteúdo completo do arquivo de migração (disponível abaixo em seções).\n3. Execute cada seção na ordem indicada (1-17).\n4. Confirme que não houve erros.`,
  },
  {
    number: 3,
    title: 'Deploy das Edge Functions',
    icon: Code,
    content: `Execute os seguintes comandos na raiz do projeto:\n\nsupabase functions deploy admin-operations\nsupabase functions deploy import-report-data\nsupabase functions deploy invite-environment-member\nsupabase functions deploy invite-to-plan\nsupabase functions deploy seed-test-plans\nsupabase functions deploy send-invite-email\nsupabase functions deploy send-resource-notification`,
  },
  {
    number: 4,
    title: 'Configurar Secrets',
    icon: Key,
    content: `No dashboard do Supabase → Settings → Edge Functions → Secrets:\n\nRESEND_API_KEY → Chave da API do Resend para envio de emails\n\nAs seguintes já existem por padrão:\n- SUPABASE_URL\n- SUPABASE_ANON_KEY\n- SUPABASE_SERVICE_ROLE_KEY`,
  },
  {
    number: 5,
    title: 'Atualizar Frontend',
    icon: Globe,
    content: `Edite o arquivo .env na raiz do projeto:\n\nVITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=sua-anon-key-aqui\n\nE atualize src/integrations/supabase/client.ts com as novas credenciais.`,
  },
  {
    number: 6,
    title: 'Configurar JWT das Functions',
    icon: Lock,
    content: `Adicione ao supabase/config.toml:\n\n[functions.invite-to-plan]\nverify_jwt = true\n\n[functions.import-report-data]\nverify_jwt = false\n\n[functions.seed-test-plans]\nverify_jwt = false\n\n[functions.admin-operations]\nverify_jwt = false\n\n[functions.invite-environment-member]\nverify_jwt = false\n\n[functions.send-resource-notification]\nverify_jwt = false\n\n[functions.send-invite-email]\nverify_jwt = false`,
  },
];

const sqlSections = [
  { title: 'Seção 1: Enums (6 tipos)', sql: ENUMS_SQL, icon: Layers },
  { title: 'Seção 2: Funções Utilitárias', sql: UTILITY_FUNCTIONS_SQL, icon: FunctionSquare },
  { title: 'Seção 3: Tabelas Nível 0', sql: TABLES_L0_SQL, icon: Table },
  { title: 'Seção 4: Tabelas Nível 1', sql: TABLES_L1_SQL, icon: Table },
  { title: 'Seção 5: Tabelas Nível 2', sql: TABLES_L2_SQL, icon: Table },
  { title: 'Seção 6: Tabelas Nível 3', sql: TABLES_L3_SQL, icon: Table },
  { title: 'Seção 7: Tabelas Nível 4', sql: TABLES_L4_SQL, icon: Table },
  { title: 'Seção 8: Tabelas Nível 5', sql: TABLES_L5_SQL, icon: Table },
  { title: 'Seção 9: Tabelas Nível 6', sql: TABLES_L6_SQL, icon: Table },
  { title: 'Seção 10: Tabelas Nível 7', sql: TABLES_L7_SQL, icon: Table },
  { title: 'Seção 11: Índices', sql: INDEXES_SQL, icon: Workflow },
  { title: 'Seção 12: RLS (ver migration_full.sql)', sql: RLS_ENABLE_NOTE, icon: Shield },
  { title: 'Seção 15: Triggers', sql: TRIGGERS_SQL, icon: Workflow },
  { title: 'Seção 17: Storage', sql: STORAGE_SQL, icon: HardDrive },
];

const dbStats = {
  tables: 76,
  enums: 6,
  functions: 42,
  triggers: 50,
  rlsPolicies: '450+',
  edgeFunctions: 7,
  storageBuckets: 1,
};

function CollapsibleSection({ title, sql, icon: Icon }: { title: string; sql: string; icon: any }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-[#12121a]/60 border border-purple-500/20 rounded-xl hover:border-purple-400/40 transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-purple-400" />
          <span className="text-white font-medium text-left">{title}</span>
        </div>
        {open ? <ChevronDown className="w-5 h-5 text-purple-400" /> : <ChevronRight className="w-5 h-5 text-purple-400" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="relative">
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 z-10 flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-600/80 hover:bg-purple-500/80 text-white rounded-lg transition-colors"
          >
            <Copy className="w-3 h-3" />
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <pre className="p-4 bg-[#0d0d14] border border-purple-500/10 rounded-xl overflow-x-auto text-xs text-purple-200/80 max-h-[500px] overflow-y-auto">
            <code>{sql}</code>
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function MigratePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-purple-500/20 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              AdsPlanning Pro
            </span>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="text-purple-200 hover:text-white gap-2">
              <ArrowLeft className="w-4 h-4" />
              Início
            </Button>
          </Link>
        </div>
      </header>

      <main className="pt-24 pb-16 container max-w-5xl relative z-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium mb-6">
            <Database className="w-4 h-4" />
            Guia de Migração Completo
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Migração: Lovable Cloud → Supabase
          </h1>
          <p className="text-lg text-purple-200/60 max-w-3xl mx-auto">
            Este guia contém todas as instruções e queries SQL necessárias para migrar
            sua instância do AdsPlanning Pro para um projeto Supabase independente.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { label: 'Tabelas', value: dbStats.tables },
            { label: 'Enums', value: dbStats.enums },
            { label: 'Funções', value: dbStats.functions },
            { label: 'RLS Policies', value: dbStats.rlsPolicies },
          ].map((stat) => (
            <Card key={stat.label} className="bg-[#12121a]/60 border-purple-500/20 p-4 text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-purple-200/60 mt-1">{stat.label}</div>
            </Card>
          ))}
        </motion.div>

        {/* Warning */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-12 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-200">Atenção</h3>
            <p className="text-sm text-amber-200/70">
              Execute as seções SQL na ordem indicada. Cada seção depende das anteriores.
              Use <code className="bg-amber-500/20 px-1 rounded">IF NOT EXISTS</code> e blocos <code className="bg-amber-500/20 px-1 rounded">DO $$ BEGIN ... EXCEPTION ... END $$</code> para segurança.
            </p>
          </div>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <FileCode className="w-6 h-6 text-purple-400" />
            Passo a Passo
          </h2>
          <div className="space-y-4">
            {migrationSteps.map((step) => (
              <Collapsible key={step.number}>
                <CollapsibleTrigger className="w-full flex items-center gap-4 p-4 bg-[#12121a]/60 border border-purple-500/20 rounded-xl hover:border-purple-400/40 transition-colors cursor-pointer">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold">
                    {step.number}
                  </div>
                  <div className="flex items-center gap-2 text-left flex-1">
                    <step.icon className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-medium">{step.title}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-400" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-4 bg-[#0d0d14] border border-purple-500/10 rounded-xl">
                  <pre className="text-sm text-purple-200/80 whitespace-pre-wrap">{step.content}</pre>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </motion.div>

        {/* SQL Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Database className="w-6 h-6 text-purple-400" />
            Queries SQL por Seção
          </h2>
          <p className="text-sm text-purple-200/50 mb-6">
            Clique em cada seção para expandir e copiar o SQL. As seções 13 (Funções dependentes) e 14 (RLS Policies)
            estão disponíveis no arquivo <code className="bg-purple-500/20 px-1 rounded">migration_full.sql</code> completo
            devido ao seu tamanho (~450+ policies).
          </p>
          <div className="space-y-3">
            {sqlSections.map((section) => (
              <CollapsibleSection
                key={section.title}
                title={section.title}
                sql={section.sql}
                icon={section.icon}
              />
            ))}
          </div>
        </motion.div>

        {/* Files to Edit */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <FileCode className="w-6 h-6 text-purple-400" />
            Arquivos que Precisam Ser Editados
          </h2>
          <div className="space-y-4">
            {[
              {
                file: '.env',
                description: 'Atualizar VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY com as credenciais do novo projeto Supabase.',
                action: 'Substituir os valores existentes.',
              },
              {
                file: 'src/integrations/supabase/client.ts',
                description: 'Atualizar o client para usar as novas variáveis de ambiente.',
                action: 'Recriar com import.meta.env.VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
              },
              {
                file: 'src/integrations/supabase/types.ts',
                description: 'Regenerar os tipos TypeScript a partir do novo projeto Supabase.',
                action: 'Executar: supabase gen types typescript --project-id SEU_PROJECT_ID > src/integrations/supabase/types.ts',
              },
              {
                file: 'supabase/config.toml',
                description: 'Atualizar o project_id e configurações de JWT das Edge Functions.',
                action: 'Substituir project_id e definir verify_jwt para cada função.',
              },
              {
                file: 'supabase/functions/_shared/email-config.ts',
                description: 'Verificar se a URL do Supabase e configurações de email estão corretas.',
                action: 'Atualizar se necessário para refletir o novo domínio.',
              },
            ].map((item) => (
              <Card key={item.file} className="bg-[#12121a]/60 border-purple-500/20 p-4">
                <div className="flex items-start gap-3">
                  <code className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-sm shrink-0">{item.file}</code>
                  <div>
                    <p className="text-sm text-purple-100">{item.description}</p>
                    <p className="text-xs text-purple-200/50 mt-1">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                      {item.action}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Troubleshooting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Troubleshooting
          </h2>
          <div className="space-y-3">
            {[
              { error: '"relation already exists"', fix: 'O script usa IF NOT EXISTS. Pode ser re-executado com segurança.' },
              { error: '"function does not exist"', fix: 'Verifique se as Seções 2 e 13 foram executadas corretamente.' },
              { error: '"policy already exists"', fix: 'Remova as policies existentes antes de re-executar.' },
              { error: 'Triggers em auth.users falham', fix: 'Execute: DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; antes de re-executar.' },
              { error: '"infinite recursion in policy"', fix: 'As funções SECURITY DEFINER com SET row_security = off resolvem isso. Verifique se foram criadas.' },
            ].map((item) => (
              <Card key={item.error} className="bg-[#12121a]/60 border-purple-500/20 p-4">
                <code className="text-sm text-red-400">{item.error}</code>
                <p className="text-sm text-purple-200/60 mt-1">{item.fix}</p>
              </Card>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-purple-500/20 relative z-10">
        <div className="container text-center">
          <p className="text-sm text-purple-200/40">
            © 2026{' '}
            <Link to="/about" className="text-purple-300/60 font-medium hover:text-purple-200 underline transition-colors">
              asplanning.pro
            </Link>
            . Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
