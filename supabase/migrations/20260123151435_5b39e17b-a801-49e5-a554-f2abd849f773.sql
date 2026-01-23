-- Phase 2: Atualizar funções SQL para não depender de owner_user_id
-- Primeiro dropar funções com assinaturas que vão mudar

-- Dropar funções antigas que usam _environment_owner_id
DROP FUNCTION IF EXISTS public.get_environment_role(UUID, UUID);
DROP FUNCTION IF EXISTS public.can_manage_member_role(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.can_remove_environment_member(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.can_invite_to_environment(UUID, UUID);

-- 2.2 Recriar get_environment_role com novos parâmetros (_environment_id em vez de _environment_owner_id)
CREATE OR REPLACE FUNCTION public.get_environment_role(_environment_id UUID, _user_id UUID)
RETURNS environment_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  _is_admin BOOLEAN;
BEGIN
  -- Se é system admin, é admin em qualquer ambiente
  IF public.is_system_admin(_user_id) THEN
    RETURN 'admin';
  END IF;
  
  -- Buscar papel como membro via environment_roles
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
$$;

-- 2.3 Recriar can_manage_member_role
CREATE OR REPLACE FUNCTION public.can_manage_member_role(_environment_id UUID, _manager_user_id UUID, _target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  _manager_is_admin BOOLEAN;
BEGIN
  -- System admin pode alterar qualquer um
  IF public.is_system_admin(_manager_user_id) THEN
    RETURN true;
  END IF;
  
  -- Verificar se manager é admin do ambiente
  SELECT is_environment_admin INTO _manager_is_admin
  FROM public.environment_roles
  WHERE environment_id = _environment_id
    AND user_id = _manager_user_id
    AND accepted_at IS NOT NULL;
  
  -- Apenas admins podem alterar papéis
  IF _manager_is_admin = true THEN
    -- Admin pode alterar qualquer um, exceto a si mesmo
    RETURN _manager_user_id != _target_user_id;
  END IF;
  
  RETURN false;
END;
$$;

-- 2.4 Recriar can_remove_environment_member
CREATE OR REPLACE FUNCTION public.can_remove_environment_member(_environment_id UUID, _remover_user_id UUID, _target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  _remover_is_admin BOOLEAN;
BEGIN
  -- System admin pode remover qualquer um
  IF public.is_system_admin(_remover_user_id) THEN
    RETURN true;
  END IF;
  
  -- Buscar status de admin
  SELECT is_environment_admin INTO _remover_is_admin
  FROM public.environment_roles
  WHERE environment_id = _environment_id
    AND user_id = _remover_user_id
    AND accepted_at IS NOT NULL;
  
  -- Admin pode remover qualquer um (exceto se for o último admin - verificado pelo trigger)
  IF _remover_is_admin = true THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 2.5 Recriar can_invite_to_environment
CREATE OR REPLACE FUNCTION public.can_invite_to_environment(_environment_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  _is_admin BOOLEAN;
BEGIN
  -- System admin pode convidar
  IF public.is_system_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  -- Verificar se é admin do ambiente
  SELECT is_environment_admin INTO _is_admin
  FROM public.environment_roles
  WHERE environment_id = _environment_id
    AND user_id = _user_id
    AND accepted_at IS NOT NULL;
  
  RETURN COALESCE(_is_admin, false);
END;
$$;

-- 2.6 Criar função para listar todos os ambientes (para system admins)
CREATE OR REPLACE FUNCTION public.list_all_environments()
RETURNS TABLE (
  id UUID,
  name TEXT,
  company_name TEXT,
  cnpj TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  admin_count BIGINT,
  member_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Apenas system admins podem ver todos os ambientes
  IF NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores do sistema podem listar todos os ambientes';
  END IF;
  
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.company_name,
    e.cnpj,
    e.created_at,
    e.created_by,
    COUNT(CASE WHEN er.is_environment_admin = true THEN 1 END) AS admin_count,
    COUNT(er.user_id) AS member_count
  FROM public.environments e
  LEFT JOIN public.environment_roles er ON er.environment_id = e.id AND er.accepted_at IS NOT NULL
  GROUP BY e.id, e.name, e.company_name, e.cnpj, e.created_at, e.created_by
  ORDER BY e.name ASC;
END;
$$;

-- 2.7 Criar função para listar membros de um ambiente (para system admins)
CREATE OR REPLACE FUNCTION public.get_environment_members_admin(p_environment_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  is_environment_admin BOOLEAN,
  accepted_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Apenas system admins podem ver membros de qualquer ambiente
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
$$;