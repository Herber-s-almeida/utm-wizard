-- Problema 2: Adicionar colunas de ordem para subdivisões e momentos
ALTER TABLE public.media_plans 
ADD COLUMN IF NOT EXISTS subdivision_order uuid[] DEFAULT '{}'::uuid[],
ADD COLUMN IF NOT EXISTS moment_order uuid[] DEFAULT '{}'::uuid[];

-- Problema 4: Adicionar client_id aos targets para vincular a clientes específicos
ALTER TABLE public.targets 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Índice para performance de busca por cliente
CREATE INDEX IF NOT EXISTS idx_targets_client_id ON public.targets(client_id);