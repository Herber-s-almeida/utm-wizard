-- Add production management columns to media_creatives
ALTER TABLE public.media_creatives 
ADD COLUMN IF NOT EXISTS production_status TEXT DEFAULT 'solicitado',
ADD COLUMN IF NOT EXISTS opening_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS received_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS piece_link TEXT;

-- Create table for change date logs
CREATE TABLE IF NOT EXISTS public.creative_change_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creative_id UUID NOT NULL REFERENCES public.media_creatives(id) ON DELETE CASCADE,
  change_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on change logs
ALTER TABLE public.creative_change_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for change logs
CREATE POLICY "Users can CRUD own change logs" 
ON public.creative_change_logs 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update existing creatives to have opening_date set
UPDATE public.media_creatives 
SET opening_date = created_at
WHERE opening_date IS NULL;