
-- 1. Criar tabela de KPIs customizados
CREATE TABLE public.custom_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '%',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)
);

-- 2. Criar tabela de relação entre planos e KPIs
CREATE TABLE public.plan_custom_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_plan_id UUID NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  custom_kpi_id UUID REFERENCES public.custom_kpis(id) ON DELETE CASCADE,
  kpi_key TEXT NOT NULL,
  target_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Adicionar campos de data em plan_budget_distributions para suportar períodos por momento
ALTER TABLE public.plan_budget_distributions 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- 4. Habilitar RLS nas novas tabelas
ALTER TABLE public.custom_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_custom_kpis ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para custom_kpis
CREATE POLICY "Users can view their own custom KPIs"
ON public.custom_kpis FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom KPIs"
ON public.custom_kpis FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom KPIs"
ON public.custom_kpis FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom KPIs"
ON public.custom_kpis FOR DELETE
USING (auth.uid() = user_id);

-- 6. Políticas RLS para plan_custom_kpis (baseado em acesso ao plano)
CREATE POLICY "Users can view KPIs of plans they have access to"
ON public.plan_custom_kpis FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.media_plans mp 
    WHERE mp.id = media_plan_id 
    AND (mp.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.plan_roles pr 
      WHERE pr.media_plan_id = mp.id AND pr.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can manage KPIs of plans they own or edit"
ON public.plan_custom_kpis FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.media_plans mp 
    WHERE mp.id = media_plan_id 
    AND (mp.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.plan_roles pr 
      WHERE pr.media_plan_id = mp.id 
      AND pr.user_id = auth.uid() 
      AND pr.role IN ('owner', 'editor')
    ))
  )
);

-- 7. Trigger para atualizar updated_at em custom_kpis
CREATE TRIGGER update_custom_kpis_updated_at
BEFORE UPDATE ON public.custom_kpis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Índices para performance
CREATE INDEX idx_custom_kpis_user_id ON public.custom_kpis(user_id);
CREATE INDEX idx_plan_custom_kpis_plan_id ON public.plan_custom_kpis(media_plan_id);
CREATE INDEX idx_plan_custom_kpis_kpi_id ON public.plan_custom_kpis(custom_kpi_id);
