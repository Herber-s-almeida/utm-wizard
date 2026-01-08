
-- =====================================================
-- SISTEMA DE DETALHAMENTO DE LINHAS DE MÍDIA
-- =====================================================

-- 1. Tipos de Detalhamento (configuráveis pelo usuário)
CREATE TABLE public.line_detail_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  icon TEXT DEFAULT 'file-text',
  
  -- Schema dos campos personalizados
  field_schema JSONB NOT NULL DEFAULT '[]',
  
  -- Schema dos metadados do cabeçalho
  metadata_schema JSONB DEFAULT '[]',
  
  -- Configuração de grade de inserções
  has_insertion_grid BOOLEAN DEFAULT true,
  insertion_grid_type TEXT DEFAULT 'daily',
  
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Detalhamentos (cabeçalho vinculado a uma linha)
CREATE TABLE public.line_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_line_id UUID NOT NULL REFERENCES public.media_lines(id) ON DELETE CASCADE,
  detail_type_id UUID NOT NULL REFERENCES public.line_detail_types(id),
  user_id UUID NOT NULL,
  
  name TEXT,
  notes TEXT,
  
  -- Metadados específicos (praça, banco de audiência, etc)
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Itens do Detalhamento (cada linha dentro do detalhamento)
CREATE TABLE public.line_detail_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_detail_id UUID NOT NULL REFERENCES public.line_details(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Dados dinâmicos baseados no field_schema do tipo
  data JSONB NOT NULL DEFAULT '{}',
  
  -- Valores calculados para totalização
  total_insertions INTEGER DEFAULT 0,
  total_gross NUMERIC DEFAULT 0,
  total_net NUMERIC DEFAULT 0,
  
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Grade de Inserções (diária/semanal para cada item)
CREATE TABLE public.line_detail_insertions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_detail_item_id UUID NOT NULL REFERENCES public.line_detail_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  insertion_date DATE NOT NULL,
  quantity INTEGER DEFAULT 0,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(line_detail_item_id, insertion_date)
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.line_detail_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_detail_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_detail_insertions ENABLE ROW LEVEL SECURITY;

-- line_detail_types: usuário pode ver próprios e de sistema
CREATE POLICY "Users can view own and system detail types"
ON public.line_detail_types FOR SELECT
USING ((auth.uid() = user_id) OR (is_system = true));

CREATE POLICY "Users can create own detail types"
ON public.line_detail_types FOR INSERT
WITH CHECK ((auth.uid() = user_id) AND (is_system = false));

CREATE POLICY "Users can update own non-system detail types"
ON public.line_detail_types FOR UPDATE
USING (((user_id = auth.uid()) AND (is_system = false)) OR is_system_admin(auth.uid()));

CREATE POLICY "Users can delete own non-system detail types"
ON public.line_detail_types FOR DELETE
USING (((user_id = auth.uid()) AND (is_system = false)) OR is_system_admin(auth.uid()));

-- line_details: baseado em acesso à linha de mídia
CREATE POLICY "Users can view details of accessible lines"
ON public.line_details FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.media_lines ml
    WHERE ml.id = line_details.media_line_id
    AND (ml.user_id = auth.uid() OR has_plan_role(ml.media_plan_id, auth.uid(), NULL::app_role[]))
  )
  OR is_system_admin(auth.uid())
);

CREATE POLICY "Users can create details for own lines"
ON public.line_details FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.media_lines ml
    WHERE ml.id = line_details.media_line_id
    AND (ml.user_id = auth.uid() OR has_plan_role(ml.media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role]))
  )
);

CREATE POLICY "Users can update details of own lines"
ON public.line_details FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.media_lines ml
    WHERE ml.id = line_details.media_line_id
    AND has_plan_role(ml.media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
  )
  OR is_system_admin(auth.uid())
);

CREATE POLICY "Users can delete details of own lines"
ON public.line_details FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.media_lines ml
    WHERE ml.id = line_details.media_line_id
    AND has_plan_role(ml.media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
  )
  OR is_system_admin(auth.uid())
);

-- line_detail_items: baseado em acesso ao detail
CREATE POLICY "Users can view items of accessible details"
ON public.line_detail_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.line_details ld
    JOIN public.media_lines ml ON ml.id = ld.media_line_id
    WHERE ld.id = line_detail_items.line_detail_id
    AND (ml.user_id = auth.uid() OR has_plan_role(ml.media_plan_id, auth.uid(), NULL::app_role[]))
  )
  OR is_system_admin(auth.uid())
);

