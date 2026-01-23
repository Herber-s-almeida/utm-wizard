-- Create media_plan_followers table (who receives notifications per plan)
CREATE TABLE public.media_plan_followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(media_plan_id, user_id)
);

-- Create notification state table (tracks last digest sent)
CREATE TABLE public.media_plan_notification_state (
  media_plan_id UUID PRIMARY KEY REFERENCES public.media_plans(id) ON DELETE CASCADE,
  last_digest_sent_at TIMESTAMPTZ DEFAULT now(),
  last_digest_sent_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_plan_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_plan_notification_state ENABLE ROW LEVEL SECURITY;

-- RLS for media_plan_followers: users with plan access can view, admins can modify
CREATE POLICY "Users with plan access can view followers"
ON public.media_plan_followers FOR SELECT
USING (public.can_view_plan(media_plan_id));

CREATE POLICY "Users with plan edit access can manage followers"
ON public.media_plan_followers FOR ALL
USING (public.can_edit_plan(media_plan_id));

-- RLS for notification_state
CREATE POLICY "Users with plan access can view notification state"
ON public.media_plan_notification_state FOR SELECT
USING (public.can_view_plan(media_plan_id));

CREATE POLICY "Users with plan edit access can update notification state"
ON public.media_plan_notification_state FOR ALL
USING (public.can_edit_plan(media_plan_id));

-- Function to auto-log creative changes
CREATE OR REPLACE FUNCTION public.auto_log_creative_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  change_notes TEXT := '';
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.creative_change_logs (media_creative_id, change_date, notes)
    VALUES (NEW.id, now(), 'Criativo criado');
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Track status changes
    IF OLD.production_status IS DISTINCT FROM NEW.production_status THEN
      change_notes := 'Status alterado de "' || COALESCE(OLD.production_status, 'nenhum') || '" para "' || COALESCE(NEW.production_status, 'nenhum') || '"';
    END IF;
    
    -- Track piece_link changes
    IF OLD.piece_link IS DISTINCT FROM NEW.piece_link THEN
      IF change_notes != '' THEN change_notes := change_notes || '; '; END IF;
      IF NEW.piece_link IS NOT NULL AND OLD.piece_link IS NULL THEN
        change_notes := change_notes || 'Link da peça adicionado';
      ELSIF NEW.piece_link IS NULL AND OLD.piece_link IS NOT NULL THEN
        change_notes := change_notes || 'Link da peça removido';
      ELSE
        change_notes := change_notes || 'Link da peça atualizado';
      END IF;
    END IF;
    
    -- Track approval date changes
    IF OLD.approved_date IS DISTINCT FROM NEW.approved_date THEN
      IF change_notes != '' THEN change_notes := change_notes || '; '; END IF;
      IF NEW.approved_date IS NOT NULL AND OLD.approved_date IS NULL THEN
        change_notes := change_notes || 'Criativo aprovado';
      ELSIF NEW.approved_date IS NULL AND OLD.approved_date IS NOT NULL THEN
        change_notes := change_notes || 'Aprovação removida';
      END IF;
    END IF;
    
    -- Track received date changes
    IF OLD.received_date IS DISTINCT FROM NEW.received_date THEN
      IF change_notes != '' THEN change_notes := change_notes || '; '; END IF;
      IF NEW.received_date IS NOT NULL AND OLD.received_date IS NULL THEN
        change_notes := change_notes || 'Data de recebimento registrada';
      END IF;
    END IF;
    
    -- Only log if there are actual changes
    IF change_notes != '' THEN
      INSERT INTO public.creative_change_logs (media_creative_id, change_date, notes)
      VALUES (NEW.id, now(), change_notes);
    END IF;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- We can't log after delete since the creative is gone
    -- Instead, we could log to a separate audit table if needed
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for auto-logging
CREATE TRIGGER trg_auto_log_creative_changes
AFTER INSERT OR UPDATE ON public.media_creatives
FOR EACH ROW
EXECUTE FUNCTION public.auto_log_creative_changes();

-- Add indexes for performance
CREATE INDEX idx_media_plan_followers_plan_id ON public.media_plan_followers(media_plan_id);
CREATE INDEX idx_media_plan_followers_user_id ON public.media_plan_followers(user_id);
CREATE INDEX idx_creative_change_logs_date ON public.creative_change_logs(change_date);