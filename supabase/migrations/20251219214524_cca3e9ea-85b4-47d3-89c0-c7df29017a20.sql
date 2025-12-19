-- Add description field to targets table
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS description text;

-- Create table for behavioral segmentation types
CREATE TABLE public.behavioral_segmentations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.behavioral_segmentations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD own behavioral_segmentations" 
ON public.behavioral_segmentations 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_behavioral_segmentations_updated_at
BEFORE UPDATE ON public.behavioral_segmentations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();