CREATE POLICY "Users can manage items of own details"
ON public.line_detail_items FOR ALL
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.line_details ld
    JOIN public.media_lines ml ON ml.id = ld.media_line_id
    WHERE ld.id = line_detail_items.line_detail_id
    AND has_plan_role(ml.media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
  )
  OR is_system_admin(auth.uid())
);

-- line_detail_insertions: baseado em acesso ao item
CREATE POLICY "Users can view insertions of accessible items"
ON public.line_detail_insertions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.line_detail_items ldi
    JOIN public.line_details ld ON ld.id = ldi.line_detail_id
    JOIN public.media_lines ml ON ml.id = ld.media_line_id
    WHERE ldi.id = line_detail_insertions.line_detail_item_id
    AND (ml.user_id = auth.uid() OR has_plan_role(ml.media_plan_id, auth.uid(), NULL::app_role[]))
  )
  OR is_system_admin(auth.uid())
);

CREATE POLICY "Users can manage insertions of own items"
ON public.line_detail_insertions FOR ALL
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.line_detail_items ldi
    JOIN public.line_details ld ON ld.id = ldi.line_detail_id
    JOIN public.media_lines ml ON ml.id = ld.media_line_id
    WHERE ldi.id = line_detail_insertions.line_detail_item_id
    AND has_plan_role(ml.media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
  )
  OR is_system_admin(auth.uid())
);

-- =====================================================
-- SEED DATA: Tipos de Detalhamento Pré-cadastrados
-- =====================================================

-- Criar um user_id de sistema para os tipos pré-cadastrados
-- Usamos um UUID fixo para manter consistência
DO $$
DECLARE
  system_user_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN

-- TV Aberta
INSERT INTO public.line_detail_types (user_id, name, slug, description, icon, field_schema, metadata_schema, has_insertion_grid, insertion_grid_type, is_system)
VALUES (
  system_user_id,
  'TV Aberta',
  'tv-aberta',
  'Detalhamento para compra de mídia em TV aberta com grade de inserções diária',
  'tv',
  '[
    {"key": "emissora", "label": "Emissora", "type": "text", "required": true, "width": 100},
    {"key": "programa", "label": "Programa", "type": "text", "required": true, "width": 200},
    {"key": "horario", "label": "Hora Inicial", "type": "time", "width": 80},
    {"key": "segundagem", "label": "Seg.", "type": "select", "options": ["5\"","10\"","15\"","30\"","60\""], "width": 60},
    {"key": "peca", "label": "Peça", "type": "text", "width": 80},
    {"key": "formato", "label": "Formato", "type": "text", "width": 120},
    {"key": "preco_tabela", "label": "Preço Tabela", "type": "currency", "required": true, "width": 120},
    {"key": "percentual_negociacao", "label": "% Neg.", "type": "percentage", "width": 70},
    {"key": "preco_negociado", "label": "Preço Neg.", "type": "currency", "width": 120},
    {"key": "custo_liquido", "label": "Custo Líquido", "type": "currency", "width": 120},
    {"key": "audiencia_ia", "label": "Aud. IA", "type": "number", "width": 70},
    {"key": "audiencia_grp", "label": "GRP", "type": "number", "width": 70},
    {"key": "audiencia_trp", "label": "TRP", "type": "number", "width": 70},
    {"key": "cpp", "label": "C.P.P.", "type": "number", "width": 80},
    {"key": "custo_grp", "label": "Custo GRP", "type": "currency", "width": 100}
  ]'::jsonb,
  '[
    {"key": "praca", "label": "Praça", "type": "text"},
    {"key": "banco_audiencia", "label": "Banco de Audiência", "type": "text"},
    {"key": "universo_potencial", "label": "Universo Potencial", "type": "number"},
    {"key": "target", "label": "Target", "type": "text"}
  ]'::jsonb,
  true,
  'daily',
  true
);

