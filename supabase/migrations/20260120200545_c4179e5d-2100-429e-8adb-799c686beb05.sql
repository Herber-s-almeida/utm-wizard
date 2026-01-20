-- =====================================================
-- FASE 1: Criar novo sistema de permissões por plano
-- =====================================================

-- Dropar tabela legada plan_roles (está vazia)
DROP TABLE IF EXISTS public.plan_roles CASCADE;

-- Dropar enum legado app_role se não estiver em uso
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Criar enum para níveis de permissão em planos
CREATE TYPE public.plan_permission_level AS ENUM ('none', 'view', 'edit');

-- Criar tabela de permissões específicas por plano
CREATE TABLE public.plan_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level public.plan_permission_level NOT NULL DEFAULT 'view',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT plan_permissions_unique UNIQUE(media_plan_id, user_id)
);

-- Criar índices para performance
CREATE INDEX idx_plan_permissions_plan ON public.plan_permissions(media_plan_id);
CREATE INDEX idx_plan_permissions_user ON public.plan_permissions(user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_plan_permissions_updated_at
  BEFORE UPDATE ON public.plan_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.plan_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para plan_permissions
-- Quem tem acesso ao ambiente pode ver permissões de planos
CREATE POLICY "Environment members can view plan permissions"
  ON public.plan_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.media_plans mp
      WHERE mp.id = plan_permissions.media_plan_id
      AND public.has_environment_section_access(mp.environment_id, 'media_plans', 'view')
    )
  );

-- Apenas admins do ambiente podem gerenciar permissões
CREATE POLICY "Environment admins can manage plan permissions"
  ON public.plan_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.media_plans mp
      JOIN public.environment_roles er ON er.environment_id = mp.environment_id AND er.user_id = auth.uid()
      WHERE mp.id = plan_permissions.media_plan_id
      AND er.is_environment_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_plans mp
      JOIN public.environment_roles er ON er.environment_id = mp.environment_id AND er.user_id = auth.uid()
      WHERE mp.id = plan_permissions.media_plan_id
      AND er.is_environment_admin = true
    )
  );

-- =====================================================
-- Função para calcular permissão efetiva no plano
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_effective_plan_permission(
  _plan_id UUID,
  _user_id UUID DEFAULT auth.uid()
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _environment_id UUID;
  _env_permission text;
  _plan_restriction text;
  _is_env_admin boolean;
BEGIN
  -- Buscar environment_id do plano
  SELECT environment_id INTO _environment_id
  FROM public.media_plans
  WHERE id = _plan_id;
  
  IF _environment_id IS NULL THEN
    RETURN 'none';
  END IF;
  
  -- Verificar se é admin do ambiente (tem acesso total)
  SELECT er.is_environment_admin INTO _is_env_admin
  FROM public.environment_roles er
  WHERE er.environment_id = _environment_id AND er.user_id = _user_id;
  
  IF _is_env_admin = true THEN
    RETURN 'edit';
  END IF;
  
  -- Buscar permissão de ambiente para media_plans
  SELECT 
    CASE er.perm_media_plans
      WHEN 'edit' THEN 'edit'
      WHEN 'view' THEN 'view'
      ELSE 'none'
    END INTO _env_permission
  FROM public.environment_roles er
  WHERE er.environment_id = _environment_id AND er.user_id = _user_id;
  
  -- Se não tem acesso ao ambiente, retorna none
  IF _env_permission IS NULL OR _env_permission = 'none' THEN
    RETURN 'none';
  END IF;
  
  -- Verificar se há restrição específica no plano
  SELECT pp.permission_level::text INTO _plan_restriction
  FROM public.plan_permissions pp
  WHERE pp.media_plan_id = _plan_id AND pp.user_id = _user_id;
  
  -- Se não há restrição, usa permissão do ambiente
  IF _plan_restriction IS NULL THEN
    RETURN _env_permission;
  END IF;
  
  -- Se há restrição, retorna o mínimo entre ambiente e plano
  -- Ordem: none < view < edit
  IF _plan_restriction = 'none' THEN
    RETURN 'none';
  ELSIF _plan_restriction = 'view' THEN
    RETURN 'view';
  ELSE
    -- Plano permite edit, mas limita pela permissão do ambiente
    RETURN _env_permission;
  END IF;
END;
$$;

-- Função helper para verificar se pode editar o plano
CREATE OR REPLACE FUNCTION public.can_edit_plan(_plan_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_effective_plan_permission(_plan_id, auth.uid()) = 'edit';
$$;

-- Função helper para verificar se pode visualizar o plano
CREATE OR REPLACE FUNCTION public.can_view_plan(_plan_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_effective_plan_permission(_plan_id, auth.uid()) IN ('view', 'edit');
$$;