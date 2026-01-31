-- Adicionar coluna change_type para categorizar alterações
ALTER TABLE public.creative_change_logs 
ADD COLUMN IF NOT EXISTS change_type TEXT DEFAULT 'comment';

-- Atualizar registros existentes baseado no conteúdo do notes
UPDATE public.creative_change_logs
SET change_type = 'status'
WHERE notes LIKE 'Status alterado%'
   OR notes LIKE 'Criativo criado%'
   OR notes LIKE 'Criativo aprovado%'
   OR notes LIKE 'Aprovação removida%'
   OR notes LIKE 'Link da peça%'
   OR notes LIKE 'Data de recebimento%';

-- Recriar a função do trigger para incluir change_type
CREATE OR REPLACE FUNCTION public.auto_log_creative_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  change_notes TEXT := '';
  log_type TEXT := 'status';
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.creative_change_logs (creative_id, change_date, notes, user_id, change_type)
    VALUES (NEW.id, now(), 'Criativo criado', NEW.user_id, 'status');
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
      INSERT INTO public.creative_change_logs (creative_id, change_date, notes, user_id, change_type)
      VALUES (NEW.id, now(), change_notes, NEW.user_id, 'status');
    END IF;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;