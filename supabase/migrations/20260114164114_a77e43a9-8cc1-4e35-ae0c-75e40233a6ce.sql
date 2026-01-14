-- Adicionar coluna para armazenar a ordem personalizada das fases do funil por plano
ALTER TABLE public.media_plans 
ADD COLUMN funnel_order uuid[] DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.media_plans.funnel_order IS 
'Ordem das fases do funil neste plano. Array de IDs ordenados do topo (awareness) ao fundo (conversão) do funil. Cada plano pode definir sua própria metodologia de funil.';