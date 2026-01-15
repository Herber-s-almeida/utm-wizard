-- 1. Adicionar coluna is_system_user em profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_system_user BOOLEAN DEFAULT false;

-- 2. Marcar todos os usuários existentes como usuários do sistema
UPDATE public.profiles SET is_system_user = true WHERE is_system_user IS NULL OR is_system_user = false;

-- 3. Criar tabela de convites pendentes de ambiente
CREATE TABLE IF NOT EXISTS public.pending_environment_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  environment_owner_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  perm_executive_dashboard public.environment_permission_level DEFAULT 'none',
  perm_reports public.environment_permission_level DEFAULT 'none',
  perm_finance public.environment_permission_level DEFAULT 'none',
  perm_media_plans public.environment_permission_level DEFAULT 'none',
  perm_media_resources public.environment_permission_level DEFAULT 'none',
  perm_taxonomy public.environment_permission_level DEFAULT 'none',
  perm_library public.environment_permission_level DEFAULT 'none',
  notify_media_resources BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  
  UNIQUE(email, environment_owner_id)
);

-- 4. Habilitar RLS
ALTER TABLE public.pending_environment_invites ENABLE ROW LEVEL SECURITY;

-- 5. Policies para pending_environment_invites
CREATE POLICY "Environment owners can manage their invites"
ON public.pending_environment_invites
FOR ALL
USING (environment_owner_id = auth.uid())
WITH CHECK (environment_owner_id = auth.uid());

CREATE POLICY "System admins can view all invites"
ON public.pending_environment_invites
FOR SELECT
USING (public.is_system_admin(auth.uid()));

-- 6. Atualizar trigger handle_new_user para considerar is_system_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, is_system_user)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE((NEW.raw_user_meta_data ->> 'is_system_user')::boolean, false)
  );
  RETURN NEW;
END;
$$;

-- 7. Criar função para processar convites pendentes
CREATE OR REPLACE FUNCTION public.process_pending_invites()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Inserir membros a partir de convites pendentes
  INSERT INTO public.environment_members (
    environment_owner_id,
    member_user_id,
    invited_by,
    invited_at,
    accepted_at,
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

-- 8. Criar trigger para processar convites quando usuário é criado
DROP TRIGGER IF EXISTS on_user_process_pending_invites ON auth.users;
CREATE TRIGGER on_user_process_pending_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.process_pending_invites();

-- 9. Função para verificar se usuário é owner de ambiente (tem ambiente próprio)
CREATE OR REPLACE FUNCTION public.is_environment_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_system_user FROM public.profiles WHERE user_id = _user_id),
    false
  )
$$;