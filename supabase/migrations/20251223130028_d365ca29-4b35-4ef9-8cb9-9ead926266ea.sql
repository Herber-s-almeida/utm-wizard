-- Create table for Creative Types (shared across all users)
CREATE TABLE public.creative_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique constraint on name to avoid duplicates
CREATE UNIQUE INDEX creative_types_name_unique ON public.creative_types (lower(name));

-- Enable RLS
ALTER TABLE public.creative_types ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view creative types
CREATE POLICY "Anyone can view creative types"
ON public.creative_types
FOR SELECT
USING (true);

-- Allow authenticated users to create new creative types
CREATE POLICY "Authenticated users can create creative types"
ON public.creative_types
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create table for Format Specifications
CREATE TABLE public.format_specifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  format_id uuid NOT NULL REFERENCES public.creative_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT name_max_length CHECK (char_length(name) <= 25),
  CONSTRAINT description_max_length CHECK (char_length(description) <= 180)
);

-- Enable RLS
ALTER TABLE public.format_specifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for format_specifications
CREATE POLICY "Users can CRUD own format specifications"
ON public.format_specifications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add creative_type_id to creative_templates
ALTER TABLE public.creative_templates 
ADD COLUMN creative_type_id uuid REFERENCES public.creative_types(id);

-- Add constraint for name max length on creative_templates (if not exists)
ALTER TABLE public.creative_templates
ADD CONSTRAINT creative_templates_name_max_length CHECK (char_length(name) <= 25);

-- Create trigger for updated_at on creative_types
CREATE TRIGGER update_creative_types_updated_at
BEFORE UPDATE ON public.creative_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on format_specifications
CREATE TRIGGER update_format_specifications_updated_at
BEFORE UPDATE ON public.format_specifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();