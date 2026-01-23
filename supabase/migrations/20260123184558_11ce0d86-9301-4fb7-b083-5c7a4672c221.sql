-- ===========================================
-- FASE 1: Reestruturação do Sistema de Detalhamentos
-- Transformar de 1:1 para N:N (linha -> detalhamento)
-- ===========================================

-- 1.1 Adicionar coluna media_plan_id em line_details
ALTER TABLE public.line_details 
ADD COLUMN IF NOT EXISTS media_plan_id UUID REFERENCES public.media_plans(id);

-- Migrar dados existentes: pegar o plan_id via media_line
UPDATE public.line_details ld
SET media_plan_id = (
  SELECT ml.media_plan_id 
  FROM public.media_lines ml 
  WHERE ml.id = ld.media_line_id
)
WHERE ld.media_plan_id IS NULL AND ld.media_line_id IS NOT NULL;

-- Tornar obrigatório após migração
ALTER TABLE public.line_details 
ALTER COLUMN media_plan_id SET NOT NULL;

-- 1.2 Adicionar campo de contexto herdado
ALTER TABLE public.line_details 
ADD COLUMN IF NOT EXISTS inherited_context JSONB DEFAULT '{}';

COMMENT ON COLUMN public.line_details.inherited_context IS 
'Contexto herdado da linha primária: vehicle_id, medium_id, channel_id, subdivision_id, moment_id, funnel_stage_id, format specs';

-- 1.3 Criar tabela de vinculação N:N
CREATE TABLE IF NOT EXISTS public.line_detail_line_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_detail_id UUID NOT NULL REFERENCES public.line_details(id) ON DELETE CASCADE,
  media_line_id UUID NOT NULL REFERENCES public.media_lines(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  allocated_percentage DECIMAL(5,2) DEFAULT 100.00,
  allocated_amount DECIMAL(15,2) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL,
  environment_id UUID REFERENCES public.environments(id),
  
  UNIQUE(line_detail_id, media_line_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ldll_detail ON public.line_detail_line_links(line_detail_id);
CREATE INDEX IF NOT EXISTS idx_ldll_line ON public.line_detail_line_links(media_line_id);
CREATE INDEX IF NOT EXISTS idx_ldll_environment ON public.line_detail_line_links(environment_id);

-- 1.4 Migrar vínculos existentes para tabela ponte
INSERT INTO public.line_detail_line_links (line_detail_id, media_line_id, is_primary, allocated_percentage, user_id, environment_id)
SELECT 
  ld.id,
  ld.media_line_id,
  true,
  100.00,
  ld.user_id,
  ld.environment_id
FROM public.line_details ld
WHERE ld.media_line_id IS NOT NULL
ON CONFLICT (line_detail_id, media_line_id) DO NOTHING;

-- 1.5 Tornar media_line_id nullable (depreciado)
ALTER TABLE public.line_details 
ALTER COLUMN media_line_id DROP NOT NULL;

COMMENT ON COLUMN public.line_details.media_line_id IS 
'DEPRECADO: Usar line_detail_line_links para vinculação. Mantido para retrocompatibilidade.';

-- 1.6 Trigger para updated_at na nova tabela
CREATE OR REPLACE FUNCTION public.update_line_detail_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_line_detail_links_timestamp ON public.line_detail_line_links;
CREATE TRIGGER update_line_detail_links_timestamp
BEFORE UPDATE ON public.line_detail_line_links
FOR EACH ROW
EXECUTE FUNCTION public.update_line_detail_links_updated_at();

-- 1.7 Constraint para garantir que soma de allocated_percentage <= 100%
CREATE OR REPLACE FUNCTION public.validate_allocation_percentage()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_allocation_on_link ON public.line_detail_line_links;
CREATE TRIGGER validate_allocation_on_link
BEFORE INSERT OR UPDATE ON public.line_detail_line_links
FOR EACH ROW
EXECUTE FUNCTION public.validate_allocation_percentage();

-- 1.8 RLS Policies para nova tabela
ALTER TABLE public.line_detail_line_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read links for their environments" 
ON public.line_detail_line_links FOR SELECT 
USING (has_environment_access(environment_id, 'read'));

CREATE POLICY "Users can insert links for their environments" 
ON public.line_detail_line_links FOR INSERT 
WITH CHECK (has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Users can update links for their environments" 
ON public.line_detail_line_links FOR UPDATE 
USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Users can delete links for their environments" 
ON public.line_detail_line_links FOR DELETE 
USING (has_environment_section_access(environment_id, 'media_plans', 'edit'));