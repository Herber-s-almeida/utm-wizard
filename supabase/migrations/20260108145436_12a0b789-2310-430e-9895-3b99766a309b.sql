-- Drop existing policies and recreate with system admin support

-- plan_subdivisions
DROP POLICY IF EXISTS "Users can delete own non-system subdivisions" ON public.plan_subdivisions;
CREATE POLICY "Users can delete own non-system subdivisions" 
ON public.plan_subdivisions 
FOR DELETE 
USING (((auth.uid() = user_id) AND (is_system = false)) OR is_system_admin(auth.uid()));

-- moments
DROP POLICY IF EXISTS "Users can delete own non-system moments" ON public.moments;
CREATE POLICY "Users can delete own non-system moments" 
ON public.moments 
FOR DELETE 
USING (((auth.uid() = user_id) AND (is_system = false)) OR is_system_admin(auth.uid()));

-- funnel_stages
DROP POLICY IF EXISTS "Users can delete own non-system funnel_stages" ON public.funnel_stages;
CREATE POLICY "Users can delete own non-system funnel_stages" 
ON public.funnel_stages 
FOR DELETE 
USING (((auth.uid() = user_id) AND (is_system = false)) OR is_system_admin(auth.uid()));

-- mediums
DROP POLICY IF EXISTS "Users can CRUD own mediums" ON public.mediums;
CREATE POLICY "Users can CRUD own mediums" 
ON public.mediums 
FOR ALL 
USING ((auth.uid() = user_id) OR is_system_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_system_admin(auth.uid()));

-- vehicles
DROP POLICY IF EXISTS "Users can CRUD own vehicles" ON public.vehicles;
CREATE POLICY "Users can CRUD own vehicles" 
ON public.vehicles 
FOR ALL 
USING ((auth.uid() = user_id) OR is_system_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_system_admin(auth.uid()));

-- channels
DROP POLICY IF EXISTS "Users can CRUD own channels" ON public.channels;
CREATE POLICY "Users can CRUD own channels" 
ON public.channels 
FOR ALL 
USING ((auth.uid() = user_id) OR is_system_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_system_admin(auth.uid()));

-- targets
DROP POLICY IF EXISTS "Users can CRUD own targets" ON public.targets;
CREATE POLICY "Users can CRUD own targets" 
ON public.targets 
FOR ALL 
USING ((auth.uid() = user_id) OR is_system_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_system_admin(auth.uid()));

-- behavioral_segmentations
DROP POLICY IF EXISTS "Users can CRUD own behavioral_segmentations" ON public.behavioral_segmentations;
CREATE POLICY "Users can CRUD own behavioral_segmentations" 
ON public.behavioral_segmentations 
FOR ALL 
USING ((auth.uid() = user_id) OR is_system_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_system_admin(auth.uid()));

-- creative_templates
DROP POLICY IF EXISTS "Users can CRUD own creative_templates" ON public.creative_templates;
CREATE POLICY "Users can CRUD own creative_templates" 
ON public.creative_templates 
FOR ALL 
USING ((auth.uid() = user_id) OR is_system_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_system_admin(auth.uid()));

-- formats
DROP POLICY IF EXISTS "Users can CRUD own formats" ON public.formats;
CREATE POLICY "Users can CRUD own formats" 
ON public.formats 
FOR ALL 
USING ((auth.uid() = user_id) OR is_system_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_system_admin(auth.uid()));

-- format_creative_types
DROP POLICY IF EXISTS "Users can CRUD own format creative types" ON public.format_creative_types;
CREATE POLICY "Users can CRUD own format creative types" 
ON public.format_creative_types 
FOR ALL 
USING ((auth.uid() = user_id) OR is_system_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_system_admin(auth.uid()));

-- creative_type_specifications
DROP POLICY IF EXISTS "Users can CRUD own specifications" ON public.creative_type_specifications;
CREATE POLICY "Users can CRUD own specifications" 
ON public.creative_type_specifications 
FOR ALL 
USING ((auth.uid() = user_id) OR is_system_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_system_admin(auth.uid()));

-- specification_copy_fields
DROP POLICY IF EXISTS "Users can CRUD own copy fields" ON public.specification_copy_fields;
CREATE POLICY "Users can CRUD own copy fields" 
ON public.specification_copy_fields 
FOR ALL 
USING ((auth.uid() = user_id) OR is_system_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_system_admin(auth.uid()));

-- specification_dimensions
DROP POLICY IF EXISTS "Users can CRUD own dimensions" ON public.specification_dimensions;
CREATE POLICY "Users can CRUD own dimensions" 
ON public.specification_dimensions 
FOR ALL 
USING ((auth.uid() = user_id) OR is_system_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_system_admin(auth.uid()));

-- statuses
DROP POLICY IF EXISTS "Users can delete own non-system statuses" ON public.statuses;
CREATE POLICY "Users can delete own non-system statuses" 
ON public.statuses 
FOR DELETE 
USING (((auth.uid() = user_id) AND (is_system = false)) OR is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update own non-system statuses" ON public.statuses;
CREATE POLICY "Users can update own non-system statuses" 
ON public.statuses 
FOR UPDATE 
USING (((auth.uid() = user_id) AND (is_system = false)) OR is_system_admin(auth.uid()));