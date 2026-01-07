-- Create table to store menu visibility settings
CREATE TABLE public.menu_visibility_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_key text UNIQUE NOT NULL,
    is_hidden boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.menu_visibility_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read the settings
CREATE POLICY "Anyone can read menu visibility settings"
ON public.menu_visibility_settings
FOR SELECT
TO authenticated
USING (true);

-- Only system admins can update
CREATE POLICY "System admins can manage menu visibility"
ON public.menu_visibility_settings
FOR ALL
TO authenticated
USING (public.is_system_admin(auth.uid()))
WITH CHECK (public.is_system_admin(auth.uid()));

-- Insert default settings for the three menu items
INSERT INTO public.menu_visibility_settings (menu_key, is_hidden) VALUES
    ('taxonomy', false),
    ('media_resources', false),
    ('reports', false);