-- Rádio
INSERT INTO public.line_detail_types (user_id, name, slug, description, icon, field_schema, metadata_schema, has_insertion_grid, insertion_grid_type, is_system)
VALUES (
  system_user_id,
  'Rádio',
  'radio',
  'Detalhamento para compra de mídia em rádio com inserções diárias',
  'radio',
  '[
    {"key": "veiculo", "label": "Veículo", "type": "text", "required": true, "width": 120},
    {"key": "projeto", "label": "Projeto", "type": "text", "width": 120},
    {"key": "item", "label": "Item", "type": "text", "width": 150},
    {"key": "key_message", "label": "Key Message", "type": "text", "width": 100},
    {"key": "duracao", "label": "Duração", "type": "select", "options": ["15\"","30\"","45\"","60\""], "width": 70},
    {"key": "obs", "label": "OBS", "type": "text", "width": 100},
    {"key": "data_inicio", "label": "Início", "type": "date", "width": 100},
    {"key": "data_fim", "label": "Fim", "type": "date", "width": 100},
    {"key": "preco_unitario_tabela", "label": "$ Unit. Tabela", "type": "currency", "width": 110},
    {"key": "percentual_negociacao", "label": "% Neg.", "type": "percentage", "width": 70},
    {"key": "preco_unitario_negociado", "label": "Unit. Negociado", "type": "currency", "width": 120},
    {"key": "total_negociado", "label": "TT Negociado", "type": "currency", "width": 120},
    {"key": "total_liquido", "label": "TT Líquido", "type": "currency", "width": 120}
  ]'::jsonb,
  '[
    {"key": "praca", "label": "Praça", "type": "text"}
  ]'::jsonb,
  true,
  'daily',
  true
);

-- OOH / Mídia Exterior
INSERT INTO public.line_detail_types (user_id, name, slug, description, icon, field_schema, metadata_schema, has_insertion_grid, insertion_grid_type, is_system)
VALUES (
  system_user_id,
  'OOH / Mídia Exterior',
  'ooh',
  'Detalhamento para mídia out-of-home: outdoors, painéis, mobiliário urbano',
  'signpost',
  '[
    {"key": "status", "label": "Status", "type": "select", "options": ["Reservado","Ativo","Programado","Cancelado"], "width": 90},
    {"key": "uf", "label": "UF", "type": "text", "width": 50},
    {"key": "praca", "label": "Praça", "type": "text", "width": 100},
    {"key": "representante", "label": "Representante", "type": "text", "width": 120},
    {"key": "mensagem", "label": "Mensagem", "type": "text", "width": 120},
    {"key": "meio", "label": "Meio", "type": "select", "options": ["Banca Digital","Painel LED","Outdoor Lonado","Adesivo","Vidro Adesivado","Relógio","Busdoor"], "width": 120},
    {"key": "descricao", "label": "Descrição/Endereço", "type": "text", "width": 250},
    {"key": "ambiente", "label": "Ambiente", "type": "select", "options": ["Via Pública","Shopping","Aeroporto","Metrô","Rodoviária"], "width": 100},
    {"key": "tipo", "label": "Tipo", "type": "select", "options": ["Digital","Estático"], "width": 80},
    {"key": "formato", "label": "Formato", "type": "text", "width": 100},
    {"key": "tipo_periodo", "label": "Período", "type": "select", "options": ["Mensal","Semanal","Bissemanal","Quinzenal","Diário"], "width": 90},
    {"key": "quantidade", "label": "Qtd", "type": "number", "width": 50},
    {"key": "valor_unitario_tabela", "label": "Valor Unit. Tabela", "type": "currency", "width": 130},
    {"key": "percentual_negociacao", "label": "%", "type": "percentage", "width": 60},
    {"key": "valor_unitario_negociado", "label": "Unit. Bruto Neg.", "type": "currency", "width": 130},
    {"key": "valor_unitario_liquido", "label": "Unit. Líq. Neg.", "type": "currency", "width": 130},
    {"key": "total_bruto_negociado", "label": "Total Bruto Neg.", "type": "currency", "width": 130},
    {"key": "total_liquido_negociado", "label": "Total Líq. Neg.", "type": "currency", "width": 130},
    {"key": "producao_unitaria", "label": "Prod. Unit.", "type": "currency", "width": 100},
    {"key": "producao_total", "label": "Prod. Total", "type": "currency", "width": 100},
    {"key": "data_inicio", "label": "Início", "type": "date", "width": 100},
    {"key": "data_fim", "label": "Fim", "type": "date", "width": 100},
    {"key": "observacao", "label": "Observação", "type": "text", "width": 200}
  ]'::jsonb,
  '[]'::jsonb,
  false,
  'daily',
  true
);

END $$;

-- Criar índices para performance
CREATE INDEX idx_line_details_media_line ON public.line_details(media_line_id);
CREATE INDEX idx_line_details_type ON public.line_details(detail_type_id);
CREATE INDEX idx_line_detail_items_detail ON public.line_detail_items(line_detail_id);
CREATE INDEX idx_line_detail_insertions_item ON public.line_detail_insertions(line_detail_item_id);
CREATE INDEX idx_line_detail_insertions_date ON public.line_detail_insertions(insertion_date);
