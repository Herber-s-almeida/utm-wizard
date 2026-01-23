-- Corrigir search_path das funções criadas
CREATE OR REPLACE FUNCTION public.update_line_detail_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_allocation_percentage()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage DECIMAL(5,2);
BEGIN
  SELECT COALESCE(SUM(allocated_percentage), 0) INTO total_percentage
  FROM public.line_detail_line_links
  WHERE line_detail_id = NEW.line_detail_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  total_percentage := total_percentage + NEW.allocated_percentage;
  
  IF total_percentage > 100.01 THEN
    RAISE EXCEPTION 'Soma das alocacoes excede 100 porcento (atual: %)', total_percentage;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;