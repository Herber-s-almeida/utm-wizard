-- ============================================
-- FASE 1: CONSOLIDAR POLÍTICAS RLS
-- ============================================

-- 1. MEDIA_LINES (3 políticas → 1)
DROP POLICY IF EXISTS "System admins can view all media lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can view accessible lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can view lines of accessible plans" ON public.media_lines;

CREATE POLICY "Users can view media lines" 
ON public.media_lines 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR has_plan_role(media_plan_id, auth.uid(), NULL::app_role[])
  OR can_access_user_data(user_id)
  OR is_system_admin(auth.uid())
);

-- 2. PLAN_BUDGET_DISTRIBUTIONS (2 políticas → 1)
DROP POLICY IF EXISTS "System admins can view all budget distributions" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can view accessible distributions" ON public.plan_budget_distributions;

CREATE POLICY "Users can view budget distributions" 
ON public.plan_budget_distributions 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR has_plan_role(media_plan_id, auth.uid(), NULL::app_role[])
  OR is_system_admin(auth.uid())
);

-- 3. MEDIA_CREATIVES (3 políticas → 1)
DROP POLICY IF EXISTS "System admins can view all creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can view accessible creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can view creatives of accessible plans" ON public.media_creatives;

CREATE POLICY "Users can view media creatives" 
ON public.media_creatives 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM media_lines ml 
    WHERE ml.id = media_line_id 
    AND has_plan_role(ml.media_plan_id, auth.uid(), NULL::app_role[])
  )
  OR is_system_admin(auth.uid())
);

-- 4. PLAN_SUBDIVISIONS - usa user_id, não media_plan_id
DROP POLICY IF EXISTS "System admins can view all plan subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can view accessible subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can view subdivisions of accessible plans" ON public.plan_subdivisions;

CREATE POLICY "Users can view plan subdivisions" 
ON public.plan_subdivisions 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR can_access_user_data(user_id)
  OR is_system_admin(auth.uid())
);

-- 5. MEDIA_LINE_MONTHLY_BUDGETS (2 políticas → 1)
DROP POLICY IF EXISTS "System admins can view all monthly budgets" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can view accessible monthly budgets" ON public.media_line_monthly_budgets;

CREATE POLICY "Users can view monthly budgets" 
ON public.media_line_monthly_budgets 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM media_lines ml 
    WHERE ml.id = media_line_id 
    AND has_plan_role(ml.media_plan_id, auth.uid(), NULL::app_role[])
  )
  OR is_system_admin(auth.uid())
);

-- ============================================
-- FASE 4: ADICIONAR ÍNDICES
-- ============================================

-- Índice para busca de linhas por plano
CREATE INDEX IF NOT EXISTS idx_media_lines_plan_id ON public.media_lines(media_plan_id);

-- Índice para busca de distribuições por plano
CREATE INDEX IF NOT EXISTS idx_plan_budget_distributions_plan_id ON public.plan_budget_distributions(media_plan_id);

-- Índice para busca de criativos por linha
CREATE INDEX IF NOT EXISTS idx_media_creatives_line_id ON public.media_creatives(media_line_id);

-- Índice para busca de orçamentos mensais por linha
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_line_id ON public.media_line_monthly_budgets(media_line_id);

-- Índice composto para planos por usuário e status
CREATE INDEX IF NOT EXISTS idx_media_plans_user_status ON public.media_plans(user_id, status, deleted_at);

-- Índice para subdivisões por usuário
CREATE INDEX IF NOT EXISTS idx_plan_subdivisions_user_id ON public.plan_subdivisions(user_id);