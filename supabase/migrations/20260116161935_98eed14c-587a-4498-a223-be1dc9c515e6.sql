-- Corrigir função get_user_environments para usar nome correto da coluna
CREATE OR REPLACE FUNCTION public.get_user_environments(_user_id uuid)
RETURNS TABLE(
  environment_owner_id uuid,
  environment_name text,
  environment_role environment_role,
  is_own_environment boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Ambiente próprio (se for System User)
  SELECT 
    p.user_id as environment_owner_id,
    COALESCE(p.company, p.full_name, 'Meu Ambiente') as environment_name,
    'owner'::public.environment_role as environment_role,
    true as is_own_environment
  FROM public.profiles p
  WHERE p.user_id = _user_id 
    AND p.is_system_user = true
  
  UNION ALL
  
  -- Ambientes onde é membro
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
$$;