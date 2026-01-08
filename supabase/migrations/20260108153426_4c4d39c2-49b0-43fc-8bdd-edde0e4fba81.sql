-- Add deleted_at to custom_kpis
ALTER TABLE public.custom_kpis 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- =====================================================
-- UPDATE RLS POLICIES TO ALLOW SYSTEM ADMIN ACCESS
-- =====================================================

-- PLAN_SUBDIVISIONS
DROP POLICY IF EXISTS "Users can delete own non-system subdivisions" ON public.plan_subdivisions;
CREATE POLICY "Users can delete own non-system subdivisions"
ON public.plan_subdivisions FOR DELETE
USING (
  (user_id = auth.uid() AND is_system = false) 
  OR is_system_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update own non-system subdivisions" ON public.plan_subdivisions;
CREATE POLICY "Users can update own non-system subdivisions"
ON public.plan_subdivisions FOR UPDATE
USING (
  (user_id = auth.uid() AND is_system = false) 
  OR is_system_admin(auth.uid())
);

-- MOMENTS
DROP POLICY IF EXISTS "Users can delete own non-system moments" ON public.moments;
CREATE POLICY "Users can delete own non-system moments"
ON public.moments FOR DELETE
USING (
  (user_id = auth.uid() AND is_system = false) 
  OR is_system_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update own non-system moments" ON public.moments;
CREATE POLICY "Users can update own non-system moments"
ON public.moments FOR UPDATE
USING (
  (user_id = auth.uid() AND is_system = false) 
  OR is_system_admin(auth.uid())
);

-- FUNNEL_STAGES
DROP POLICY IF EXISTS "Users can delete own non-system funnel_stages" ON public.funnel_stages;
CREATE POLICY "Users can delete own non-system funnel_stages"
ON public.funnel_stages FOR DELETE
USING (
  (user_id = auth.uid() AND is_system = false) 
  OR is_system_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update own non-system funnel_stages" ON public.funnel_stages;
CREATE POLICY "Users can update own non-system funnel_stages"
ON public.funnel_stages FOR UPDATE
USING (
  (user_id = auth.uid() AND is_system = false) 
  OR is_system_admin(auth.uid())
);

-- MEDIUMS
DROP POLICY IF EXISTS "Users can CRUD own mediums" ON public.mediums;
CREATE POLICY "Users can manage own mediums"
ON public.mediums FOR ALL
USING (user_id = auth.uid() OR is_system_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- VEHICLES
DROP POLICY IF EXISTS "Users can CRUD own vehicles" ON public.vehicles;
CREATE POLICY "Users can manage own vehicles"
ON public.vehicles FOR ALL
USING (user_id = auth.uid() OR is_system_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- CHANNELS
DROP POLICY IF EXISTS "Users can CRUD own channels" ON public.channels;
CREATE POLICY "Users can manage own channels"
ON public.channels FOR ALL
USING (user_id = auth.uid() OR is_system_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- TARGETS
DROP POLICY IF EXISTS "Users can CRUD own targets" ON public.targets;
CREATE POLICY "Users can manage own targets"
ON public.targets FOR ALL
USING (user_id = auth.uid() OR is_system_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- BEHAVIORAL_SEGMENTATIONS
DROP POLICY IF EXISTS "Users can CRUD own behavioral_segmentations" ON public.behavioral_segmentations;
CREATE POLICY "Users can manage own behavioral_segmentations"
ON public.behavioral_segmentations FOR ALL
USING (user_id = auth.uid() OR is_system_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- STATUSES
DROP POLICY IF EXISTS "Users can delete own non-system statuses" ON public.statuses;
CREATE POLICY "Users can delete own non-system statuses"
ON public.statuses FOR DELETE
USING (
  (user_id = auth.uid() AND is_system = false) 
  OR is_system_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update own non-system statuses" ON public.statuses;
CREATE POLICY "Users can update own non-system statuses"
ON public.statuses FOR UPDATE
USING (
  (user_id = auth.uid() AND is_system = false) 
  OR is_system_admin(auth.uid())
);

-- FORMATS
DROP POLICY IF EXISTS "Users can CRUD own formats" ON public.formats;
CREATE POLICY "Users can manage own formats"
ON public.formats FOR ALL
USING (user_id = auth.uid() OR is_system_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- FORMAT_CREATIVE_TYPES
DROP POLICY IF EXISTS "Users can CRUD own format creative types" ON public.format_creative_types;
CREATE POLICY "Users can manage own format creative types"
ON public.format_creative_types FOR ALL
USING (user_id = auth.uid() OR is_system_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- CREATIVE_TYPE_SPECIFICATIONS
DROP POLICY IF EXISTS "Users can CRUD own specifications" ON public.creative_type_specifications;
CREATE POLICY "Users can manage own specifications"
ON public.creative_type_specifications FOR ALL
USING (user_id = auth.uid() OR is_system_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- SPECIFICATION_COPY_FIELDS
DROP POLICY IF EXISTS "Users can CRUD own copy fields" ON public.specification_copy_fields;
CREATE POLICY "Users can manage own copy fields"
ON public.specification_copy_fields FOR ALL
USING (user_id = auth.uid() OR is_system_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- SPECIFICATION_DIMENSIONS
DROP POLICY IF EXISTS "Users can CRUD own dimensions" ON public.specification_dimensions;
CREATE POLICY "Users can manage own dimensions"
ON public.specification_dimensions FOR ALL
USING (user_id = auth.uid() OR is_system_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- CREATIVE_TEMPLATES
DROP POLICY IF EXISTS "Users can CRUD own creative_templates" ON public.creative_templates;
CREATE POLICY "Users can manage own creative_templates"
ON public.creative_templates FOR ALL
USING (user_id = auth.uid() OR is_system_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_system_admin(auth.uid()));

-- CUSTOM_KPIS
DROP POLICY IF EXISTS "Users can delete their own custom KPIs" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can update their own custom KPIs" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can view their own custom KPIs" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can create their own custom KPIs" ON public.custom_kpis;

CREATE POLICY "Users can manage own custom KPIs"
ON public.custom_kpis FOR ALL
USING (user_id = auth.uid() OR is_system_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_system_admin(auth.uid()));