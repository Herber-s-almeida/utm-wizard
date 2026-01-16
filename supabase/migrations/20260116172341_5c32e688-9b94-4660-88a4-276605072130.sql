-- Criar função para verificar acesso de escrita em ambientes
CREATE OR REPLACE FUNCTION public.can_access_user_data_for_write(_owner_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    _owner_user_id = auth.uid()
    OR (
      -- É membro com papel de admin no ambiente
      EXISTS (
        SELECT 1 FROM public.environment_members
        WHERE environment_owner_id = _owner_user_id
          AND member_user_id = auth.uid()
          AND accepted_at IS NOT NULL
          AND environment_role = 'admin'
      )
    )
    OR (
      -- É membro com permissão de edição em qualquer seção relevante
      EXISTS (
        SELECT 1 FROM public.environment_members
        WHERE environment_owner_id = _owner_user_id
          AND member_user_id = auth.uid()
          AND accepted_at IS NOT NULL
          AND (
            perm_library IN ('edit', 'admin')
            OR perm_media_plans IN ('edit', 'admin')
            OR perm_media_resources IN ('edit', 'admin')
            OR perm_taxonomy IN ('edit', 'admin')
            OR perm_finance IN ('edit', 'admin')
          )
      )
    )
    OR public.is_system_admin(auth.uid())
$$;

-- Atualizar políticas de INSERT para permitir membros inserir dados
-- Clients
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
CREATE POLICY "Users can create clients in accessible environments"
ON public.clients FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Vehicles
DROP POLICY IF EXISTS "Users can insert own vehicles" ON public.vehicles;
CREATE POLICY "Users can insert vehicles in accessible environments"
ON public.vehicles FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Channels
DROP POLICY IF EXISTS "Users can insert own channels" ON public.channels;
CREATE POLICY "Users can insert channels in accessible environments"
ON public.channels FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Mediums
DROP POLICY IF EXISTS "Users can insert own mediums" ON public.mediums;
CREATE POLICY "Users can insert mediums in accessible environments"
ON public.mediums FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Formats
DROP POLICY IF EXISTS "Users can insert own formats" ON public.formats;
CREATE POLICY "Users can insert formats in accessible environments"
ON public.formats FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Format Creative Types
DROP POLICY IF EXISTS "Users can insert own format creative types" ON public.format_creative_types;
CREATE POLICY "Users can insert format creative types in accessible environments"
ON public.format_creative_types FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Creative Type Specifications
DROP POLICY IF EXISTS "Users can insert own specifications" ON public.creative_type_specifications;
CREATE POLICY "Users can insert specifications in accessible environments"
ON public.creative_type_specifications FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Funnel Stages
DROP POLICY IF EXISTS "Users can insert own funnel stages" ON public.funnel_stages;
CREATE POLICY "Users can insert funnel stages in accessible environments"
ON public.funnel_stages FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Media Objectives
DROP POLICY IF EXISTS "Users can insert own objectives" ON public.media_objectives;
CREATE POLICY "Users can insert objectives in accessible environments"
ON public.media_objectives FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Targets
DROP POLICY IF EXISTS "Users can insert own targets" ON public.targets;
CREATE POLICY "Users can insert targets in accessible environments"
ON public.targets FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Moments
DROP POLICY IF EXISTS "Users can insert own moments" ON public.moments;
CREATE POLICY "Users can insert moments in accessible environments"
ON public.moments FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Statuses
DROP POLICY IF EXISTS "Users can insert own statuses" ON public.statuses;
CREATE POLICY "Users can insert statuses in accessible environments"
ON public.statuses FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Media Plans
DROP POLICY IF EXISTS "Users can insert their own media plans" ON public.media_plans;
CREATE POLICY "Users can insert media plans in accessible environments"
ON public.media_plans FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Media Lines
DROP POLICY IF EXISTS "Users can insert their own media lines" ON public.media_lines;
CREATE POLICY "Users can insert media lines in accessible environments"
ON public.media_lines FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Media Creatives
DROP POLICY IF EXISTS "Users can insert own creatives" ON public.media_creatives;
CREATE POLICY "Users can insert creatives in accessible environments"
ON public.media_creatives FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Line Details
DROP POLICY IF EXISTS "Users can insert own line details" ON public.line_details;
CREATE POLICY "Users can insert line details in accessible environments"
ON public.line_details FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Line Detail Items
DROP POLICY IF EXISTS "Users can insert own line detail items" ON public.line_detail_items;
CREATE POLICY "Users can insert line detail items in accessible environments"
ON public.line_detail_items FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Line Detail Types
DROP POLICY IF EXISTS "Users can insert own line detail types" ON public.line_detail_types;
CREATE POLICY "Users can insert line detail types in accessible environments"
ON public.line_detail_types FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Custom KPIs
DROP POLICY IF EXISTS "Users can insert own custom kpis" ON public.custom_kpis;
CREATE POLICY "Users can insert custom kpis in accessible environments"
ON public.custom_kpis FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Creative Templates
DROP POLICY IF EXISTS "Users can insert own templates" ON public.creative_templates;
CREATE POLICY "Users can insert templates in accessible environments"
ON public.creative_templates FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Plan Subdivisions
DROP POLICY IF EXISTS "Users can create own subdivisions" ON public.plan_subdivisions;
CREATE POLICY "Users can create subdivisions in accessible environments"
ON public.plan_subdivisions FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Plan Budget Distributions
DROP POLICY IF EXISTS "Users can create own distributions" ON public.plan_budget_distributions;
CREATE POLICY "Users can create distributions in accessible environments"
ON public.plan_budget_distributions FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Media Line Monthly Budgets
DROP POLICY IF EXISTS "Users can insert own monthly budgets" ON public.media_line_monthly_budgets;
CREATE POLICY "Users can insert monthly budgets in accessible environments"
ON public.media_line_monthly_budgets FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Behavioral Segmentations
DROP POLICY IF EXISTS "Users can insert own segmentations" ON public.behavioral_segmentations;
CREATE POLICY "Users can insert segmentations in accessible environments"
ON public.behavioral_segmentations FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Line Detail Insertions
DROP POLICY IF EXISTS "Users can create own insertions" ON public.line_detail_insertions;
CREATE POLICY "Users can create insertions in accessible environments"
ON public.line_detail_insertions FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);

-- Line Targets
DROP POLICY IF EXISTS "Users can create own line targets" ON public.line_targets;
CREATE POLICY "Users can create line targets in accessible environments"
ON public.line_targets FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.can_access_user_data_for_write(user_id)
);