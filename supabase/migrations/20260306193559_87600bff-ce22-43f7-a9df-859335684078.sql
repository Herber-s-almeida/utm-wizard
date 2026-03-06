
-- Allow all authenticated users to read system statuses (seed data with null environment_id)
CREATE POLICY "Anyone can read system statuses"
ON public.statuses FOR SELECT
TO authenticated
USING (environment_id IS NULL);

-- Allow all authenticated users to read system formats (seed data with null environment_id)
CREATE POLICY "Anyone can read system formats"
ON public.formats FOR SELECT
TO authenticated
USING (environment_id IS NULL);

-- Allow all authenticated users to read system line_detail_types (seed data)
DROP POLICY IF EXISTS "Users can view own and system detail types" ON public.line_detail_types;
CREATE POLICY "Anyone can read system detail types"
ON public.line_detail_types FOR SELECT
TO authenticated
USING (is_system = true OR environment_id IS NULL);
