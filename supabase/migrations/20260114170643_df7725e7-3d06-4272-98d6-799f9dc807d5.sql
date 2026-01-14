-- Criar tabela de objetivos de mídia
CREATE TABLE public.media_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(25) NOT NULL,
  description VARCHAR(180),
  slug VARCHAR(30),
  user_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.media_objectives ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (seguindo padrão de can_access_user_data)
CREATE POLICY "Users can view media_objectives they have access to"
  ON public.media_objectives FOR SELECT
  USING (public.can_access_user_data(user_id));

CREATE POLICY "Users can insert their own media_objectives"
  ON public.media_objectives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media_objectives"
  ON public.media_objectives FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media_objectives"
  ON public.media_objectives FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para auto-gerar slug
CREATE TRIGGER auto_generate_media_objectives_slug
  BEFORE INSERT OR UPDATE ON public.media_objectives
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_slug();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_media_objectives_updated_at
  BEFORE UPDATE ON public.media_objectives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna de referência na media_lines
ALTER TABLE public.media_lines 
ADD COLUMN objective_id UUID REFERENCES public.media_objectives(id);

-- Índices para performance
CREATE INDEX idx_media_objectives_user ON public.media_objectives(user_id);
CREATE INDEX idx_media_objectives_deleted ON public.media_objectives(deleted_at);
CREATE INDEX idx_media_lines_objective ON public.media_lines(objective_id);