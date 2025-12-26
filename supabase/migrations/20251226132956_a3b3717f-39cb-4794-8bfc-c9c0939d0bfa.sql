-- Add creative_id column for unique 6-character alphanumeric identifier
ALTER TABLE public.media_creatives 
ADD COLUMN IF NOT EXISTS creative_id TEXT UNIQUE;

-- Create function to generate unique creative ID
CREATE OR REPLACE FUNCTION public.generate_creative_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
  exists_count INTEGER;
BEGIN
  LOOP
    new_id := '';
    FOR i IN 1..6 LOOP
      new_id := new_id || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT COUNT(*) INTO exists_count FROM public.media_creatives WHERE creative_id = new_id;
    IF exists_count = 0 THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate creative_id on insert
CREATE OR REPLACE FUNCTION public.set_creative_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.creative_id IS NULL THEN
    NEW.creative_id := public.generate_creative_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_set_creative_id
BEFORE INSERT ON public.media_creatives
FOR EACH ROW
EXECUTE FUNCTION public.set_creative_id();

-- Update existing creatives without creative_id
UPDATE public.media_creatives 
SET creative_id = public.generate_creative_id()
WHERE creative_id IS NULL;