-- Add format_id column to media_creatives
ALTER TABLE public.media_creatives 
ADD COLUMN format_id uuid REFERENCES public.formats(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_media_creatives_format_id ON public.media_creatives(format_id);