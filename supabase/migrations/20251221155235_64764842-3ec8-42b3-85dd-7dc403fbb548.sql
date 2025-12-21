
-- Create statuses table
CREATE TABLE public.statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT name_max_length CHECK (char_length(name) <= 25)
);

-- Enable RLS
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user access
CREATE POLICY "Users can view own and system statuses"
ON public.statuses
FOR SELECT
USING (auth.uid() = user_id OR is_system = true);

CREATE POLICY "Users can create own statuses"
ON public.statuses
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update own non-system statuses"
ON public.statuses
FOR UPDATE
USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete own non-system statuses"
ON public.statuses
FOR DELETE
USING (auth.uid() = user_id AND is_system = false);

-- Add status_id to media_lines
ALTER TABLE public.media_lines ADD COLUMN status_id UUID REFERENCES public.statuses(id);

-- Create trigger for updated_at
CREATE TRIGGER update_statuses_updated_at
BEFORE UPDATE ON public.statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
