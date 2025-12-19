-- Add funnel_stage to media_lines
ALTER TABLE public.media_lines
ADD COLUMN funnel_stage text DEFAULT 'top' CHECK (funnel_stage IN ('top', 'middle', 'bottom'));

-- Create table for creatives within each media line
CREATE TABLE public.media_creatives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_line_id uuid NOT NULL REFERENCES public.media_lines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  copy_text text,
  creative_type text DEFAULT 'image',
  asset_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_creatives ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY "Users can CRUD own creatives"
ON public.media_creatives
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on creatives
CREATE TRIGGER update_media_creatives_updated_at
BEFORE UPDATE ON public.media_creatives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();