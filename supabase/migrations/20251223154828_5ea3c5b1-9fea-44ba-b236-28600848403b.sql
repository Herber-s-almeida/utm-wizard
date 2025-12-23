
-- Drop old tables that will be replaced
DROP TABLE IF EXISTS format_specifications;

-- Create new formats table (replacing creative_templates for this purpose)
CREATE TABLE public.formats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create creative_types_v2 table (linked to format, not shared globally)
CREATE TABLE public.format_creative_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  format_id UUID NOT NULL REFERENCES public.formats(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create specifications table (linked to creative type)
CREATE TABLE public.creative_type_specifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creative_type_id UUID NOT NULL REFERENCES public.format_creative_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create copy fields table (linked to specification)
CREATE TABLE public.specification_copy_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specification_id UUID NOT NULL REFERENCES public.creative_type_specifications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_characters INTEGER,
  observation TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create extensions table (shared library)
CREATE TABLE public.file_extensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create specification extensions junction table
CREATE TABLE public.specification_extensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specification_id UUID NOT NULL REFERENCES public.creative_type_specifications(id) ON DELETE CASCADE,
  extension_id UUID NOT NULL REFERENCES public.file_extensions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(specification_id, extension_id)
);

-- Create dimensions table (linked to specification)
CREATE TABLE public.specification_dimensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specification_id UUID NOT NULL REFERENCES public.creative_type_specifications(id) ON DELETE CASCADE,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'px', -- px, cm, mm, m
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create duration info (linked to specification)
ALTER TABLE public.creative_type_specifications 
ADD COLUMN has_duration BOOLEAN DEFAULT false,
ADD COLUMN duration_value NUMERIC,
ADD COLUMN duration_unit TEXT; -- s, min

-- Create weight info (linked to specification)
ALTER TABLE public.creative_type_specifications 
ADD COLUMN max_weight NUMERIC,
ADD COLUMN weight_unit TEXT; -- KB, MB, GB

-- Enable RLS on all new tables
ALTER TABLE public.formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.format_creative_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_type_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specification_copy_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specification_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specification_dimensions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for formats
CREATE POLICY "Users can CRUD own formats"
ON public.formats
FOR ALL
TO authenticated
USING ((auth.uid() = user_id) OR (is_system = true))
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for format_creative_types
CREATE POLICY "Users can CRUD own format creative types"
ON public.format_creative_types
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for creative_type_specifications
CREATE POLICY "Users can CRUD own specifications"
ON public.creative_type_specifications
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for specification_copy_fields
CREATE POLICY "Users can CRUD own copy fields"
ON public.specification_copy_fields
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for file_extensions (public read, authenticated create)
CREATE POLICY "Anyone can view extensions"
ON public.file_extensions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create extensions"
ON public.file_extensions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for specification_extensions
CREATE POLICY "Users can CRUD own specification extensions"
ON public.specification_extensions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for specification_dimensions
CREATE POLICY "Users can CRUD own dimensions"
ON public.specification_dimensions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Insert default formats (system)
INSERT INTO public.formats (name, user_id, is_system) VALUES
('Display', '00000000-0000-0000-0000-000000000000', true),
('Vídeo', '00000000-0000-0000-0000-000000000000', true),
('Áudio', '00000000-0000-0000-0000-000000000000', true),
('Social Feed', '00000000-0000-0000-0000-000000000000', true),
('Stories', '00000000-0000-0000-0000-000000000000', true),
('Search', '00000000-0000-0000-0000-000000000000', true),
('OOH', '00000000-0000-0000-0000-000000000000', true);

-- Insert common file extensions
INSERT INTO public.file_extensions (name) VALUES
('.png'), ('.jpg'), ('.jpeg'), ('.gif'), ('.svg'), ('.pdf'),
('.mp3'), ('.wav'), ('.mp4'), ('.mov'), ('.avi'), ('.webm'),
('.html'), ('.zip'), ('.docx'), ('.psd'), ('.ai');

-- Add triggers for updated_at
CREATE TRIGGER update_formats_updated_at
BEFORE UPDATE ON public.formats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_format_creative_types_updated_at
BEFORE UPDATE ON public.format_creative_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creative_type_specifications_updated_at
BEFORE UPDATE ON public.creative_type_specifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_specification_copy_fields_updated_at
BEFORE UPDATE ON public.specification_copy_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_specification_dimensions_updated_at
BEFORE UPDATE ON public.specification_dimensions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
