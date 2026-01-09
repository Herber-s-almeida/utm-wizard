
-- =============================================
-- FASE 1: Sistema de Permissões por Ambiente
-- =============================================

-- 1.1 Criar ENUMs para níveis de permissão e seções
CREATE TYPE public.environment_permission_level AS ENUM ('none', 'view', 'edit', 'admin');

CREATE TYPE public.environment_section AS ENUM (
  'executive_dashboard', 
  'reports', 
  'finance', 
  'media_plans', 
  'media_resources', 
  'taxonomy', 
  'library'
);

-- 1.2 Criar tabela environment_members
CREATE TABLE public.environment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_owner_id UUID NOT NULL,
  member_user_id UUID NOT NULL,
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Permissões por seção (denormalized para performance)
  perm_executive_dashboard public.environment_permission_level DEFAULT 'none',
  perm_reports public.environment_permission_level DEFAULT 'none',
  perm_finance public.environment_permission_level DEFAULT 'none',
  perm_media_plans public.environment_permission_level DEFAULT 'none',
  perm_media_resources public.environment_permission_level DEFAULT 'none',
  perm_taxonomy public.environment_permission_level DEFAULT 'none',
  perm_library public.environment_permission_level DEFAULT 'none',
  
  CONSTRAINT unique_environment_member UNIQUE(environment_owner_id, member_user_id),
  CONSTRAINT no_self_membership CHECK (environment_owner_id != member_user_id)
);

-- Índices para performance
CREATE INDEX idx_environment_members_owner ON public.environment_members(environment_owner_id);
CREATE INDEX idx_environment_members_member ON public.environment_members(member_user_id);

-- Trigger para updated_at
CREATE TRIGGER update_environment_members_updated_at
  BEFORE UPDATE ON public.environment_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 1.3 Funções SECURITY DEFINER

-- Contar membros de um ambiente (para limite de 30)
CREATE OR REPLACE FUNCTION public.count_environment_members(_environment_owner_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.environment_members
  WHERE environment_owner_id = _environment_owner_id;
$$;

-- Verificar se usuário é membro de um ambiente
CREATE OR REPLACE FUNCTION public.is_environment_member(_environment_owner_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.environment_members
    WHERE environment_owner_id = _environment_owner_id
      AND member_user_id = _user_id
      AND accepted_at IS NOT NULL
  );
$$;

-- Verificar se usuário é admin do ambiente
CREATE OR REPLACE FUNCTION public.is_environment_admin(_environment_owner_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Obter nível de permissão para uma seção específica
CREATE OR REPLACE FUNCTION public.get_environment_permission(
  _environment_owner_id UUID,
  _user_id UUID,
  _section TEXT
)
RETURNS public.environment_permission_level
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _permission public.environment_permission_level;
BEGIN
  -- Se é o dono do ambiente, tem permissão admin
  IF _environment_owner_id = _user_id THEN
    RETURN 'admin'::public.environment_permission_level;
  END IF;
  
  -- Se é system admin, tem permissão admin
  IF public.is_system_admin(_user_id) THEN
    RETURN 'admin'::public.environment_permission_level;
  END IF;
  
  -- Buscar permissão específica da seção
  EXECUTE format(
    'SELECT perm_%I FROM public.environment_members 
     WHERE environment_owner_id = $1 AND member_user_id = $2 AND accepted_at IS NOT NULL',
    _section
  ) INTO _permission USING _environment_owner_id, _user_id;
  
  RETURN COALESCE(_permission, 'none'::public.environment_permission_level);
END;
$$;

-- Verificar se tem permissão mínima em uma seção
CREATE OR REPLACE FUNCTION public.has_environment_permission(
  _environment_owner_id UUID,
  _user_id UUID,
  _section TEXT,
  _min_level public.environment_permission_level
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_level public.environment_permission_level;
  _level_order INTEGER;
  _min_level_order INTEGER;
BEGIN
  _current_level := public.get_environment_permission(_environment_owner_id, _user_id, _section);
  
  -- Mapear níveis para ordem numérica
  _level_order := CASE _current_level
    WHEN 'none' THEN 0
    WHEN 'view' THEN 1
    WHEN 'edit' THEN 2
    WHEN 'admin' THEN 3
  END;
  
  _min_level_order := CASE _min_level
    WHEN 'none' THEN 0
    WHEN 'view' THEN 1
    WHEN 'edit' THEN 2
    WHEN 'admin' THEN 3
  END;
  
  RETURN _level_order >= _min_level_order;
END;
$$;

-- Verificar se pode convidar mais membros (limite de 30)
CREATE OR REPLACE FUNCTION public.can_invite_environment_member(_environment_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.count_environment_members(_environment_owner_id) < 30;
$$;

-- 1.4 Trigger para enforçar limite de 30 membros
CREATE OR REPLACE FUNCTION public.enforce_environment_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.count_environment_members(NEW.environment_owner_id) >= 30 THEN
    RAISE EXCEPTION 'Limite de 30 membros por ambiente atingido';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_member_limit
  BEFORE INSERT ON public.environment_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_environment_member_limit();

-- 1.5 Habilitar RLS
ALTER TABLE public.environment_members ENABLE ROW LEVEL SECURITY;

-- 1.6 Políticas RLS para environment_members

-- SELECT: usuário pode ver membros do próprio ambiente OU ambiente onde é membro
CREATE POLICY "Users can view environment members"
ON public.environment_members
FOR SELECT
USING (
  environment_owner_id = auth.uid()
  OR member_user_id = auth.uid()
  OR public.is_system_admin(auth.uid())
);

-- INSERT: apenas owner do ambiente pode adicionar (e system admin)
CREATE POLICY "Environment owners can add members"
ON public.environment_members
FOR INSERT
WITH CHECK (
  environment_owner_id = auth.uid()
  AND public.can_invite_environment_member(environment_owner_id)
  OR public.is_system_admin(auth.uid())
);

-- UPDATE: apenas owner pode modificar permissões (e system admin)
-- Owner não pode remover próprio status de admin
CREATE POLICY "Environment owners can update members"
ON public.environment_members
FOR UPDATE
USING (
  environment_owner_id = auth.uid()
  OR public.is_system_admin(auth.uid())
)
WITH CHECK (
  environment_owner_id = auth.uid()
  OR public.is_system_admin(auth.uid())
);

-- DELETE: owner pode remover membros (e system admin)
CREATE POLICY "Environment owners can remove members"
ON public.environment_members
FOR DELETE
USING (
  environment_owner_id = auth.uid()
  OR public.is_system_admin(auth.uid())
);

-- 1.7 Atualizar política de profiles para permitir ver perfis de membros do ambiente
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_system_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.environment_members em
    WHERE (em.environment_owner_id = auth.uid() AND em.member_user_id = profiles.user_id)
       OR (em.member_user_id = auth.uid() AND em.environment_owner_id = profiles.user_id)
  )
);
