-- Adicionar campos de informações da empresa na tabela environments
ALTER TABLE public.environments 
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Migrar dados existentes: copiar company do profile do owner para environments
UPDATE public.environments e
SET company_name = p.company,
    name = COALESCE(e.name, p.company)
FROM public.profiles p
WHERE p.user_id = e.owner_user_id
  AND e.company_name IS NULL
  AND p.company IS NOT NULL;