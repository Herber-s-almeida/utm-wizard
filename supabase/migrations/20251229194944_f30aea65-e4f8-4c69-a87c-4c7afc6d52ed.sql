-- Criar tabela de versões de planos de mídia
CREATE TABLE public.media_plan_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_log TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  CONSTRAINT unique_plan_version UNIQUE (media_plan_id, version_number)
);

-- Habilitar RLS
ALTER TABLE public.media_plan_versions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view versions of accessible plans"
ON public.media_plan_versions
FOR SELECT
USING (has_plan_role(media_plan_id, auth.uid(), NULL::app_role[]));

CREATE POLICY "Owners and editors can create versions"
ON public.media_plan_versions
FOR INSERT
WITH CHECK (
  auth.uid() = created_by 
  AND has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
);

CREATE POLICY "Only owners can delete versions"
ON public.media_plan_versions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.media_plans 
    WHERE id = media_plan_id AND user_id = auth.uid()
  )
);

-- Índices para performance
CREATE INDEX idx_media_plan_versions_plan_id ON public.media_plan_versions(media_plan_id);
CREATE INDEX idx_media_plan_versions_created_at ON public.media_plan_versions(created_at DESC);

-- Função para criar snapshot automático de um plano
CREATE OR REPLACE FUNCTION public.create_plan_version_snapshot(
  _plan_id UUID,
  _user_id UUID,
  _change_log TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _version_number INTEGER;
  _snapshot JSONB;
  _new_version_id UUID;
BEGIN
  -- Calcular próximo número de versão
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO _version_number
  FROM public.media_plan_versions
  WHERE media_plan_id = _plan_id;

  -- Criar snapshot com dados do plano, linhas e distribuições
  SELECT jsonb_build_object(
    'plan', (
      SELECT row_to_json(p.*)
      FROM public.media_plans p
      WHERE p.id = _plan_id
    ),
    'lines', (
      SELECT COALESCE(jsonb_agg(row_to_json(l.*)), '[]'::jsonb)
      FROM public.media_lines l
      WHERE l.media_plan_id = _plan_id
    ),
    'budget_distributions', (
      SELECT COALESCE(jsonb_agg(row_to_json(bd.*)), '[]'::jsonb)
      FROM public.plan_budget_distributions bd
      WHERE bd.media_plan_id = _plan_id
    ),
    'monthly_budgets', (
      SELECT COALESCE(jsonb_agg(row_to_json(mb.*)), '[]'::jsonb)
      FROM public.media_line_monthly_budgets mb
      JOIN public.media_lines ml ON ml.id = mb.media_line_id
      WHERE ml.media_plan_id = _plan_id
    )
  ) INTO _snapshot;

  -- Inserir nova versão
  INSERT INTO public.media_plan_versions (
    media_plan_id,
    version_number,
    snapshot_data,
    change_log,
    created_by
  ) VALUES (
    _plan_id,
    _version_number,
    _snapshot,
    _change_log,
    _user_id
  ) RETURNING id INTO _new_version_id;

  RETURN _new_version_id;
END;
$$;

-- Função trigger para criar versão automática em mudança de status
CREATE OR REPLACE FUNCTION public.auto_version_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só criar versão se o status realmente mudou
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.create_plan_version_snapshot(
      NEW.id,
      auth.uid(),
      'Status alterado de ' || COALESCE(OLD.status, 'null') || ' para ' || NEW.status
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para versão automática
CREATE TRIGGER trigger_auto_version_on_status_change
BEFORE UPDATE ON public.media_plans
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.auto_version_on_status_change();