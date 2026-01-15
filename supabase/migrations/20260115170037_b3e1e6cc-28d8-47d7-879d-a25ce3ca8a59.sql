-- Adicionar coluna para optar por notificações de recursos de mídia
ALTER TABLE public.environment_members 
ADD COLUMN IF NOT EXISTS notify_media_resources BOOLEAN DEFAULT false;