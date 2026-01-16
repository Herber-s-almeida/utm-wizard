-- =====================================================
-- NOVA ESTRUTURA DE ROLES DO SISTEMA
-- =====================================================

-- 1. Criar enum para papéis dentro do ambiente
CREATE TYPE public.environment_role AS ENUM ('owner', 'admin', 'user');

-- 2. Adicionar coluna environment_role em environment_members
ALTER TABLE public.environment_members 
ADD COLUMN environment_role public.environment_role NOT NULL DEFAULT 'user';

-- 3. Adicionar coluna environment_role em pending_environment_invites
ALTER TABLE public.pending_environment_invites 
ADD COLUMN environment_role public.environment_role NOT NULL DEFAULT 'user';

-- 4. Função para obter papel no ambiente
CREATE OR REPLACE FUNCTION public.get_environment_role(
  _environment_owner_id UUID, 
  _user_id UUID
)
RETURNS public.environment_role
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Se é o dono do ambiente, é owner
  IF _environment_owner_id = _user_id THEN
    RETURN 'owner';
  END IF;
  
  -- Se é system admin, é admin em qualquer ambiente
  IF public.is_system_admin(_user_id) THEN
    RETURN 'admin';
  END IF;
  
  -- Buscar papel como membro
  RETURN (
    SELECT environment_role 
    FROM public.environment_members
    WHERE environment_owner_id = _environment_owner_id 
      AND member_user_id = _user_id
      AND accepted_at IS NOT NULL
  );
END;
$$;

-- 5. Função para verificar se pode convidar membros
CREATE OR REPLACE FUNCTION public.can_invite_to_environment(
  _environment_owner_id UUID, 
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _role public.environment_role;
BEGIN
  _role := public.get_environment_role(_environment_owner_id, _user_id);
  RETURN _role IN ('owner', 'admin');
END;
$$;

-- 6. Função para listar ambientes do usuário
CREATE OR REPLACE FUNCTION public.get_user_environments(_user_id UUID)
RETURNS TABLE(
  environment_owner_id UUID,
  environment_name TEXT,
  environment_role public.environment_role,
  is_own_environment BOOLEAN
)
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Ambiente próprio (se for System User)
  SELECT 
    p.user_id as environment_owner_id,
    COALESCE(p.company_name, p.full_name, 'Meu Ambiente') as environment_name,
    'owner'::public.environment_role as environment_role,
    true as is_own_environment
  FROM public.profiles p
  WHERE p.user_id = _user_id 
    AND p.is_system_user = true
  
  UNION ALL
  
  -- Ambientes onde é membro
  SELECT 
    em.environment_owner_id,
    COALESCE(p.company_name, p.full_name, 'Ambiente') as environment_name,
    em.environment_role,
    false as is_own_environment
  FROM public.environment_members em
  JOIN public.profiles p ON p.user_id = em.environment_owner_id
  WHERE em.member_user_id = _user_id
    AND em.accepted_at IS NOT NULL
  
  ORDER BY is_own_environment DESC, environment_name;
END;
$$;

-- 7. Atualizar trigger de processamento de convites para incluir environment_role
CREATE OR REPLACE FUNCTION public.process_pending_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Inserir membros a partir de convites pendentes
  INSERT INTO public.environment_members (
    environment_owner_id,
    member_user_id,
    invited_by,
    invited_at,
    accepted_at,
    environment_role,
    perm_executive_dashboard,
    perm_reports,
    perm_finance,
    perm_media_plans,
    perm_media_resources,
    perm_taxonomy,
    perm_library,
    notify_media_resources
  )
  SELECT 
    pi.environment_owner_id,
    NEW.id,
    pi.invited_by,
    pi.created_at,
    now(),
    COALESCE(pi.environment_role, 'user'),
    pi.perm_executive_dashboard,
    pi.perm_reports,
    pi.perm_finance,
    pi.perm_media_plans,
    pi.perm_media_resources,
    pi.perm_taxonomy,
    pi.perm_library,
    pi.notify_media_resources
  FROM public.pending_environment_invites pi
  WHERE LOWER(pi.email) = LOWER(NEW.email)
    AND pi.expires_at > now();
  
  -- Limpar convites processados
  DELETE FROM public.pending_environment_invites 
  WHERE LOWER(email) = LOWER(NEW.email);
  
  RETURN NEW;
END;
$$;

-- 8. Função para verificar se pode gerenciar papel de outro membro
CREATE OR REPLACE FUNCTION public.can_manage_member_role(
  _environment_owner_id UUID,
  _manager_user_id UUID,
  _target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _manager_role public.environment_role;
  _target_role public.environment_role;
BEGIN
  _manager_role := public.get_environment_role(_environment_owner_id, _manager_user_id);
  _target_role := public.get_environment_role(_environment_owner_id, _target_user_id);
  
  -- Apenas owner pode alterar papéis
  IF _manager_role = 'owner' THEN
    -- Owner pode alterar qualquer um, exceto a si mesmo
    RETURN _manager_user_id != _target_user_id;
  END IF;
  
  -- System admin pode alterar qualquer um
  IF public.is_system_admin(_manager_user_id) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 9. Função para remover membro (com verificação de permissão)
CREATE OR REPLACE FUNCTION public.can_remove_environment_member(
  _environment_owner_id UUID,
  _remover_user_id UUID,
  _target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _remover_role public.environment_role;
  _target_role public.environment_role;
BEGIN
  _remover_role := public.get_environment_role(_environment_owner_id, _remover_user_id);
  _target_role := public.get_environment_role(_environment_owner_id, _target_user_id);
  
  -- System admin pode remover qualquer um
  IF public.is_system_admin(_remover_user_id) THEN
    RETURN true;
  END IF;
  
  -- Owner pode remover qualquer um
  IF _remover_role = 'owner' THEN
    RETURN true;
  END IF;
  
  -- Admin pode remover apenas users (não outros admins)
  IF _remover_role = 'admin' AND _target_role = 'user' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;