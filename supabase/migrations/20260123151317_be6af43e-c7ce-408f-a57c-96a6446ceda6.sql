-- Phase 1: Database Preparation - Dissociar Ambientes de Owners

-- 1.1 Adicionar coluna created_by à tabela environments
ALTER TABLE public.environments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 1.2 Migrar dados: garantir que todos os owners atuais estejam como admins em environment_roles
INSERT INTO public.environment_roles (
  environment_id,
  user_id,
  is_environment_admin,
  role_read, role_edit, role_delete, role_invite,
  perm_executive_dashboard, perm_reports, perm_finance,
  perm_media_plans, perm_media_resources, perm_taxonomy, perm_library,
  accepted_at,
  invited_at
)
SELECT 
  e.id AS environment_id,
  e.owner_user_id AS user_id,
  true AS is_environment_admin,
  true, true, true, true,
  'admin'::environment_permission_level, 
  'admin'::environment_permission_level, 
  'admin'::environment_permission_level, 
  'admin'::environment_permission_level, 
  'admin'::environment_permission_level, 
  'admin'::environment_permission_level, 
  'admin'::environment_permission_level,
  NOW() AS accepted_at,
  NOW() AS invited_at
FROM public.environments e
WHERE e.owner_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.environment_roles er 
    WHERE er.environment_id = e.id AND er.user_id = e.owner_user_id
  );

-- 1.3 Atualizar created_by para owner atual (para histórico)
UPDATE public.environments SET created_by = owner_user_id WHERE created_by IS NULL AND owner_user_id IS NOT NULL;

-- 1.4 Tornar owner_user_id nullable (preparação para remoção futura)
ALTER TABLE public.environments ALTER COLUMN owner_user_id DROP NOT NULL;

-- 1.5 Criar trigger para prevenir remoção do último admin
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Se está removendo ou rebaixando um admin
  IF (TG_OP = 'DELETE' AND OLD.is_environment_admin = true) 
     OR (TG_OP = 'UPDATE' AND OLD.is_environment_admin = true AND NEW.is_environment_admin = false) THEN
    -- Contar outros admins
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
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Dropar trigger se existir antes de criar
DROP TRIGGER IF EXISTS check_last_admin ON public.environment_roles;

CREATE TRIGGER check_last_admin
  BEFORE DELETE OR UPDATE ON public.environment_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_removal();

-- 1.6 Atualizar políticas RLS de environments para não depender de owner_user_id

-- Remover políticas antigas
DROP POLICY IF EXISTS "Only owners can update their environments" ON public.environments;
DROP POLICY IF EXISTS "Authenticated users can create environments" ON public.environments;
DROP POLICY IF EXISTS "Users can view environments they belong to" ON public.environments;
DROP POLICY IF EXISTS "Users can view their own environments" ON public.environments;
DROP POLICY IF EXISTS "Owners can update their environments" ON public.environments;

-- Nova política: Admins de ambiente podem atualizar
CREATE POLICY "Environment admins can update environments"
  ON public.environments FOR UPDATE
  TO authenticated
  USING (
    public.is_system_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.environment_roles er 
      WHERE er.environment_id = id 
        AND er.user_id = auth.uid() 
        AND er.is_environment_admin = true
        AND er.accepted_at IS NOT NULL
    )
  );

-- Nova política: System admins podem criar ambientes
CREATE POLICY "System admins can create environments"
  ON public.environments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin(auth.uid()));

-- Nova política: Membros podem ver seus ambientes
CREATE POLICY "Members can view their environments"
  ON public.environments FOR SELECT
  TO authenticated
  USING (
    public.is_system_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.environment_roles er 
      WHERE er.environment_id = id 
        AND er.user_id = auth.uid()
        AND er.accepted_at IS NOT NULL
    )
  );

-- Nova política: System admins podem deletar ambientes
CREATE POLICY "System admins can delete environments"
  ON public.environments FOR DELETE
  TO authenticated
  USING (public.is_system_admin(auth.uid()));